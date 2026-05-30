import json
import os
import shutil
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models import Campanha, CampanhaDestinatario, Segmento, Jogador
from schemas import (
    CampanhaCreate,
    CampanhaUpdate,
    CampanhaOut,
    CampanhaDestinatarioOut,
    PreviewPublicoRequest,
    PublicoJogador,
    SegmentoCreate,
    SegmentoOut,
    UploadResponse,
)
from auth import get_current_user
from services.campanha_service import (
    UPLOAD_DIR,
    BACKEND_PUBLIC_URL,
    tipo_from_ext,
    resolver_publico,
    avaliar_enviavel,
    disparar,
    _now_brt,
)

router = APIRouter(
    prefix="/api/campanhas",
    tags=["campanhas"],
    dependencies=[Depends(get_current_user)],
)


# ─── Upload de midia ─────────────────────────────────────────────

# Extensoes aceitas (imagem/video/audio/documento que o WhatsApp suporta).
# .html/.svg/.js ficam DE FORA de proposito: o diretorio /uploads e servido
# publicamente, entao tipos "ativos" abririam porta pra XSS armazenado.
ALLOWED_EXTS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".mp4", ".mov", ".webm", ".3gp",
    ".mp3", ".ogg", ".oga", ".opus", ".m4a", ".wav", ".aac",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt",
}
MAX_UPLOAD_SIZE = 64 * 1024 * 1024  # 64 MB (teto seguro p/ midia WhatsApp)


@router.post("/upload", response_model=UploadResponse)
async def upload_midia(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo nao permitido ({ext or 'sem extensao'})",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    fname = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, fname)

    written = 0
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="Arquivo muito grande (max 64MB)")
                out.write(chunk)
    except HTTPException:
        if os.path.exists(dest):
            os.remove(dest)  # nao deixa lixo parcial no disco
        raise
    finally:
        file.file.close()

    tipo = tipo_from_ext(ext, file.content_type)
    url = f"{BACKEND_PUBLIC_URL}/uploads/{fname}"
    return UploadResponse(url=url, nome=file.filename or fname, tipo=tipo)


# ─── Preview de publico ──────────────────────────────────────────

@router.post("/preview-publico", response_model=list[PublicoJogador])
def preview_publico(req: PreviewPublicoRequest, db: Session = Depends(get_db)):
    filtros = req.filtros.model_dump()
    jogadores = resolver_publico(db, filtros)
    out: list[PublicoJogador] = []
    for j in jogadores:
        enviavel, motivo = avaliar_enviavel(j)
        if not enviavel and motivo == "Sem telefone" and not filtros.get("incluir_sem_telefone"):
            # esconde quem nao tem telefone, salvo se pedido
            continue
        out.append(
            PublicoJogador(
                jogador_id=j.id,
                nome=j.nome,
                apelido=j.apelido,
                telefone=j.telefone,
                tipo=j.tipo,
                posicao=j.posicao,
                enviavel=enviavel,
                motivo=motivo,
            )
        )
    return out


# ─── Segmentos (publicos salvos) ─────────────────────────────────

def _segmento_out(s: Segmento) -> SegmentoOut:
    filtros = None
    if s.filtros_json:
        try:
            filtros = json.loads(s.filtros_json)
        except (ValueError, TypeError):
            filtros = None
    return SegmentoOut(id=s.id, nome=s.nome, filtros=filtros, created_at=s.created_at)


@router.get("/segmentos", response_model=list[SegmentoOut])
def listar_segmentos(db: Session = Depends(get_db)):
    rows = db.query(Segmento).order_by(Segmento.nome).all()
    return [_segmento_out(s) for s in rows]


@router.post("/segmentos", response_model=SegmentoOut, status_code=201)
def criar_segmento(data: SegmentoCreate, db: Session = Depends(get_db)):
    s = Segmento(nome=data.nome, filtros_json=json.dumps(data.filtros.model_dump()))
    db.add(s)
    db.commit()
    db.refresh(s)
    return _segmento_out(s)


