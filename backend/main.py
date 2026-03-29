import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import Usuario, Conta
from auth import hash_password

from routers import auth, jogadores, mensalidades, financeiro, eventos, jogos, cartoes, promocoes, whatsapp, dashboard, configuracoes, contas
from routers.configuracoes import seed_defaults as seed_default_configs
from services.scheduler import start_scheduler, stop_scheduler

log = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Migrate: add missing columns to existing tables
def _migrate():
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    with engine.connect() as conn:
        # jogos table - add new columns if missing
        if "jogos" in insp.get_table_names():
            existing = {c["name"] for c in insp.get_columns("jogos")}
            if "realizado" not in existing:
                conn.execute(text("ALTER TABLE jogos ADD COLUMN realizado INTEGER DEFAULT 0"))
            if "gols_descricao" not in existing:
                conn.execute(text("ALTER TABLE jogos ADD COLUMN gols_descricao TEXT"))
            if "assistencias" not in existing:
                conn.execute(text("ALTER TABLE jogos ADD COLUMN assistencias TEXT"))
            if "destaque" not in existing:
                conn.execute(text("ALTER TABLE jogos ADD COLUMN destaque TEXT"))

        # contas table - create if missing (handled by create_all, but ensure it exists)
        # transacoes table - add conta_id column if missing
        if "transacoes" in insp.get_table_names():
            existing_trans = {c["name"] for c in insp.get_columns("transacoes")}
            if "conta_id" not in existing_trans:
                conn.execute(text("ALTER TABLE transacoes ADD COLUMN conta_id INTEGER REFERENCES contas(id)"))

        conn.commit()

try:
    _migrate()
except Exception as e:
    log.warning(f"Migration: {e}")

app = FastAPI(
    title="Velhos Parceiros FC - API",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(jogadores.router)
app.include_router(mensalidades.router)
app.include_router(financeiro.router)
app.include_router(eventos.router)
app.include_router(jogos.router)
app.include_router(cartoes.router)
app.include_router(promocoes.router)
app.include_router(whatsapp.router)
app.include_router(dashboard.router)
app.include_router(contas.router)
app.include_router(configuracoes.router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        # Seed admin user
        admin = db.query(Usuario).filter(Usuario.username == "admin").first()
        if not admin:
            admin = Usuario(
                username="admin",
                password_hash=hash_password("velhos2026"),
                nome="Jonathan",
                role="admin",
            )
            db.add(admin)
            db.commit()

        # Seed default contas
        if db.query(Conta).count() == 0:
            db.add(Conta(nome="Caixa", tipo="dinheiro", saldo_inicial=0))
            db.add(Conta(nome="Banco", tipo="banco", saldo_inicial=0))
            db.commit()
            log.info("Seed: 2 contas padrao criadas (Caixa, Banco).")

        # Seed default configs
        inserted = seed_default_configs(db)
        if inserted:
            log.info(f"Seed: {inserted} configuracoes padrao inseridas.")
    finally:
        db.close()

    # Start scheduler (temporarily disabled for debugging)
    # try:
    #     start_scheduler(app)
    # except Exception:
    #     log.exception("Erro ao iniciar scheduler")


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()


@app.get("/")
def root():
    return {"app": "Velhos Parceiros FC", "version": "1.0.0", "docs": "/docs"}


@app.get("/api/debug/jogadores-raw")
def debug_jogadores_raw():
    """Test endpoint using raw sqlite3 to isolate SQLAlchemy issues."""
    import sqlite3
    import os
    db_path = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "velhos.db"))
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT id, nome FROM jogadores ORDER BY nome")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows
