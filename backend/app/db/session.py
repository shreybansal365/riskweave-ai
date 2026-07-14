from sqlalchemy import Engine, create_engine

from app.core.config import Settings


def create_database_engine(settings: Settings) -> Engine:
    """Create a lazy PostgreSQL engine without opening a connection."""

    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_recycle=300,
    )
