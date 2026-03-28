from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import Settings

# Build a settings instance for database URL only — avoids requiring all env vars
# during testing. At runtime, main.py uses the full settings singleton.
_settings = Settings()  # type: ignore[call-arg]

# Integration tests use NullPool to prevent asyncpg connection pool contamination
# between test functions (each request gets a fresh connection, closed after use).
_pool_kwargs: dict = (
    {"poolclass": NullPool} if _settings.APP_ENV == "testing" else {"pool_pre_ping": True}
)

engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=_settings.APP_ENV == "development",
    # Supabase uses PgBouncer in transaction mode which doesn't support
    # asyncpg prepared statements — disable the cache to avoid 500s.
    connect_args={"statement_cache_size": 0},
    **_pool_kwargs,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
