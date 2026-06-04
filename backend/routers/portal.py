from datetime import datetime, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Conta, Transacao, Mensalidade, Evento, EventoParticipante, Jogo, Configuracao
from routers.contas import _calcular_saldo_atual
from routers.jogos import _parse_entries
from schemas import (
    PortalResponse, PortalMeta, PortalCaixa, PortalCaixaAtrasos, PortalFluxoMes,
    PortalEvento, PortalJogos, PortalJogoResumo, PortalRankingEntry,
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


def _montar_caixa(db: Session) -> PortalCaixa:
    now = datetime.now()
    mes_atual = now.strftime("%Y-%m")

    # saldo_atual = soma de _calcular_saldo_atual das contas ativas
    contas = db.query(Conta).filter(Conta.ativo == 1).all()
    saldo_atual = sum(_calcular_saldo_atual(db, c) for c in contas)

    total_entrou = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "entrada"
    ).scalar()
    total_saiu = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "saida"
    ).scalar()

    entrou_mes = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "entrada", Transacao.data.like(f"{mes_atual}%")
    ).scalar()
    saiu_mes = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "saida", Transacao.data.like(f"{mes_atual}%")
    ).scalar()

    # fluxo dos ultimos 12 meses (ordem cronologica asc), replicando financeiro.fluxo_mensal
    transacoes = db.query(Transacao).order_by(Transacao.data).all()
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

    # atrasos (privacidade: COUNT puro, sem nomes)
    n_mensalidades = db.query(func.count(Mensalidade.id)).filter(
        Mensalidade.status == "atrasado",
        Mensalidade.mes_referencia == mes_atual,
    ).scalar()
    n_jogadores = db.query(func.count(func.distinct(Mensalidade.jogador_id))).filter(
        Mensalidade.status == "atrasado",
        Mensalidade.mes_referencia == mes_atual,
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
        ))

    # ordenar por data desc; None vai pro fim
    com_data = sorted([ev for ev in out if ev.data], key=lambda ev: ev.data, reverse=True)
    sem_data = [ev for ev in out if not ev.data]
    return com_data + sem_data


def _montar_jogos(db: Session) -> PortalJogos:
    realizados = db.query(Jogo).filter(Jogo.realizado == 1).all()

    vitorias = sum(1 for j in realizados if j.gols_favor > j.gols_contra)
    empates = sum(1 for j in realizados if j.gols_favor == j.gols_contra)
    derrotas = sum(1 for j in realizados if j.gols_favor < j.gols_contra)
    gols_pro = sum(j.gols_favor for j in realizados)
    gols_contra = sum(j.gols_contra for j in realizados)

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
            placar=f"{j.gols_favor}x{j.gols_contra}",
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
