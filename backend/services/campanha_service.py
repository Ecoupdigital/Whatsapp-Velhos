"""Servico de campanhas: resolucao de publico, render de mensagem e execucao de envio.

Reaproveita send_text_message / send_media_message e registra tudo em MensagemLog,
alem de manter o status por destinatario em CampanhaDestinatario.
"""

import asyncio
import json
import logging
import os
import random
from calendar import monthrange
from datetime import datetime
from zoneinfo import ZoneInfo

from database import SessionLocal
from models import (
    Jogador,
    Mensalidade,
    EventoParticipante,
    Configuracao,
    Campanha,
    CampanhaDestinatario,
    MensagemLog,
)
from services.whatsapp_service import send_text_message, send_media_message

log = logging.getLogger(__name__)

BRT = ZoneInfo("America/Sao_Paulo")

# tipo_conteudo (interno) -> type (uazapi)
TIPO_UAZAPI = {
    "imagem": "image",
    "video": "video",
    "audio": "audio",
    "documento": "document",
}


# ─── Config de upload / URL publica ──────────────────────────────

def _data_dir() -> str:
    """Diretorio persistente (mesmo do banco em prod), pra guardar uploads."""
    dbp = os.environ.get("DATABASE_PATH")
    if dbp:
        return os.path.dirname(dbp) or "."
    # default: backend/ (services/.. )
    return os.path.dirname(os.path.dirname(__file__))


UPLOAD_DIR = os.path.join(_data_dir(), "uploads")
BACKEND_PUBLIC_URL = os.environ.get(
    "BACKEND_PUBLIC_URL", "https://velhos-backend.ecoup.digital"
).rstrip("/")


def tipo_from_ext(ext: str, content_type: str | None = None) -> str:
    """Mapeia extensao/mime pro tipo interno de conteudo."""
    ext = (ext or "").lower().lstrip(".")
    ct = (content_type or "").lower()
    imagens = {"jpg", "jpeg", "png", "gif", "webp", "bmp"}
    videos = {"mp4", "mov", "avi", "mkv", "webm", "3gp"}
    audios = {"mp3", "ogg", "oga", "opus", "m4a", "wav", "aac"}
    if ext in imagens or ct.startswith("image/"):
        return "imagem"
    if ext in videos or ct.startswith("video/"):
        return "video"
    if ext in audios or ct.startswith("audio/"):
        return "audio"
    return "documento"


# ─── Helpers ─────────────────────────────────────────────────────

def _now_brt() -> datetime:
    return datetime.now(BRT).replace(tzinfo=None)


def _mes_atual() -> str:
    now = _now_brt()
    return f"{now.year}-{now.month:02d}"


def _get_config(db, chave: str, default: str = "") -> str:
    row = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    return row.valor if row else default


# ─── Resolucao de publico ────────────────────────────────────────

def resolver_publico(db, filtros: dict | None) -> list[Jogador]:
    """Retorna jogadores que batem nos filtros (AND). Nao filtra por telefone/excluido aqui."""
    f = filtros or {}
    q = db.query(Jogador)

    ativo = f.get("ativo", True)
    if ativo is not None:
        q = q.filter(Jogador.ativo == (1 if ativo else 0))
    if f.get("tipo"):
        q = q.filter(Jogador.tipo == f["tipo"])
    if f.get("posicao"):
        q = q.filter(Jogador.posicao == f["posicao"])

    jogadores = q.order_by(Jogador.nome).all()

    # Filtro por status de mensalidade (join leve em memoria)
    mstatus = f.get("mensalidade_status")
    if mstatus:
        mes = f.get("mes_referencia") or _mes_atual()
        rows = (
            db.query(Mensalidade.jogador_id)
            .filter(Mensalidade.mes_referencia == mes, Mensalidade.status == mstatus)
            .all()
        )
        ids = {r[0] for r in rows}
        jogadores = [j for j in jogadores if j.id in ids]

    # Filtro por participacao em evento
    evento_id = f.get("evento_id")
    if evento_id:
        eq = db.query(EventoParticipante.jogador_id).filter(
            EventoParticipante.evento_id == evento_id
        )
        estatus = f.get("evento_status")
        if estatus:
            eq = eq.filter(EventoParticipante.status == estatus)
        ids = {r[0] for r in eq.all() if r[0]}
        jogadores = [j for j in jogadores if j.id in ids]

    return jogadores


