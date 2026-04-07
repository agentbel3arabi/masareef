from app.config import Settings


def test_settings_loads_defaults():
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/test",
        SUPABASE_URL="https://test.supabase.co",
        SUPABASE_ANON_KEY="test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY="test-service-key",
        SUPABASE_JWT_SECRET="test-jwt-secret",
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


def test_import_rate_limit_defaults(monkeypatch):
    from app.config import Settings

    monkeypatch.delenv("IMPORT_PARSE_RATE_LIMIT", raising=False)
    monkeypatch.delenv("IMPORT_COMMIT_RATE_LIMIT", raising=False)
    s = Settings(
        SUPABASE_URL="http://x",
        SUPABASE_ANON_KEY="x",
        SUPABASE_SERVICE_ROLE_KEY="x",
        SUPABASE_JWT_SECRET="x",
        DATABASE_URL="sqlite+aiosqlite://",
    )
    assert s.import_parse_rate_limit == 20
    assert s.import_commit_rate_limit == 5
