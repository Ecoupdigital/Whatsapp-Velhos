from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import Usuario
from auth import hash_password

from routers import auth, jogadores, mensalidades, financeiro, eventos, jogos, cartoes, promocoes, whatsapp, dashboard

# Create tables
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


@app.on_event("startup")
def seed_admin():
    db = SessionLocal()
    try:
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
    finally:
        db.close()


@app.get("/")
def root():
    return {"app": "Velhos Parceiros FC", "version": "1.0.0", "docs": "/docs"}
