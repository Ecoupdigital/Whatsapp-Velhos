"""Gerencia chaves de servico pelo terminal (dentro do container do backend).

Uso:
  python scripts/api_keys.py criar "Agente Velhos Parceiros" [--usuario admin]
  python scripts/api_keys.py listar
  python scripts/api_keys.py revogar <id>

Usa o mesmo banco do app (DATABASE_URL). A chave criada aparece uma unica vez.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, SessionLocal, engine  # noqa: E402
from models import Usuario  # noqa: E402
from services import api_key_service  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Chaves de servico do Velhos Parceiros")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("criar")
    c.add_argument("nome")
    c.add_argument("--usuario", default="admin", help="username do usuario em nome de quem a chave age")
    sub.add_parser("listar")
    r = sub.add_parser("revogar")
    r.add_argument("id", type=int)
    args = p.parse_args()

    Base.metadata.create_all(bind=engine)  # garante a tabela api_keys em banco sem boot novo
    db = SessionLocal()
    try:
        if args.cmd == "criar":
            user = db.query(Usuario).filter(Usuario.username == args.usuario).first()
            if user is None:
                print(f"usuario '{args.usuario}' nao encontrado", file=sys.stderr)
                return 1
            registro, chave = api_key_service.criar(db, args.nome, user.id)
            print(f"id={registro.id} prefixo={registro.prefixo} usuario={user.username}")
            print(f"CHAVE (guarde agora, nao aparece de novo): {chave}")
        elif args.cmd == "listar":
            for k in api_key_service.listar(db):
                d = api_key_service.para_dict(k)
                print(f"{d['id']}\t{d['prefixo']}\t{'ativa' if d['ativa'] else 'revogada'}\t"
                      f"ultimo uso {d['ultimo_uso_em'] or '-'}\t{d['nome']}")
        else:
            registro = api_key_service.revogar(db, args.id)
            if registro is None:
                print("chave nao encontrada", file=sys.stderr)
                return 1
            print(f"chave {registro.id} revogada em {registro.revogada_em}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
