"""Criar, listar e revogar chaves de servico. Usado pela rota de admin e pelo script."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from auth import gerar_api_key, hash_api_key
from models import ApiKey, Usuario


def criar(db: Session, nome: str, usuario_id: int) -> tuple[ApiKey, str]:
    """Devolve (registro, chave em texto). A chave nao fica guardada: mostre uma vez."""
    if db.query(Usuario).filter(Usuario.id == usuario_id).first() is None:
        raise LookupError("usuario nao encontrado")
    chave, prefixo = gerar_api_key()
    registro = ApiKey(nome=nome, prefixo=prefixo, key_hash=hash_api_key(chave), usuario_id=usuario_id)
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro, chave


def listar(db: Session) -> list[ApiKey]:
    return db.query(ApiKey).order_by(ApiKey.id).all()


def revogar(db: Session, api_key_id: int) -> Optional[ApiKey]:
    registro = db.query(ApiKey).filter(ApiKey.id == api_key_id).first()
    if registro is None:
        return None
    if not registro.revogada_em:
        registro.revogada_em = datetime.now().isoformat()
        db.commit()
    return registro


def para_dict(k: ApiKey) -> dict:
    return {
        "id": k.id, "nome": k.nome, "prefixo": k.prefixo, "usuario_id": k.usuario_id,
        "created_at": k.created_at, "ultimo_uso_em": k.ultimo_uso_em, "revogada_em": k.revogada_em,
        "ativa": not k.revogada_em,
    }
