"""Database engine, session factory and declarative base."""
import logging
import time

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

logger = logging.getLogger("uvicorn.error")

# ``pool_pre_ping`` transparently recycles connections dropped by the server,
# which is important on managed/free Postgres tiers that aggressively idle out.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_db(max_attempts: int = 30, delay: float = 2.0) -> None:
    """Block until the database accepts connections.

    Containers frequently start the API before Postgres is ready to accept
    connections; retrying here makes ``docker compose up`` deterministic.
    """
    from sqlalchemy import text

    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established.")
            return
        except OperationalError as exc:  # pragma: no cover - timing dependent
            logger.warning(
                "Database not ready (attempt %s/%s): %s",
                attempt,
                max_attempts,
                exc.__class__.__name__,
            )
            time.sleep(delay)
    raise RuntimeError("Could not connect to the database after several attempts.")