def avaliar_enviavel(jogador: Jogador) -> tuple[bool, str | None]:
    """Regra fixa: respeita excluido_envio e exige telefone."""
    if jogador.excluido_envio == 1:
        return False, "Excluido do envio"
    if not jogador.telefone:
        return False, "Sem telefone"
    return True, None


# ─── Render de mensagem ──────────────────────────────────────────

def render_campanha(texto: str, jogador: Jogador | None, db) -> str:
    """Substitui placeholders genericos. Placeholders nao reconhecidos ficam intactos."""
    if not texto:
        return ""
    ctx = {
        "time": _get_config(db, "time_nome", "Velhos Parceiros F.C."),
        "pix": _get_config(db, "pix_chave", "pix@velhosparceiros.com.br"),
        "nome": (jogador.apelido or jogador.nome) if jogador else "",
        "nome_completo": jogador.nome if jogador else "",
        "apelido": (jogador.apelido or jogador.nome) if jogador else "",
        "posicao": (jogador.posicao or "") if jogador else "",
        "numero_camisa": (str(jogador.numero_camisa) if jogador and jogador.numero_camisa else ""),
    }
    out = texto
    for k, v in ctx.items():
        out = out.replace("{" + k + "}", str(v))
    return out


# ─── Agendamento (avaliado pelo tick do scheduler) ───────────────

def deve_executar_agendada(camp: Campanha, now: datetime) -> bool:
    """Campanha de uma vez (modo agendar)."""
    if camp.status != "agendada" or camp.recorrencia or not camp.agendada_para:
        return False
    try:
        when = datetime.fromisoformat(camp.agendada_para)
    except (ValueError, TypeError):
        return False
    if when.tzinfo is not None:
        when = when.replace(tzinfo=None)
    return when <= now


def deve_executar_recorrente(camp: Campanha, now: datetime) -> bool:
    """Campanha recorrente (diaria/semanal/mensal)."""
    if camp.status != "agendada" or not camp.recorrencia:
        return False

    hora = camp.recorrencia_hora or "10:00"
    if now.strftime("%H:%M") != hora:
        return False

    # Ja rodou hoje? evita disparo duplicado dentro do mesmo dia
    if camp.ultima_execucao:
        try:
            last = datetime.fromisoformat(camp.ultima_execucao)
            if last.replace(tzinfo=None).date() == now.date():
                return False
        except (ValueError, TypeError):
            pass

    if camp.recorrencia == "diaria":
        return True
    if camp.recorrencia == "semanal":
        alvo = camp.recorrencia_dia if camp.recorrencia_dia is not None else 0
        return now.weekday() == alvo
    if camp.recorrencia == "mensal":
        dia = camp.recorrencia_dia or 1
        ultimo = monthrange(now.year, now.month)[1]
        return now.day == min(dia, ultimo)
    return False


# ─── Execucao ────────────────────────────────────────────────────

# Mantem referencia das tasks em background (evita coleta pelo GC antes de terminar)
_bg_tasks: set = set()


def disparar(campanha_id: int, somente_erros: bool = False):
    """Agenda a execucao da campanha no event loop atual sem bloquear a request."""
    task = asyncio.create_task(executar_campanha(campanha_id, somente_erros=somente_erros))
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return task


