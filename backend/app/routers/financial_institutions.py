import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.models.account import Account
from app.models.enums import AccountType
from app.schemas.financial_institution import (
    InstitutionCreate,
    InstitutionListResponse,
    InstitutionResponse,
    InstitutionSummary,
    InstitutionSummaryStats,
    InstitutionUpdate,
)
from app.services import account as account_service
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


@router.get("/{slug}/summary", response_model=dict)
async def get_institution_summary(
    slug: str,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    """Get institution with all linked accounts and balance summary."""
    institution = await fi_service.get_institution_by_slug(session, household_id, slug)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Fetch all active accounts for this institution in this household
    stmt = select(Account).where(
        and_(
            Account.institution_id == institution.id,
            Account.household_id == household_id,
            Account.is_active.is_(True),
        )
    )
    result = await session.execute(stmt)
    accounts = list(result.scalars().all())

    # Build account responses with balances
    from app.routers.accounts import _build_account_response

    account_items = []
    total_assets_minor = 0
    total_liabilities_minor = 0

    liability_types = {AccountType.CREDIT_CARD, AccountType.FINANCING_APP}

    for acct in accounts:
        displayed = await account_service.compute_displayed_balance(session, acct)
        item = await _build_account_response(session, acct, displayed)
        account_items.append(item)

        acct_type = acct.type if isinstance(acct.type, AccountType) else AccountType(acct.type)
        if acct_type in liability_types:
            total_liabilities_minor += abs(displayed)
        else:
            total_assets_minor += displayed

    net_position = total_assets_minor - total_liabilities_minor

    inst_resp = InstitutionResponse.model_validate(institution)
    summary_stats = InstitutionSummaryStats(
        total_assets_minor=total_assets_minor,
        total_liabilities_minor=total_liabilities_minor,
        total_base_minor=net_position,
        account_count=len(accounts),
    )
    summary = InstitutionSummary(
        institution=inst_resp,
        accounts=account_items,
        summary=summary_stats,
    )
    return {"data": summary.model_dump()}


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
    except IntegrityError:
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

    active_count = await fi_service.count_active_accounts(session, household_id, institution.id)
    if active_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"This institution has {active_count} active accounts."
                " Remove or reassign them first."
            ),
        )

    await fi_service.soft_delete_institution(session, institution)
