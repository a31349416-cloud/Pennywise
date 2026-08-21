import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent


def _database_url() -> str:
    custom_path = os.environ.get("PENNYWISE_DB_PATH")
    if custom_path:
        return f"sqlite:///{custom_path}"
    return f"sqlite:///{BASE_DIR / 'pennywise.db'}"


DATABASE_URL = _database_url()

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
