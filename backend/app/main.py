import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import Settings
from app.limiter import limiter
from app.routers import accounts, categories, financial_institutions, transactions, transfers
from app.routers.categorization import router as categorization_router
from app.routers.dashboard import router as dashboard_router
from app.routers.debts import router as debts_router
from app.routers.financing_apps import router as financing_apps_router
from app.routers.households import router as households_router
from app.routers.import_ import router as import_router
from app.routers.import_templates import router as import_templates_router
from app.routers.installments import router as installments_router
from app.routers.persons import router as persons_router

logger = logging.getLogger(__name__)

# Load settings — will use .env file at runtime
try:
    _settings = Settings()  # type: ignore[call-arg]
    _cors_origins = _settings.CORS_ORIGINS
except Exception as e:
    logger.warning("Failed to load Settings — falling back to localhost CORS: %s", e)
    _cors_origins = ["http://localhost:3000"]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="Masareef API",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(households_router)
app.include_router(dashboard_router)
app.include_router(categorization_router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(transfers.router)
app.include_router(import_router)
app.include_router(import_templates_router)
app.include_router(persons_router)
app.include_router(debts_router)
app.include_router(installments_router)
app.include_router(financing_apps_router)
app.include_router(financial_institutions.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}
