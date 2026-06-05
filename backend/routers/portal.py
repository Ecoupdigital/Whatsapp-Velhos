from datetime import datetime, timezone, date
from calendar import monthrange
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Conta, Transacao, Mensalidade, Evento, EventoParticipante, EventoParticipanteItem, Jogo, Configuracao
from routers.contas import _calcular_saldo_atual
from routers.jogos import _parse_entries
from schemas import (
    PortalResponse, PortalMeta, PortalCaixa, PortalCaixaAtrasos, PortalFluxoMes,
    PortalEvento, PortalEventoGaleto, PortalJogos, PortalJogoResumo, PortalRankingEntry,
    PortalResultado, PortalProximoJogo,
)

router = APIRouter(prefix="/api/portal", tags=["portal"])


def _montar_meta(db: Session) -> PortalMeta:
    cfg = db.query(Configuracao).filter(Configuracao.chave == "time_nome").first()
    time_nome = (cfg.valor if cfg and cfg.valor else "Velhos Parceiros F.C.")
    return PortalMeta(
        time_nome=time_nome,
        atualizado_em=datetime.now(timezone.utc).isoformat(),
    )


def _mes_vencido(db: Session, mes: str, hoje: date) -> bool:
    """True se hoje ja passou do dia de vencimento do mes.

    Espelha a regra de routers.mensalidades._atualizar_atrasados, mas SEM escrever
    no banco (este endpoint e um GET publico read-only).
    """
    cfg = db.query(Configuracao).filter(Configuracao.chave == "dia_vencimento").first()
    dia_venc = int(cfg.valor) if cfg and cfg.valor else 15
    try:
        ano, mes_num = mes.split("-")
        ultimo_dia = monthrange(int(ano), int(mes_num))[1]
        dia_real = min(dia_venc, ultimo_dia)
        data_venc = date(int(ano), int(mes_num), dia_real)
    except (ValueError, IndexError):
        return False
    return hoje > data_venc


def _montar_caixa(db: Session) -> PortalCaixa:
    now = datetime.now()
    mes_atual = now.strftime("%Y-%m")

    # saldo_atual = soma de _calcular_saldo_atual das contas ativas
    contas = db.query(Conta).filter(Conta.ativo == 1).all()
    saldo_atual = sum(_calcular_saldo_atual(db, c) for c in contas)

    # total_entrou/total_saiu = dinheiro que de fato entrou/saiu do clube.
    # Exclui transferencia interna entre contas (gera par saida+entrada que se
    # anula e inflaria os dois totais sem movimentar caixa real).
    nao_transferencia = Transacao.categoria != "transferencia"

    total_entrou = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "entrada", nao_transferencia
    ).scalar()
    total_saiu = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "saida", nao_transferencia
    ).scalar()

    entrou_mes = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "entrada", nao_transferencia, Transacao.data.like(f"{mes_atual}%")
    ).scalar()
    saiu_mes = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "saida", nao_transferencia, Transacao.data.like(f"{mes_atual}%")
    ).scalar()

    # fluxo dos ultimos 12 meses (ordem cronologica asc). Tambem exclui
    # transferencia interna, pra os dois lados do grafico refletirem caixa real.
    transacoes = db.query(Transacao).filter(nao_transferencia).order_by(Transacao.data).all()
    fluxo: dict[str, dict[str, float]] = {}
    for t in transacoes:
        mes = t.data[:7] if t.data else None
        if not mes:
            continue
        bucket = fluxo.setdefault(mes, {"entradas": 0.0, "saidas": 0.0})
        if t.tipo == "entrada":
            bucket["entradas"] += t.valor
        else:
            bucket["saidas"] += t.valor
    ult_12 = sorted(fluxo.keys())[-12:]  # cronologico asc, max 12
    fluxo_12m = [
        PortalFluxoMes(mes=m, entradas=fluxo[m]["entradas"], saidas=fluxo[m]["saidas"])
        for m in ult_12
    ]

    # atrasos (privacidade: COUNT puro, sem nomes).
    # O status 'atrasado' so e materializado de forma lazy quando o admin lista as
    # mensalidades do mes (mensalidades._atualizar_atrasados). Se o mes ja venceu,
    # uma mensalidade ainda gravada como 'pendente' tambem esta em atraso, entao
    # contamos os dois estados pra nao subnotificar inadimplencia no portal publico.
    status_atraso = ["pendente", "atrasado"] if _mes_vencido(db, mes_atual, now.date()) else ["atrasado"]
    n_mensalidades = db.query(func.count(Mensalidade.id)).filter(
        Mensalidade.mes_referencia == mes_atual,
        Mensalidade.status.in_(status_atraso),
    ).scalar()
    n_jogadores = db.query(func.count(func.distinct(Mensalidade.jogador_id))).filter(
        Mensalidade.mes_referencia == mes_atual,
        Mensalidade.status.in_(status_atraso),
    ).scalar()

    return PortalCaixa(
        saldo_atual=float(saldo_atual),
        total_entrou=float(total_entrou),
        total_saiu=float(total_saiu),
        entrou_mes=float(entrou_mes),
        saiu_mes=float(saiu_mes),
        fluxo_12m=fluxo_12m,
        atrasos=PortalCaixaAtrasos(
            mensalidades=int(n_mensalidades or 0),
            jogadores=int(n_jogadores or 0),
        ),
    )


