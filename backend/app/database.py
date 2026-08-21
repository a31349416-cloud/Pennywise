import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent


def _database_url() -> str:
    custom_path = os.environ.get("PENNYWISE_DB_PATH")
    if custom_path:
        return f"sqlite:///{custom_path}"
    return f"sqlite:///{BASE_DIR / 'pennywise.db'}"


DATABASE_URL = _database_url()

# Legacy REAL (hryvnia) columns migrated once to INTEGER cents columns.
# Old columns are kept in place; the app stops using them.
_LEGACY_MONEY_COLUMNS = [
    (
        "transactions",
        "amount",
        "amount_cents",
        "UPDATE transactions SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER)",
    ),
    (
        "budgets",
        "monthly_limit",
        "monthly_limit_cents",
        "UPDATE budgets SET monthly_limit_cents = CAST(ROUND(monthly_limit * 100) AS INTEGER)",
    ),
]


def _migrate_float_money(engine) -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, old_col, new_col, copy_stmt in _LEGACY_MONEY_COLUMNS:
            if not inspector.has_table(table):
                continue
            columns = {c["name"] for c in inspector.get_columns(table)}
            if old_col not in columns:
                continue
            if new_col not in columns:
                conn.execute(
                    text(
                        f"ALTER TABLE {table} ADD COLUMN {new_col} "
                        "INTEGER NOT NULL DEFAULT 0"
                    )
                )
                conn.execute(text(copy_stmt))
            # Remove the legacy NOT NULL float column so new inserts
            # (which no longer provide it) succeed. Handles databases that
            # were only partially migrated by an earlier version.
            conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {old_col}"))


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
_migrate_float_money(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
