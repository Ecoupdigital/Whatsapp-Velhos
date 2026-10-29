import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario, ApiKey

log = logging.getLogger(__name__)

# Segredo do JWT vem do ambiente (JWT_SECRET_KEY). Sem ele, cada boot sorteia um segredo
# novo: o app funciona, mas todo login cai quando o backend reinicia. Em producao, configure.
SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or ""
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(48)
    log.warning("JWT_SECRET_KEY nao configurada: segredo temporario sorteado, logins caem a cada reinicio")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72

# Chave de servico: "vp_<prefixo>_<segredo>". Aceita em Authorization: Bearer ou X-API-Key.
API_KEY_PREFIX = "vp_"
API_KEY_HEADER = "X-API-Key"

# auto_error=False: sem credencial nenhuma, o erro abaixo repete o do HTTPBearer (403).
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def hash_api_key(key: str) -> str:
    """sha256 da chave inteira. A chave tem 32 bytes aleatorios, entao hash rapido basta."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def gerar_api_key() -> tuple[str, str]:
    """Devolve (chave, prefixo). A chave so e mostrada uma vez; o banco guarda o hash."""
    prefixo = secrets.token_hex(4)
    return f"{API_KEY_PREFIX}{prefixo}_{secrets.token_urlsafe(32)}", prefixo


def _usuario_da_api_key(key: str, db: Session) -> Usuario:
    api_key = db.query(ApiKey).filter(ApiKey.key_hash == hash_api_key(key)).first()
    if api_key is None or api_key.revogada_em:
        raise HTTPException(status_code=401, detail="Chave de servico invalida ou revogada")
    user = db.query(Usuario).filter(Usuario.id == api_key.usuario_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario da chave nao encontrado")
    api_key.ultimo_uso_em = datetime.now().isoformat()
    db.commit()
    return user


def _usuario_do_jwt(token: str, db: Session) -> Usuario:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Token invalido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")

    user = db.query(Usuario).filter(Usuario.id == int(user_id_str)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    return user


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Usuario:
    """Login do app (JWT) ou chave de servico do agente.

    Marca a sessao do banco com a origem (app | agente): as transacoes criadas
    nesta requisicao gravam a origem sozinhas (ver services/origem.py).
    """
    header_key = request.headers.get(API_KEY_HEADER)
    bearer = credentials.credentials if credentials else None

    if header_key or (bearer and bearer.startswith(API_KEY_PREFIX)):
        user = _usuario_da_api_key(header_key or bearer, db)
        db.info["origem"] = "agente"
        return user

    if not bearer:
        raise HTTPException(status_code=403, detail="Not authenticated")

    user = _usuario_do_jwt(bearer, db)
    db.info["origem"] = "app"
    return user


def exigir_login_admin(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Usuario:
    """Admin logado no app. Chave de servico nao cria nem revoga chave."""
    if db.info.get("origem") == "agente":
        raise HTTPException(status_code=403, detail="Chave de servico nao pode gerenciar chaves")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin")
    return user