def _tipos_do_evento_local(evento: Evento) -> list[str]:
    """Desserializa tipos_item do evento (Text JSON). Retorna lista vazia se ausente/invalido.

    Espelha a mesma logica de routers.eventos._tipos_do_evento; copiado localmente
    para evitar import cruzado router->router.
    """
    import json as _json
    raw = getattr(evento, "tipos_item", None)
    if not raw:
        return []
    try:
        val = _json.loads(raw) if isinstance(raw, str) else raw
        return val if isinstance(val, list) else []
    except (ValueError, TypeError):
        return []


def _montar_galeto(db: Session, evento: Evento) -> "PortalEventoGaleto | None":
    """Agrega estatisticas de galeto/cartao do evento para o portal publico.

    Reusa a mesma semantica de eventos.py::resumo_evento (binario complementar:
    tipo[0] cru e armazenado; tipo[1] assado = vendidos - cru).
    Retorna None se o evento nao tem cartoes emitidos (galeto=None -> UI nao muda).
    Sem nomes, so agregados (privacidade).
    """
    parts = db.query(EventoParticipante).filter(
        EventoParticipante.evento_id == evento.id
    ).all()

    emitidos = sum(p.qtd_cartoes_recebidos or 0 for p in parts)
    if emitidos <= 0:
        return None

    vendidos = sum(p.qtd_vendidos or 0 for p in parts)
    devolvidos = sum(p.qtd_devolvidos or 0 for p in parts)

    tipos = _tipos_do_evento_local(evento)
    por_tipo: list[PortalRankingEntry] = []
    if tipos and vendidos > 0:
        # Buscar qtd_vendido por tipo via query group-by (mesma logica de resumo_evento)
        vendido_por_tipo = dict(
            db.query(
                EventoParticipanteItem.tipo,
                func.coalesce(func.sum(EventoParticipanteItem.qtd_vendido), 0),
            )
            .join(EventoParticipante, EventoParticipante.id == EventoParticipanteItem.evento_participante_id)
            .filter(EventoParticipante.evento_id == evento.id)
            .group_by(EventoParticipanteItem.tipo)
            .all()
        )
        primary = tipos[0]
        cru_total = int(vendido_por_tipo.get(primary, 0) or 0)
        por_tipo.append(PortalRankingEntry(nome=primary, quantidade=cru_total))
        if len(tipos) >= 2:
            complemento = tipos[1]
            por_tipo.append(PortalRankingEntry(
                nome=complemento,
                quantidade=max(0, vendidos - cru_total),
            ))

    return PortalEventoGaleto(
        emitidos=emitidos,
        vendidos=vendidos,
        devolvidos=devolvidos,
        por_tipo=por_tipo,
    )


