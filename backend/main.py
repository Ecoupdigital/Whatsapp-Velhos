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

# Create tables (Postgres handles schema natively, no ALTER TABLE patches needed)
Base.metadata.create_all(bind=engine)

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
