"""Import HTTP router. Thin layer — all logic in import_service."""

import json
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import SuccessResponse
from app.schemas.import_ import CommitRequest, PresetInfo
from app.services.import_ import import_service
from app.services.import_.presets.registry import list_presets

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/parse")
async def parse_file(
    file: UploadFile = File(...),
    account_id: int = Form(...),
    currency: str = Form(default="EGP"),
    column_mapping: str | None = Form(default=None),
    date_format: str = Form(default="DD/MM/YYYY"),
    sheet_name: str | None = Form(default=None),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Parse and preview a bank statement file."""
    raw_bytes = await file.read()
    mapping = json.loads(column_mapping) if column_mapping else None

    result = await import_service.parse_upload(
        raw_bytes=raw_bytes,
        filename=file.filename or "upload",
        account_id=account_id,
        currency=currency,
        session=session,
        household_id=household_id,
        column_mapping=mapping,
        date_format=date_format,
        sheet_name=sheet_name,
        content_type=file.content_type,
    )
    return SuccessResponse(data=result.model_dump())


@router.post("/commit", status_code=status.HTTP_200_OK)
async def commit_import(
    data: CommitRequest,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Atomically commit confirmed rows to the database."""
    result = await import_service.commit_import(data, session, household_id)
    return SuccessResponse(data=result.model_dump())


@router.get("/presets")
async def list_import_presets() -> SuccessResponse:
    """List all available bank import presets."""
    presets = [
        PresetInfo(
            id=p.preset_id,
            name=p.name,
            name_ar=p.name_ar,
            formats=p.formats,
        )
        for p in list_presets()
    ]
    return SuccessResponse(data={"presets": [p.model_dump() for p in presets]})
