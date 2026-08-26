import os
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
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
    _USER_ID_TABLES = ["transactions", "budgets", "recurring_transactions", "savings_goals", "accounts", "tags", "reminders", "shared_access"]
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


def _migrate_transaction_account(engine) -> None:
    """Add nullable account_id to transactions for linking to accounts."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        if not inspector.has_table("transactions"):
            return
        columns = {c["name"] for c in inspector.get_columns("transactions")}
        if "account_id" not in columns:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_account_id ON transactions (account_id)"))


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA synchronous=NORMAL")
    finally:
        cursor.close()


def _migrate_shared_unique(engine) -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        if not inspector.has_table("shared_access"):
            return
        # Add unique index if missing
        indexes = inspector.get_indexes("shared_access")
        has_unique = any(
            idx.get("unique") and set(idx.get("column_names", [])) == {"owner_id", "shared_with_email"}
            for idx in indexes
        )
        if not has_unique:
            # SQLite will allow duplicates until we add the index; clean duplicates first (keep earliest)
            conn.execute(text("DELETE FROM shared_access WHERE id NOT IN (SELECT MIN(id) FROM shared_access GROUP BY owner_id, shared_with_email)"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_shared_owner_email ON shared_access (owner_id, shared_with_email)"))


def _migrate_family(engine) -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        if inspector.has_table("users"):
            cols = {c["name"] for c in inspector.get_columns("users")}
            if "family_id" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN family_id INTEGER REFERENCES families(id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_family_id ON users (family_id)"))


def _migrate_transaction_member(engine) -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        if not inspector.has_table("transactions"):
            return
        cols = {c["name"] for c in inspector.get_columns("transactions")}
        if "member" not in cols:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN member VARCHAR(50)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_member ON transactions (member)"))


_migrate_float_money(engine)
_migrate_user_id(engine)
_migrate_transaction_account(engine)
_migrate_shared_unique(engine)
_migrate_family(engine)
_migrate_transaction_member(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
