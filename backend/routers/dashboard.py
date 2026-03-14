from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import Jogador, Mensalidade, Transacao, Evento, Jogo
from schemas import DashboardData, MensalidadeOut, JogoOut, EventoOut, FluxoMensal
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=DashboardData)
def dashboard(db: Session = Depends(get_db)):
    now = datetime.now()
    mes_atual = now.strftime("%Y-%m")

    # Saldo
    entradas = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(Transacao.tipo == "entrada").scalar()
    saidas = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(Transacao.tipo == "saida").scalar()
    saldo = entradas - saidas

    # Mensalidades do mes
    mensalidades_mes = db.query(Mensalidade).filter(Mensalidade.mes_referencia == mes_atual).all()
    pendentes = sum(1 for m in mensalidades_mes if m.status in ("pendente", "atrasado"))

    # Jogadores (so tipo "jogador", exclui socios da contagem)
    ativos = db.query(func.count(Jogador.id)).filter(Jogador.ativo == 1, Jogador.tipo == "jogador").scalar()
    inativos = db.query(func.count(Jogador.id)).filter(Jogador.ativo == 0).scalar()

    # Proximo evento
    proximo_evento = (
        db.query(Evento)
        .filter(Evento.status.in_(["planejado", "em_andamento"]), Evento.data_inicio >= now.strftime("%Y-%m-%d"))
        .order_by(Evento.data_inicio)
        .first()
    )

    # Ultimos pagamentos
    ultimos_pagamentos = (
        db.query(Mensalidade)
        .options(joinedload(Mensalidade.jogador))
        .filter(Mensalidade.status == "pago")
        .order_by(Mensalidade.data_pagamento.desc())
        .limit(5)
        .all()
    )

    # Proximos jogos
    proximos_jogos = (
        db.query(Jogo)
        .filter(Jogo.data >= now.strftime("%Y-%m-%d"))
        .order_by(Jogo.data)
        .limit(5)
        .all()
    )

    # Alertas
    alertas = []
    atrasados = sum(1 for m in mensalidades_mes if m.status == "atrasado")
    if atrasados > 0:
        alertas.append(f"{atrasados} mensalidade(s) atrasada(s) em {mes_atual}")
    if now.day < 6:
        alertas.append(f"Envio de lembretes dia 06 em {6 - now.day} dia(s)")
    elif now.day < 14:
        alertas.append(f"Aviso de vencimento dia 14 em {14 - now.day} dia(s)")
    elif now.day < 20:
        alertas.append(f"Cobranca dia 20 em {20 - now.day} dia(s)")

    # Fluxo mensal (ultimos 6 meses)
    transacoes = db.query(Transacao).all()
    fluxo_dict = {}
    for t in transacoes:
        mes = t.data[:7] if t.data else "unknown"
        if mes not in fluxo_dict:
            fluxo_dict[mes] = {"entradas": 0, "saidas": 0}
        if t.tipo == "entrada":
            fluxo_dict[mes]["entradas"] += t.valor
        else:
            fluxo_dict[mes]["saidas"] += t.valor

    sorted_meses = sorted(fluxo_dict.keys(), reverse=True)[:6]
    fluxo = [
        FluxoMensal(mes=m, entradas=fluxo_dict[m]["entradas"], saidas=fluxo_dict[m]["saidas"])
        for m in sorted(sorted_meses)
    ]

    return DashboardData(
        saldo_total=saldo,
        mensalidades_pendentes=pendentes,
        mensalidades_total=len(mensalidades_mes),
        jogadores_ativos=ativos,
        jogadores_inativos=inativos,
        proximo_evento=EventoOut.model_validate(proximo_evento) if proximo_evento else None,
        ultimos_pagamentos=[MensalidadeOut.model_validate(m) for m in ultimos_pagamentos],
        proximos_jogos=[JogoOut.model_validate(j) for j in proximos_jogos],
        alertas=alertas,
        fluxo_mensal=fluxo,
    )
