import uuid
from collections.abc import AsyncGenerator

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
except Exception:
    _supabase_jwt_secret = ""


def decode_jwt(token: str) -> dict:
    """Decode a Supabase JWT. Separated for easy mocking in tests."""
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
