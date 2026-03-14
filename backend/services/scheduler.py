import asyncio
import logging
import random
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import SessionLocal
from models import Mensalidade, Jogador, Configuracao, MensagemLog
from services.template_service import render_template, mes_por_extenso
from services.whatsapp_service import send_text_message

log = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def _get_config(db, chave: str, default: str = "") -> str:
    row = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    return row.valor if row else default


def _build_context(jogador: Jogador, mensalidade: Mensalidade, db) -> dict:
    """Monta o contexto de template a partir de jogador, mensalidade e configs."""
    valor_raw = mensalidade.valor
    valor_formatado = f"{valor_raw:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    return {
        "nome": jogador.apelido or jogador.nome,
        "nome_completo": jogador.nome,
        "valor": valor_formatado,
        "valor_multa": _get_config(db, "valor_multa", "65"),
        "mes": mes_por_extenso(mensalidade.mes_referencia),
        "vencimento": _get_config(db, "dia_vencimento", "15"),
        "pix": _get_config(db, "pix_chave", "pix@velhosparceiros.com.br"),
        "time": _get_config(db, "time_nome", "Velhos Parceiros F.C."),
    }


async def _enviar_para_jogadores(
    db,
    mensalidades,
    template_key: str,
    tipo_mensagem: str,
    template_fallback: str,
):
    """Envia mensagem para uma lista de mensalidades usando o template configurado."""
    template_text = _get_config(db, template_key, template_fallback)

    enviados = 0
    erros = 0

    for m in mensalidades:
        jogador = db.query(Jogador).filter(Jogador.id == m.jogador_id).first()
        if not jogador or not jogador.telefone or jogador.excluido_envio == 1 or jogador.ativo != 1:
            continue

        context = _build_context(jogador, m, db)
        texto = render_template(template_text, context)

        result = await send_text_message(jogador.telefone, texto)

        log_entry = MensagemLog(
            jogador_id=jogador.id,
            telefone=jogador.telefone,
            tipo_mensagem=tipo_mensagem,
            conteudo=texto,
            status="enviado" if result["success"] else "erro",
            message_id=result.get("message_id", ""),
            erro_detalhe=result.get("error", ""),
            enviado_em=datetime.now().isoformat(),
        )
        db.add(log_entry)

        if result["success"]:
            enviados += 1
            log.info(f"[{tipo_mensagem}] Enviado para {jogador.apelido or jogador.nome} ({jogador.telefone})")
        else:
            erros += 1
            log.error(f"[{tipo_mensagem}] Erro ao enviar para {jogador.apelido or jogador.nome}: {result.get('error')}")

        # Delay entre mensagens
        await asyncio.sleep(random.uniform(3, 10))

    db.commit()
    log.info(f"[{tipo_mensagem}] Finalizado: {enviados} enviados, {erros} erros")


def _get_current_mes_referencia() -> str:
    now = datetime.now()
    return f"{now.year}-{now.month:02d}"


async def job_lembrete_dia6():
    """Dia 6: envia lembrete para TODOS os jogadores ativos com mensalidade pendente."""
    log.info("[lembrete_dia6] Iniciando envio...")
    db = SessionLocal()
    try:
        if _get_config(db, "envio_dia6_ativo", "true") != "true":
            log.info("[lembrete_dia6] Envio desativado nas configuracoes.")
            return

        mes_ref = _get_current_mes_referencia()
        mensalidades = (
            db.query(Mensalidade)
            .filter(
                Mensalidade.mes_referencia == mes_ref,
                Mensalidade.status.in_(["pendente", "atrasado"]),
            )
            .all()
        )

        log.info(f"[lembrete_dia6] {len(mensalidades)} mensalidades pendentes para {mes_ref}")

        fallback = (
            "Fala, {nome}! Tudo bem?\n\n"
            "Passando pra lembrar da mensalidade de *{mes}* do *{time}*.\n\n"
            "Valor: *R$ {valor}*\nVencimento: *dia {vencimento}*\nPIX: *{pix}*\n\n"
            "_Mensagem automatica - {time}_"
        )
        await _enviar_para_jogadores(db, mensalidades, "template_lembrete_dia6", "lembrete_dia6", fallback)
    except Exception:
        log.exception("[lembrete_dia6] Erro inesperado")
    finally:
        db.close()


