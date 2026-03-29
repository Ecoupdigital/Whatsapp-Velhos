from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "velhos.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Use pysqlite autocommit mode to avoid implicit BEGIN
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "isolation_level": None},
    pool_size=5,
    pool_pre_ping=True,
)

@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    dbapi_conn.execute("PRAGMA journal_mode=WAL")
    dbapi_conn.execute("PRAGMA busy_timeout=5000")
    dbapi_conn.execute("PRAGMA synchronous=NORMAL")

# With pysqlite isolation_level=None, we need to manage transactions manually
@event.listens_for(engine, "begin")
def _do_begin(conn):
    conn.exec_driver_sql("BEGIN")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