@router.delete("/segmentos/{segmento_id}")
def excluir_segmento(segmento_id: int, db: Session = Depends(get_db)):
    s = db.query(Segmento).filter(Segmento.id == segmento_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Segmento nao encontrado")
    db.delete(s)
    db.commit()
    return {"ok": True}


# ─── Campanhas CRUD ──────────────────────────────────────────────

@router.get("", response_model=list[CampanhaOut])
def listar_campanhas(db: Session = Depends(get_db)):
    return db.query(Campanha).order_by(Campanha.id.desc()).all()


@router.post("", response_model=CampanhaOut, status_code=201)
async def criar_campanha(data: CampanhaCreate, db: Session = Depends(get_db)):
    if data.modo not in ("agora", "agendar", "recorrente"):
        raise HTTPException(status_code=400, detail="Modo invalido")
    if not data.texto and data.tipo_conteudo == "texto":
        raise HTTPException(status_code=400, detail="Texto obrigatorio para campanha de texto")
    if data.tipo_conteudo != "texto" and not data.midia_url:
        raise HTTPException(status_code=400, detail="Midia obrigatoria para esse tipo de conteudo")
    if data.modo == "agendar" and not data.agendada_para:
        raise HTTPException(status_code=400, detail="Informe a data/hora do agendamento")
    if data.modo == "recorrente":
        if not data.recorrencia:
            raise HTTPException(status_code=400, detail="Informe a recorrencia")
        if not data.filtros:
            raise HTTPException(
                status_code=400,
                detail="Campanha recorrente precisa de filtros de publico (o elenco muda com o tempo)",
            )

    filtros_json = json.dumps(data.filtros.model_dump()) if data.filtros else None

    camp = Campanha(
        nome=data.nome,
        tipo_conteudo=data.tipo_conteudo,
        texto=data.texto,
        midia_url=data.midia_url,
        midia_nome=data.midia_nome,
        modo=data.modo,
        agendada_para=data.agendada_para,
        recorrencia=data.recorrencia,
        recorrencia_dia=data.recorrencia_dia,
        recorrencia_hora=data.recorrencia_hora,
        filtros_json=filtros_json,
        segmento_id=data.segmento_id,
        status="rascunho",
    )
    db.add(camp)
    db.flush()

    # Materializa o publico pra agora/agendar (recorrente resolve a cada disparo)
    if data.modo in ("agora", "agendar"):
        count = 0
        if data.jogador_ids:
            jogadores = db.query(Jogador).filter(Jogador.id.in_(data.jogador_ids)).all()
            for j in jogadores:
                enviavel, _ = avaliar_enviavel(j)
                if not enviavel:
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
                count += 1
        camp.total = count
        if count == 0:
            raise HTTPException(
                status_code=400,
                detail="Nenhum destinatario valido (com telefone e nao excluido do envio)",
            )

    if data.modo == "agendar":
        camp.status = "agendada"
    elif data.modo == "recorrente":
        camp.status = "agendada"
    elif data.modo == "agora":
        camp.status = "enviando" if data.enviar_agora else "rascunho"

    db.commit()
    db.refresh(camp)

    if data.modo == "agora" and data.enviar_agora:
        disparar(camp.id)

    return camp


@router.get("/{campanha_id}", response_model=CampanhaOut)
def detalhe_campanha(campanha_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    return camp


@router.get("/{campanha_id}/destinatarios", response_model=list[CampanhaDestinatarioOut])
def listar_destinatarios(campanha_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    return (
        db.query(CampanhaDestinatario)
        .filter(CampanhaDestinatario.campanha_id == campanha_id)
        .order_by(CampanhaDestinatario.id)
        .all()
    )


@router.put("/{campanha_id}", response_model=CampanhaOut)
def atualizar_campanha(campanha_id: int, data: CampanhaUpdate, db: Session = Depends(get_db)):
    camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    if camp.status in ("enviando",):
        raise HTTPException(status_code=409, detail="Campanha em envio, aguarde terminar")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(camp, field, value)
    camp.updated_at = _now_brt().isoformat()
    db.commit()
    db.refresh(camp)
    return camp


@router.post("/{campanha_id}/enviar")
async def enviar_campanha(campanha_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    if camp.status == "enviando":
        raise HTTPException(status_code=409, detail="Campanha ja esta em envio")
    total = (
        db.query(CampanhaDestinatario)
        .filter(CampanhaDestinatario.campanha_id == campanha_id)
        .count()
    )
    if total == 0 and not camp.recorrencia:
        raise HTTPException(status_code=400, detail="Campanha sem destinatarios")
    camp.status = "enviando"
    db.commit()
    disparar(campanha_id)
    return {"ok": True}


@router.post("/{campanha_id}/reenviar-falhas")
async def reenviar_falhas(campanha_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    if camp.status == "enviando":
        raise HTTPException(status_code=409, detail="Campanha ja esta em envio")
    erros = (
        db.query(CampanhaDestinatario)
        .filter(
            CampanhaDestinatario.campanha_id == campanha_id,
            CampanhaDestinatario.status == "erro",
        )
        .count()
    )
    if erros == 0:
        return {"reenviando": 0}
    camp.status = "enviando"
    db.commit()
    disparar(campanha_id, somente_erros=True)
    return {"reenviando": erros}


@router.post("/{campanha_id}/cancelar", response_model=CampanhaOut)
def cancelar_campanha(campanha_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    if camp.status == "enviando":
        raise HTTPException(status_code=409, detail="Campanha em envio, nao da pra cancelar agora")
    camp.status = "cancelada"
    camp.updated_at = _now_brt().isoformat()
    db.commit()
    db.refresh(camp)
    return camp


@router.delete("/{campanha_id}")
def excluir_campanha(campanha_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campanha).filter(Campanha.id == campanha_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    if camp.status == "enviando":
        raise HTTPException(status_code=409, detail="Campanha em envio, aguarde terminar")
    db.delete(camp)
    db.commit()
    return {"ok": True}
