# backend/app/routers/financing_apps.py
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import SuccessResponse
from app.services import installment as installment_service

router = APIRouter(prefix="/api/v1/financing-apps", tags=["financing-apps"])


@router.get("/summary")
async def financing_apps_summary(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    data = await installment_service.get_financing_apps_summary(session, household_id)
    return SuccessResponse(data=data)