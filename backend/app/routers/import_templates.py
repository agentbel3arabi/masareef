"""Import templates HTTP router."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.models.account import Account
from app.schemas.common import SuccessResponse
from app.schemas.import_template import (
    ImportTemplateCreate,
    ImportTemplateResponse,
    ImportTemplateUpdate,
)
from app.services import import_template as template_service

router = APIRouter(prefix="/api/v1/import/templates", tags=["import-templates"])


def _to_response(template, linked_ids: list[int]) -> ImportTemplateResponse:
    return ImportTemplateResponse(
        id=template.id,
        household_id=str(template.household_id),
        name=template.name,
        name_ar=template.name_ar,
        format=template.format,
        columns=template.columns,
        date_format=template.date_format,
        encoding=template.encoding,
        skip_rows=template.skip_rows,
        sheet_name=template.sheet_name,
        notes=template.notes,
        created_at=template.created_at,
        updated_at=template.updated_at,
        linked_account_ids=linked_ids,
    )


@router.get("")
async def list_templates(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    templates = await template_service.list_templates(session, household_id)
    items = []
    for t in templates:
        linked = await template_service.get_linked_account_ids(session, t.id)
        items.append(_to_response(t, linked).model_dump())
    return SuccessResponse(data=items)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_template(
    data: ImportTemplateCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    template = await template_service.create_template(session, household_id, data)
    linked = await template_service.get_linked_account_ids(session, template.id)
    return SuccessResponse(data=_to_response(template, linked).model_dump())


@router.put("/{template_id}")
async def update_template(
    template_id: int,
    data: ImportTemplateUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template = await template_service.update_template(session, template, data)
    await session.refresh(template)
    linked = await template_service.get_linked_account_ids(session, template.id)
    return SuccessResponse(data=_to_response(template, linked).model_dump())


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await template_service.delete_template(session, template)


@router.post("/{template_id}/link/{account_id}")
async def link_template_to_account(
    template_id: int,
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    # Verify account belongs to the same household
    acct_result = await session.execute(
        select(Account).where(
            Account.id == account_id,
            Account.household_id == household_id,
        )
    )
    if acct_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Account not found")
    await template_service.link_template(session, template_id, account_id)
    return SuccessResponse(data={"linked": True})


@router.delete("/{template_id}/link/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_template_from_account(
    template_id: int,
    account_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    template = await template_service.get_template(session, household_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await template_service.unlink_template(session, template_id, account_id)
