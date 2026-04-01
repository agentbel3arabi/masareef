import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse
from app.schemas.person import PersonCreate, PersonResponse, PersonUpdate
from app.services import person as person_service

router = APIRouter(prefix="/api/v1/persons", tags=["persons"])


async def _person_to_response(
    session: AsyncSession,
    household_id: uuid.UUID,
    person,
) -> dict:
    """Map Person ORM object to PersonResponse dict with computed balances."""
    balances = await person_service.compute_person_balances(
        session, household_id, person.id
    )
    resp = PersonResponse(
        id=person.id,
        name=person.name,
        name_ar=person.name_ar,
        phone=person.phone,
        email=person.email,
        relationship=person.relationship,
        notes=person.notes,
        is_active=person.is_active,
        balances=balances,
    )
    return resp.model_dump()


@router.get("")
async def list_persons(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    persons, total = await person_service.list_persons(session, household_id, page, page_size)
    items = [await _person_to_response(session, household_id, p) for p in persons]
    return SuccessResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/{person_id}")
async def get_person(
    person_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    return SuccessResponse(data=await _person_to_response(session, household_id, person))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_person(
    data: PersonCreate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.create_person(session, household_id, data)
    return SuccessResponse(data=await _person_to_response(session, household_id, person))


@router.put("/{person_id}")
async def update_person(
    person_id: int,
    data: PersonUpdate,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> SuccessResponse:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    person = await person_service.update_person(session, person, data)
    return SuccessResponse(data=await _person_to_response(session, household_id, person))


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: int,
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
) -> None:
    person = await person_service.get_person(session, household_id, person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(code="NOT_FOUND", message="Person not found")
            ).model_dump(),
        )
    if await person_service.has_active_debts(session, person.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="PERSON_HAS_ACTIVE_DEBTS",
                    message="Cannot delete person with active debts",
                )
            ).model_dump(),
        )
    await person_service.soft_delete_person(session, person)
