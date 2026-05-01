"""
One-shot migration: SQLite -> Postgres.

Reads from SQLITE_SOURCE (default /app/data/velhos.db).
Writes to DATABASE_URL (must be postgres://...).

Order respects FK dependencies. Resets sequences after insert so new IDs
continue past max(existing). Wipes target tables first (idempotent).

Run inside backend container after deploy:
    docker exec <backend> python3 migrate_sqlite_to_postgres.py
"""
import os
import sqlite3
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

SQLITE_SOURCE = os.environ.get("SQLITE_SOURCE", "/app/data/velhos.db")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL.startswith("postgres"):
    print(f"ERROR: DATABASE_URL must be postgres://, got: {DATABASE_URL[:30]}")
    sys.exit(1)

if not os.path.exists(SQLITE_SOURCE):
    print(f"ERROR: SQLite source not found: {SQLITE_SOURCE}")
    sys.exit(1)

# FK-respecting order
TABLES = [
    "usuarios",
    "jogadores",
    "contas",
    "eventos",
    "jogadores_extra_skip",  # placeholder
    "mensalidades",
    "transacoes",
    "evento_participantes",
    "jogos",
    "cartoes_baile",
    "promocoes",
    "mensagens_log",
    "configuracoes",
]
TABLES = [t for t in TABLES if not t.endswith("_skip")]

# Tables with auto-increment id sequence (Postgres serial)
SEQ_TABLES = [
    "usuarios", "jogadores", "contas", "eventos", "mensalidades",
    "transacoes", "evento_participantes", "jogos", "cartoes_baile",
    "promocoes", "mensagens_log",
]

# configuracoes uses chave (text) as primary key, no sequence


def main():
    print(f"Source SQLite: {SQLITE_SOURCE}")
    print(f"Target Postgres: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'hidden'}")

    sqlite_conn = sqlite3.connect(SQLITE_SOURCE)
    sqlite_conn.row_factory = sqlite3.Row

    pg_engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=pg_engine)
    pg = Session()

    print("\n--- Wiping target tables (TRUNCATE CASCADE) ---")
    for t in reversed(TABLES):
        try:
            pg.execute(text(f"TRUNCATE TABLE {t} RESTART IDENTITY CASCADE"))
            print(f"  truncated {t}")
        except Exception as e:
            pg.rollback()
            print(f"  skip {t}: {e}")
    pg.commit()

    print("\n--- Copying data ---")
    total = 0
    for t in TABLES:
        cur = sqlite_conn.execute(f"SELECT * FROM {t}")
        rows = [dict(r) for r in cur.fetchall()]
        if not rows:
            print(f"  {t}: 0 rows (skip)")
            continue

        cols = list(rows[0].keys())
        placeholders = ", ".join(f":{c}" for c in cols)
        col_list = ", ".join(cols)
        sql = f"INSERT INTO {t} ({col_list}) VALUES ({placeholders})"

        for row in rows:
            try:
                pg.execute(text(sql), row)
            except Exception as e:
                print(f"  ERROR inserting into {t}: {e}")
                print(f"    row: {row}")
                pg.rollback()
                raise
        pg.commit()
        print(f"  {t}: {len(rows)} rows OK")
        total += len(rows)

    print(f"\nTotal rows migrated: {total}")

    print("\n--- Resetting sequences ---")
    for t in SEQ_TABLES:
        try:
            result = pg.execute(text(f"SELECT setval(pg_get_serial_sequence('{t}','id'), COALESCE((SELECT MAX(id) FROM {t}), 1))")).scalar()
            print(f"  {t}.id seq -> {result}")
        except Exception as e:
            pg.rollback()
            print(f"  ERROR {t}: {e}")
    pg.commit()

    print("\n--- Verify counts ---")
    for t in TABLES:
        sq = sqlite_conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        pq = pg.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        match = "OK" if sq == pq else "MISMATCH"
        print(f"  {t}: sqlite={sq} pg={pq} [{match}]")

    sqlite_conn.close()
    pg.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
