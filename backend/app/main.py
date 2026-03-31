import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.routers import accounts, categories, transactions, transfers
from app.routers.households import router as households_router

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(households_router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(transfers.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}
