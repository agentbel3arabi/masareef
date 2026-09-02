from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    DATABASE_URL: str
    DIRECT_DATABASE_URL: str | None = None

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Import rate limits (requests per minute per user)
    import_parse_rate_limit: int = Field(default=20)
    import_commit_rate_limit: int = Field(default=5)

    # AI Categorization (Phase 3)
    AI_MODEL: str = "claude-3-5-haiku-20241022"
    LITELLM_API_KEY: str = ""
    AI_MONTHLY_TOKEN_LIMIT: int = 500000  # default 500k tokens/month per household
    AI_BATCH_SIZE: int = 20
    AI_MAX_CONCURRENCY: int = 5

    # Azure OpenAI (optional — used by litellm when AI_MODEL starts with "azure/")
    azure_api_key: str = ""
    azure_api_base: str = ""
    azure_api_version: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
