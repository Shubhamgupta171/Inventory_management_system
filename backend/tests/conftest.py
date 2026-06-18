"""Pytest fixtures.

Tests run against an in-memory SQLite database so they need no external
services. The business logic (uniqueness, stock validation, stock reduction,
total calculation) is database-agnostic, so this gives fast, deterministic
coverage of the rules that matter.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        bind=engine, autocommit=False, autoflush=False, future=True
    )
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # NOTE: we deliberately do NOT use ``with TestClient(app)`` here, because
    # entering the context manager would run the startup lifespan, which waits
    # for a Postgres connection. Instantiating the client directly skips it.
    yield TestClient(app)
    app.dependency_overrides.clear()
