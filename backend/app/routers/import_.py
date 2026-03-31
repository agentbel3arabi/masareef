"""Import HTTP router. Thin layer — all logic in import_service."""

import json
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import get_db_session, get_household_id
from app.limiter import limiter
from app.schemas.common import SuccessResponse
from app.schemas.import_ import CommitRequest, PresetInfo
from app.services.import_ import import_service
from app.services.import_.presets.registry import list_presets

router = APIRouter(prefix="/api/v1/import", tags=["import"])

_MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

try:
    _settings = Settings()  # type: ignore[call-arg]
    _parse_limit = f"{_settings.import_parse_rate_limit}/minute"
    _commit_limit = f"{_settings.import_commit_rate_limit}/minute"
except Exception:
    _parse_limit = "20/minute"
    _commit_limit = "5/minute"


@router.post("/parse")
@limiter.limit(_parse_limit)  # type: ignore[misc]
async def parse_file(
    request: Request,
    file: UploadFile = File(...),
    account_id: int = Form(...),
    currency: str = Form(default="EGP"),
    column_mapping: str | None = Form(default=None),
    date_format: str = Form(default="DD/MM/YYYY"),
    sheet_name: str | None = Form(default=None),
    skip_rows: int = Form(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    """Parse and preview a bank statement file."""
    raw_bytes = await file.read()

    # Reject files over 10 MB
    if len(raw_bytes) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": "File exceeds 10MB limit"}},
        )

    # Parse column_mapping JSON safely
    if column_mapping:
        try:
            mapping = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "INVALID_COLUMN_MAPPING",
                        "message": "column_mapping must be valid JSON",
                    }
                },
            )
        if not isinstance(mapping, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in mapping.items()
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "INVALID_COLUMN_MAPPING",
                        "message": (
                            "column_mapping must be a JSON object with string keys and values"
                        ),
                    }
                },
            )
    else:
        mapping = None

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
        skip_rows=skip_rows,
    )
    return SuccessResponse(data=result.model_dump())


@router.post("/commit", status_code=status.HTTP_200_OK)
@limiter.limit(_commit_limit)  # type: ignore[misc]
async def commit_import(
    request: Request,
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
