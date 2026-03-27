from app.config import Settings


def test_settings_loads_defaults():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/test",
        SUPABASE_URL="https://test.supabase.co",
        SUPABASE_ANON_KEY="test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY="test-service-key",
    )
    assert settings.APP_ENV == "development"
    assert settings.CORS_ORIGINS == ["http://localhost:3000"]
    assert settings.DATABASE_URL == "postgresql+asyncpg://user:pass@localhost:5432/test"


def test_settings_cors_origins_parsed_from_comma_separated():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/test",
        SUPABASE_URL="https://test.supabase.co",
        SUPABASE_ANON_KEY="test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY="test-service-key",
        CORS_ORIGINS="http://localhost:3000,https://masareef.app",  # type: ignore[arg-type]
    )
    assert settings.CORS_ORIGINS == ["http://localhost:3000", "https://masareef.app"]
