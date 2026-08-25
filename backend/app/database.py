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


def _migrate_user_id(engine) -> None:
    """Add user_id foreign key to tables that existed before multi-tenancy."""
    _USER_ID_TABLES = ["transactions", "budgets", "recurring_transactions", "savings_goals"]
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in _USER_ID_TABLES:
            if not inspector.has_table(table):
                continue
            columns = {c["name"] for c in inspector.get_columns(table)}
            if "user_id" in columns:
                continue
            conn.execute(
                text(
                    f"ALTER TABLE {table} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1"
                )
            )
            conn.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS ix_{table}_user_id ON {table} (user_id)"
                )
            )


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
_migrate_float_money(engine)
_migrate_user_id(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