async def executar_campanha(campanha_id: int, somente_erros: bool = False) -> None:
    """Dispara a campanha (background). Atualiza destinatarios + MensagemLog + contadores."""
    db = SessionLocal()
    try:
        camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
        if not camp:
            return
        if camp.status == "cancelada":
            return

        # Recorrente: recalcula o publico do zero a cada execucao
        if camp.recorrencia:
            db.query(CampanhaDestinatario).filter(
                CampanhaDestinatario.campanha_id == camp.id
            ).delete()
            filtros = json.loads(camp.filtros_json) if camp.filtros_json else {}
            for j in resolver_publico(db, filtros):
                ok, _motivo = avaliar_enviavel(j)
                if not ok:
                    continue
                db.add(
                    CampanhaDestinatario(
                        campanha_id=camp.id,
                        jogador_id=j.id,
                        nome=j.apelido or j.nome,
                        telefone=j.telefone,
                        status="pendente",
                    )
                )
            db.flush()

        camp.status = "enviando"
        camp.ultima_execucao = _now_brt().isoformat()
        db.commit()

        # Quais destinatarios enviar
        base_q = db.query(CampanhaDestinatario).filter(
            CampanhaDestinatario.campanha_id == camp.id
        )
        if somente_erros:
            destinatarios = base_q.filter(CampanhaDestinatario.status == "erro").all()
        else:
            pendentes = base_q.filter(CampanhaDestinatario.status == "pendente").all()
            # se ja rodou tudo, um disparo manual reenvia todos
            destinatarios = pendentes if pendentes else base_q.all()

        for d in destinatarios:
            d.status = "pendente"
            d.erro_detalhe = None
        db.commit()

        tipo_uaz = TIPO_UAZAPI.get(camp.tipo_conteudo)
        usa_midia = camp.tipo_conteudo != "texto" and bool(camp.midia_url) and bool(tipo_uaz)

        for d in destinatarios:
            if not d.telefone:
                d.status = "erro"
                d.erro_detalhe = "Sem telefone"
                d.enviado_em = _now_brt().isoformat()
                db.commit()
                continue

            jogador = (
                db.query(Jogador).filter(Jogador.id == d.jogador_id).first()
                if d.jogador_id
                else None
            )
            texto = render_campanha(camp.texto or "", jogador, db)

            if usa_midia:
                result = await send_media_message(
                    d.telefone,
                    tipo_uaz,
                    camp.midia_url,
                    caption=texto,
                    doc_name=(camp.midia_nome if camp.tipo_conteudo == "documento" else None),
                )
            else:
                result = await send_text_message(d.telefone, texto)

            d.status = "enviado" if result["success"] else "erro"
            d.message_id = result.get("message_id", "")
            d.erro_detalhe = result.get("error", "")
            d.enviado_em = _now_brt().isoformat()

            db.add(
                MensagemLog(
                    jogador_id=d.jogador_id,
                    telefone=d.telefone,
                    tipo_mensagem="campanha",
                    conteudo=texto,
                    status=d.status,
                    message_id=d.message_id,
                    erro_detalhe=d.erro_detalhe,
                    enviado_em=d.enviado_em,
                )
            )
            db.commit()

            # Delay anti-ban entre mensagens
            await asyncio.sleep(random.uniform(3, 10))

        # Recalcula contadores finais
        todos = base_q.all()
        camp.total = len(todos)
        camp.enviados = sum(1 for x in todos if x.status == "enviado")
        camp.erros = sum(1 for x in todos if x.status == "erro")

        if camp.recorrencia:
            camp.status = "agendada"  # rearma pro proximo ciclo
        else:
            camp.status = "concluida" if (camp.enviados > 0 or camp.total == 0) else "falha"
        db.commit()
        log.info(
            f"[campanha {camp.id}] finalizada: {camp.enviados} enviados, {camp.erros} erros"
        )
    except Exception:
        log.exception(f"[campanha {campanha_id}] erro na execucao")
        try:
            camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
            if camp and camp.status == "enviando":
                camp.status = "falha"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
