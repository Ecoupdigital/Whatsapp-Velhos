from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Jogador, Configuracao
from schemas import JogadorCreate, JogadorUpdate, JogadorOut
from auth import get_current_user
import asyncio
from services.whatsapp_service import get_group_participants, get_chat_details
from datetime import datetime

router = APIRouter(prefix="/api/jogadores", tags=["jogadores"], dependencies=[Depends(get_current_user)])


def _normalize_phone(phone: str) -> str:
    """Remove tudo que nao for digito."""
    return "".join(c for c in (phone or "") if c.isdigit())


@router.get("", response_model=list[JogadorOut])
def listar(
    ativo: int | None = Query(None),
    tipo: str | None = Query(None),
    busca: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Jogador)
    if ativo is not None:
        q = q.filter(Jogador.ativo == ativo)
    if tipo:
        q = q.filter(Jogador.tipo == tipo)
    if busca:
        q = q.filter(
            (Jogador.nome.ilike(f"%{busca}%")) | (Jogador.apelido.ilike(f"%{busca}%"))
        )
    return q.order_by(Jogador.nome).all()


@router.post("", response_model=JogadorOut, status_code=201)
def criar(data: JogadorCreate, db: Session = Depends(get_db)):
    jogador = Jogador(**data.model_dump())
    db.add(jogador)
    db.commit()
    db.refresh(jogador)
    return jogador


@router.get("/{jogador_id}", response_model=JogadorOut)
def detalhe(jogador_id: int, db: Session = Depends(get_db)):
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador nao encontrado")
    return jogador


@router.put("/{jogador_id}", response_model=JogadorOut)
def atualizar(jogador_id: int, data: JogadorUpdate, db: Session = Depends(get_db)):
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador nao encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(jogador, field, value)
    jogador.updated_at = datetime.now().isoformat()
    db.commit()
    db.refresh(jogador)
    return jogador


@router.get("/grupo/sugestoes")
async def sugestoes_grupo(db: Session = Depends(get_db)):
    """Lista membros do grupo WhatsApp que NAO estao cadastrados como jogador."""
    cfg = db.query(Configuracao).filter(Configuracao.chave == "whatsapp_group_jid").first()
    group_jid = cfg.valor if cfg else ""
    if not group_jid:
        raise HTTPException(status_code=400, detail="whatsapp_group_jid nao configurado")

    participantes = await get_group_participants(group_jid)

    # Conjunto de telefones cadastrados (so digitos)
    cadastrados = {
        _normalize_phone(j.telefone)
        for j in db.query(Jogador).filter(Jogador.telefone.isnot(None)).all()
        if j.telefone
    }
    cadastrados.discard("")

    pendentes = []
    for p in participantes:
        phone_norm = _normalize_phone(p["phone"])
        if phone_norm and phone_norm not in cadastrados:
            pendentes.append(p["phone"])

    # Enriquece com nome + foto via /chat/details (paralelo, com timeout protegido)
    detalhes = await asyncio.gather(
        *[get_chat_details(ph) for ph in pendentes],
        return_exceptions=True,
    )

    sem_cadastro = []
    for ph, det in zip(pendentes, detalhes):
        if isinstance(det, Exception) or not det:
            det = {}
        sem_cadastro.append({
            "telefone": ph,
            "nome": det.get("name", "") if isinstance(det, dict) else "",
            "foto": det.get("image", "") if isinstance(det, dict) else "",
            "telefone_formatado": det.get("phone_formatted", "") if isinstance(det, dict) else "",
        })

    return {
        "total_no_grupo": len(participantes),
        "total_cadastrados": len(cadastrados),
        "sem_cadastro": sem_cadastro,
    }


@router.delete("/{jogador_id}")
def excluir(jogador_id: int, force: bool = Query(False), db: Session = Depends(get_db)):
    from models import Mensalidade, CartaoBaile, EventoParticipante, MensagemLog
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador nao encontrado")
    if force:
        db.query(Mensalidade).filter(Mensalidade.jogador_id == jogador_id).delete()
        db.query(CartaoBaile).filter(CartaoBaile.jogador_id == jogador_id).delete()
        db.query(EventoParticipante).filter(EventoParticipante.jogador_id == jogador_id).delete()
        db.query(MensagemLog).filter(MensagemLog.jogador_id == jogador_id).delete()
        db.delete(jogador)
    else:
        jogador.ativo = 0
        jogador.updated_at = datetime.now().isoformat()
    db.commit()
    return {"ok": True}
