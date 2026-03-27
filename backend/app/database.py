from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import Settings

# Build a settings instance for database URL only — avoids requiring all env vars
# during testing. At runtime, main.py uses the full settings singleton.
_settings = Settings()  # type: ignore[call-arg]

engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=_settings.APP_ENV == "development",
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