def _montar_eventos(db: Session) -> list[PortalEvento]:
    candidatos = db.query(Evento).filter(
        Evento.status.in_(["concluido", "em_andamento", "planejado"])
    ).all()

    out: list[PortalEvento] = []
    for e in candidatos:
        arrecadado = db.query(func.coalesce(func.sum(EventoParticipante.valor_pago), 0)).filter(
            EventoParticipante.evento_id == e.id
        ).scalar()
        arrecadado = float(arrecadado or 0)

        # planejado so entra se arrecadou; cancelado ja foi excluido na query
        if e.status == "planejado" and arrecadado <= 0:
            continue

        # regra de custo/custo_origem
        if e.custo_real and e.custo_real > 0:
            custo, custo_origem = float(e.custo_real), "real"
        elif e.custo_estimado and e.custo_estimado > 0:
            custo, custo_origem = float(e.custo_estimado), "estimado"
        else:
            custo, custo_origem = 0.0, "sem_custo"

        out.append(PortalEvento(
            titulo=e.titulo,
            tipo=e.tipo,
            data=e.data_inicio,
            arrecadado=arrecadado,
            custo=custo,
            custo_origem=custo_origem,
            liquido=arrecadado - custo,
            status=e.status,
            galeto=_montar_galeto(db, e),
        ))

    # ordenar por data desc; None vai pro fim
    com_data = sorted([ev for ev in out if ev.data], key=lambda ev: ev.data, reverse=True)
    sem_data = [ev for ev in out if not ev.data]
    return com_data + sem_data


def _montar_jogos(db: Session) -> PortalJogos:
    realizados = db.query(Jogo).filter(Jogo.realizado == 1).all()

    # gols_favor/gols_contra sao nullable (so default=0); coalesce pra None nao
    # derrubar o endpoint publico inteiro com TypeError num registro sem placar.
    vitorias = sum(1 for j in realizados if (j.gols_favor or 0) > (j.gols_contra or 0))
    empates = sum(1 for j in realizados if (j.gols_favor or 0) == (j.gols_contra or 0))
    derrotas = sum(1 for j in realizados if (j.gols_favor or 0) < (j.gols_contra or 0))
    gols_pro = sum((j.gols_favor or 0) for j in realizados)
    gols_contra = sum((j.gols_contra or 0) for j in realizados)

    artilharia: dict[str, int] = defaultdict(int)
    assist: dict[str, int] = defaultdict(int)
    destaques: dict[str, int] = defaultdict(int)
    for j in realizados:
        for nome, qtd in _parse_entries(j.gols_descricao or "").items():
            artilharia[nome] += qtd
        for nome, qtd in _parse_entries(j.assistencias or "").items():
            assist[nome] += qtd
        if j.destaque and j.destaque.strip():
            destaques[j.destaque.strip()] += 1

    def _rank(d: dict[str, int]) -> list[PortalRankingEntry]:
        return sorted(
            [PortalRankingEntry(nome=k, quantidade=v) for k, v in d.items()],
            key=lambda r: r.quantidade, reverse=True,
        )

    # ultimos resultados: realizados, data desc, limite 10
    ult = sorted(realizados, key=lambda j: j.data or "", reverse=True)[:10]
    ultimos_resultados = [
        PortalResultado(
            data=j.data,
            adversario=j.adversario,
            placar=f"{j.gols_favor or 0}x{j.gols_contra or 0}",
        ) for j in ult
    ]

    # proximos jogos: realizado=0 e data >= hoje, data asc
    hoje = datetime.now().strftime("%Y-%m-%d")
    futuros = db.query(Jogo).filter(
        Jogo.realizado == 0, Jogo.data >= hoje
    ).order_by(Jogo.data.asc()).all()
    proximos_jogos = [
        PortalProximoJogo(
            data=j.data,
            horario=j.horario,
            local=j.local,
            adversario=j.adversario,
        ) for j in futuros
    ]

    return PortalJogos(
        resumo=PortalJogoResumo(
            vitorias=vitorias, empates=empates, derrotas=derrotas,
            gols_pro=gols_pro, gols_contra=gols_contra,
        ),
        artilharia=_rank(artilharia),
        assistencias=_rank(assist),
        destaques=_rank(destaques),
        ultimos_resultados=ultimos_resultados,
        proximos_jogos=proximos_jogos,
    )


@router.get("", response_model=PortalResponse)
def portal(db: Session = Depends(get_db)):
    return PortalResponse(
        meta=_montar_meta(db),
        caixa=_montar_caixa(db),
        eventos=_montar_eventos(db),
        jogos=_montar_jogos(db),
    )
