from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


def create_database_engine(settings: Settings) -> Engine:
    """Create a lazy PostgreSQL engine without opening a connection."""

    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_recycle=300,
    )


SessionFactory = sessionmaker[Session]


def create_session_factory(engine: Engine) -> SessionFactory:
    """Create the transaction boundary used by services and request dependencies."""

    return sessionmaker(bind=engine, class_=Session, expire_on_commit=False, autoflush=False)
