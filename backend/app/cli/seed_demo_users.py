from app.core.config import get_settings
from app.core.security import PasswordService
from app.db.session import create_database_engine, create_session_factory
from app.services.seeding import seed_demo_users


def main() -> None:
    settings = get_settings()
    engine = create_database_engine(settings)
    session_factory = create_session_factory(engine)
    try:
        with session_factory.begin() as session:
            result = seed_demo_users(
                session,
                settings=settings,
                password_service=PasswordService(),
            )
    finally:
        engine.dispose()

    print(
        "Demo users reconciled: "
        f"created={result.created}, updated={result.updated}, unchanged={result.unchanged}"
    )


if __name__ == "__main__":
    main()
