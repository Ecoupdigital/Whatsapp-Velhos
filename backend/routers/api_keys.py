"""Chaves de servico (agente). So admin logado no app; chave nao gerencia chave."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import exigir_login_admin
from database import get_db
from models import Usuario
from services import api_key_service

router = APIRouter(prefix="/api/admin/api-keys", tags=["api-keys"])


class CriarApiKey(BaseModel):
    nome: str
    usuario_id: Optional[int] = None  # padrao: o admin que esta criando


@router.post("", status_code=201)
def criar(req: CriarApiKey, db: Session = Depends(get_db), admin: Usuario = Depends(exigir_login_admin)):
    try:
        registro, chave = api_key_service.criar(db, req.nome, req.usuario_id or admin.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    return {**api_key_service.para_dict(registro), "chave": chave,
            "aviso": "Guarde a chave agora: ela nao e mostrada de novo."}


@router.get("")
def listar(db: Session = Depends(get_db), admin: Usuario = Depends(exigir_login_admin)):
    return [api_key_service.para_dict(k) for k in api_key_service.listar(db)]


@router.delete("/{api_key_id}")
def revogar(api_key_id: int, db: Session = Depends(get_db), admin: Usuario = Depends(exigir_login_admin)):
    registro = api_key_service.revogar(db, api_key_id)
    if registro is None:
        raise HTTPException(status_code=404, detail="Chave nao encontrada")
    return api_key_service.para_dict(registro)
