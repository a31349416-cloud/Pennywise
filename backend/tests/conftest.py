"""Test suite MUST never touch the production database.

PENNYWISE_DB_PATH is set *before* importing app modules so that
app.database binds the engine to a disposable file.
"""

import os
import tempfile

_TEST_DB = os.path.join(tempfile.gettempdir(), "pennywise-test.db")
os.environ["PENNYWISE_DB_PATH"] = _TEST_DB

try:
    os.remove(_TEST_DB)
except FileNotFoundError:
    pass

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

if "pennywise-test" not in str(engine.url):
    raise RuntimeError(
        f"Refusing to run tests against non-test database: {engine.url}"
    )


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    SessionLocal().close()
