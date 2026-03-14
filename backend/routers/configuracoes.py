from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Configuracao
from auth import get_current_user
from services.template_service import get_default_templates

router = APIRouter(
    prefix="/api/configuracoes",
    tags=["configuracoes"],
    dependencies=[Depends(get_current_user)],
)


def _get_all_configs(db: Session) -> dict[str, str]:
    rows = db.query(Configuracao).all()
    return {row.chave: row.valor for row in rows}


def _upsert_config(db: Session, chave: str, valor: str) -> None:
    existing = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if existing:
        existing.valor = valor
    else:
        db.add(Configuracao(chave=chave, valor=valor))


def _get_default_configs() -> dict[str, str]:
    """Retorna todas as configuracoes padrao para seeding."""
    defaults = get_default_templates()
    defaults.update({
        "pix_chave": "pix@velhosparceiros.com.br",
        "time_nome": "Velhos Parceiros F.C.",
        "dia_vencimento": "15",
        "valor_multa": "65",
        "envio_dia6_ativo": "true",
        "envio_dia6_hora": "10:00",
        "envio_dia14_ativo": "true",
        "envio_dia14_hora": "10:00",
        "envio_dia20_ativo": "true",
        "envio_dia20_hora": "10:00",
    })
    return defaults


def seed_defaults(db: Session) -> int:
    """Insere configs padrao no banco se ainda nao existirem. Retorna quantidade inserida."""
    defaults = _get_default_configs()
    inserted = 0
    for chave, valor in defaults.items():
        existing = db.query(Configuracao).filter(Configuracao.chave == chave).first()
        if not existing:
            db.add(Configuracao(chave=chave, valor=valor))
            inserted += 1
    db.commit()
    return inserted


@router.get("")
def listar_configuracoes(db: Session = Depends(get_db)):
    return _get_all_configs(db)


@router.put("")
def atualizar_configuracoes(configs: dict[str, str], db: Session = Depends(get_db)):
    for chave, valor in configs.items():
        _upsert_config(db, chave, valor)
    db.commit()
    return _get_all_configs(db)


@router.get("/{chave}")
def obter_configuracao(chave: str, db: Session = Depends(get_db)):
    row = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Configuracao '{chave}' nao encontrada")
    return {"chave": row.chave, "valor": row.valor}


@router.post("/seed-defaults")
def seed_defaults_endpoint(db: Session = Depends(get_db)):
    inserted = seed_defaults(db)
    return {"ok": True, "inseridas": inserted}
