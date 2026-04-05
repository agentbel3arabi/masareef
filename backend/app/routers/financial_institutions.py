from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.financial_institution import (
    InstitutionCreate,
    InstitutionListResponse,
    InstitutionResponse,
    InstitutionUpdate,
)
from app.services import financial_institution as fi_service

router = APIRouter(prefix="/api/v1/financial-institutions", tags=["financial-institutions"])


@router.get("", response_model=dict)
async def list_institutions(
    type: str,
    search: str | None = None,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    if type not in ("bank", "bnpl", "digital_wallet_provider"):
        raise HTTPException(status_code=400, detail="Invalid institution type")

    result = await fi_service.list_institutions(
        session, household_id, inst_type=type, search=search
    )
    return {
        "data": InstitutionListResponse(
            popular=[InstitutionResponse.model_validate(i) for i in result["popular"]],
            all=[InstitutionResponse.model_validate(i) for i in result["all"]],
        ).model_dump()
    }


@router.get("/{slug}", response_model=dict)
async def get_institution(
    slug: str,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    return {"data": InstitutionResponse.model_validate(institution).model_dump()}


@router.post("", response_model=dict, status_code=201)
async def create_institution(
    data: InstitutionCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    try:
        institution = await fi_service.create_custom_institution(
            session, household_id, data.name_en, data.name_ar, data.type
        )
    except Exception:
        raise HTTPException(status_code=409, detail="Duplicate institution name")
    return {"data": InstitutionResponse.model_validate(institution).model_dump()}


@router.put("/{slug}", response_model=dict)
async def update_institution(
    slug: str,
    data: InstitutionUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    if institution.is_predefined:
        raise HTTPException(status_code=403, detail="Cannot modify predefined institutions")

    institution = await fi_service.update_custom_institution(
        session, institution, data.name_en, data.name_ar
    )
    return {"data": InstitutionResponse.model_validate(institution).model_dump()}


@router.delete("/{slug}", status_code=204)
async def delete_institution(
    slug: str,
    session: AsyncSession = Depends(get_db_session),
    household_id=Depends(get_household_id),
):
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    if institution.is_predefined:
        raise HTTPException(status_code=403, detail="Cannot delete predefined institutions")

    active_count = await fi_service.count_active_accounts(session, institution.id)
    if active_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"This institution has {active_count} active accounts."
                " Remove or reassign them first."
            ),
        )

    await fi_service.soft_delete_institution(session, institution)