async def job_aviso_dia14():
    """Dia 14: envia aviso apenas para quem AINDA NAO pagou."""
    log.info("[aviso_dia14] Iniciando envio...")
    db = SessionLocal()
    try:
        if _get_config(db, "envio_dia14_ativo", "true") != "true":
            log.info("[aviso_dia14] Envio desativado nas configuracoes.")
            return

        mes_ref = _get_current_mes_referencia()
        mensalidades = (
            db.query(Mensalidade)
            .filter(
                Mensalidade.mes_referencia == mes_ref,
                Mensalidade.status.in_(["pendente", "atrasado"]),
            )
            .all()
        )

        log.info(f"[aviso_dia14] {len(mensalidades)} mensalidades pendentes para {mes_ref}")

        fallback = (
            "E ai, {nome}! Amanha vence a mensalidade de *{mes}*.\n\n"
            "Valor: *R$ {valor}*\nPIX: *{pix}*\n\n"
            "Apos o vencimento, valor passa para *R$ {valor_multa}*.\n\n"
            "_Mensagem automatica - {time}_"
        )
        await _enviar_para_jogadores(db, mensalidades, "template_aviso_dia14", "aviso_dia14", fallback)
    except Exception:
        log.exception("[aviso_dia14] Erro inesperado")
    finally:
        db.close()


async def job_cobranca_dia20():
    """Dia 20: envia cobranca apenas para quem NAO pagou, com valor de multa."""
    log.info("[cobranca_dia20] Iniciando envio...")
    db = SessionLocal()
    try:
        if _get_config(db, "envio_dia20_ativo", "true") != "true":
            log.info("[cobranca_dia20] Envio desativado nas configuracoes.")
            return

        mes_ref = _get_current_mes_referencia()
        mensalidades = (
            db.query(Mensalidade)
            .filter(
                Mensalidade.mes_referencia == mes_ref,
                Mensalidade.status.in_(["pendente", "atrasado"]),
            )
            .all()
        )

        log.info(f"[cobranca_dia20] {len(mensalidades)} mensalidades pendentes para {mes_ref}")

        fallback = (
            "Fala, {nome}!\n\n"
            "A mensalidade de *{mes}* venceu e consta como pendente.\n\n"
            "Valor atualizado: *R$ {valor_multa}*\nPIX: *{pix}*\n\n"
            "_Mensagem automatica - {time}_"
        )
        await _enviar_para_jogadores(db, mensalidades, "template_cobranca_dia20", "cobranca_dia20", fallback)
    except Exception:
        log.exception("[cobranca_dia20] Erro inesperado")
    finally:
        db.close()


def _parse_hora(hora_str: str) -> tuple[int, int]:
    """Converte string 'HH:MM' em tupla (hora, minuto)."""
    try:
        parts = hora_str.split(":")
        return int(parts[0]), int(parts[1])
    except (IndexError, ValueError):
        return 10, 0


def start_scheduler(app=None):
    """Cria e inicia o scheduler com os 3 cron jobs."""
    global _scheduler

    if _scheduler is not None:
        log.warning("Scheduler ja esta rodando.")
        return

    _scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")

    # Leitura das horas configuradas no banco
    db = SessionLocal()
    try:
        hora6_str = _get_config(db, "envio_dia6_hora", "10:00")
        hora14_str = _get_config(db, "envio_dia14_hora", "10:00")
        hora20_str = _get_config(db, "envio_dia20_hora", "10:00")
    finally:
        db.close()

    h6, m6 = _parse_hora(hora6_str)
    h14, m14 = _parse_hora(hora14_str)
    h20, m20 = _parse_hora(hora20_str)

    _scheduler.add_job(
        job_lembrete_dia6,
        CronTrigger(day=6, hour=h6, minute=m6, timezone="America/Sao_Paulo"),
        id="lembrete_dia6",
        name="Lembrete dia 6",
        replace_existing=True,
    )

    _scheduler.add_job(
        job_aviso_dia14,
        CronTrigger(day=14, hour=h14, minute=m14, timezone="America/Sao_Paulo"),
        id="aviso_dia14",
        name="Aviso dia 14",
        replace_existing=True,
    )

    _scheduler.add_job(
        job_cobranca_dia20,
        CronTrigger(day=20, hour=h20, minute=m20, timezone="America/Sao_Paulo"),
        id="cobranca_dia20",
        name="Cobranca dia 20",
        replace_existing=True,
    )

    _scheduler.start()
    log.info("Scheduler iniciado com 3 jobs configurados.")


def stop_scheduler():
    """Para o scheduler se estiver rodando."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        log.info("Scheduler parado.")
