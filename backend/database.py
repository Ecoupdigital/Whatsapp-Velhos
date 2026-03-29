from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
import sqlite3

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "velhos.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_size=1,
    max_overflow=0,
)

@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


_call_count = 0

def get_db():
    global _call_count
    _call_count += 1
    import logging
    logging.getLogger(__name__).warning("get_db called #%d", _call_count)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
