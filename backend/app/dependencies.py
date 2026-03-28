import time
import uuid
from collections.abc import AsyncGenerator

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.database import async_session_factory
from app.models.household import HouseholdMember

security = HTTPBearer(auto_error=False)

try:
    _settings = Settings()  # type: ignore[call-arg]
    _supabase_jwt_secret = _settings.SUPABASE_JWT_SECRET
    _supabase_url = _settings.SUPABASE_URL
except Exception:
    _supabase_jwt_secret = ""
    _supabase_url = ""

# JWKS cache for ES256 verification
_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_CACHE_TTL = 3600  # 1 hour


def _fetch_jwks() -> dict:
    """Fetch JWKS from Supabase and cache for 1 hour."""
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_CACHE_TTL:
        return _jwks_cache
    jwks_url = f"{_supabase_url}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(jwks_url, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_cache_time = now
    return _jwks_cache


def decode_jwt(token: str) -> dict:
    """Decode a Supabase JWT (ES256 or HS256). Separated for easy mocking in tests."""
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg == "ES256":
        jwks = _fetch_jwks()
        return jwt.decode(
            token,
            jwks,
            algorithms=["ES256"],
            audience="authenticated",
            options={"verify_aud": False},
        )

    return jwt.decode(
        token,
        _supabase_jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
        options={"verify_aud": False},
    )


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> uuid.UUID:
    """Extract user_id from Supabase JWT Bearer token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    try:
        payload = decode_jwt(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no subject",
            )
        return uuid.UUID(user_id)
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_household_id(
    session: AsyncSession = Depends(get_db_session),
    user_id: uuid.UUID = Depends(get_current_user),
) -> uuid.UUID:
    """Resolve user_id to their household_id."""
    result = await session.execute(
        select(HouseholdMember.household_id).where(HouseholdMember.user_id == user_id)
    )
    household_id = result.scalar_one_or_none()
    if not household_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of any household",
        )
    return household_id
