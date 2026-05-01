from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

# Priority: DATABASE_URL (postgres in prod) > DATABASE_PATH (sqlite legacy) > local sqlite default
_url = os.environ.get("DATABASE_URL")
if not _url:
    _path = os.environ.get(
        "DATABASE_PATH",
        os.path.join(os.path.dirname(__file__), "velhos.db"),
    )
    _url = f"sqlite:///{_path}"

DATABASE_URL = _url

engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
