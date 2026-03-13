from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import MensagemLog, Jogador
from schemas import EnviarMensagemRequest, MensagemLogOut, WhatsAppStatus
from auth import get_current_user
from services.whatsapp_service import get_instance_status, send_text_message
from datetime import datetime

router = APIRouter(prefix="/api", tags=["whatsapp"], dependencies=[Depends(get_current_user)])


@router.get("/whatsapp/status", response_model=WhatsAppStatus)
async def status():
    result = await get_instance_status()
    return WhatsAppStatus(**result)


@router.get("/mensagens/log", response_model=list[MensagemLogOut])
def listar_logs(
    tipo: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
):
    q = db.query(MensagemLog)
    if tipo:
        q = q.filter(MensagemLog.tipo_mensagem == tipo)
    if status:
        q = q.filter(MensagemLog.status == status)
    return q.order_by(MensagemLog.id.desc()).limit(limit).all()


@router.post("/mensagens/enviar")
async def enviar_manual(req: EnviarMensagemRequest, db: Session = Depends(get_db)):
    jogadores = db.query(Jogador).filter(Jogador.id.in_(req.jogador_ids)).all()
    resultados = []

    for j in jogadores:
        if not j.telefone:
            continue

        result = await send_text_message(j.telefone, req.texto)

        log_entry = MensagemLog(
            jogador_id=j.id,
            telefone=j.telefone,
            tipo_mensagem="manual",
            conteudo=req.texto,
            status="enviado" if result["success"] else "erro",
            message_id=result.get("message_id", ""),
            erro_detalhe=result.get("error", ""),
            enviado_em=datetime.now().isoformat(),
        )
        db.add(log_entry)
        resultados.append({
            "jogador_id": j.id,
            "nome": j.apelido or j.nome,
            "success": result["success"],
            "error": result.get("error", ""),
        })

    db.commit()
    return {"enviados": sum(1 for r in resultados if r["success"]), "erros": sum(1 for r in resultados if not r["success"]), "detalhes": resultados}
