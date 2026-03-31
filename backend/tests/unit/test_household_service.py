import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.mark.asyncio
async def test_get_household_for_user_returns_none_when_no_household():
    """Returns None when the user has no household."""
    from app.services.household import get_household_for_user

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)

    result = await get_household_for_user(mock_session, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_get_household_for_user_returns_household_id():
    """Returns UUID when user has a household."""
    from app.services.household import get_household_for_user

    expected_id = uuid.uuid4()
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected_id
    mock_session.execute = AsyncMock(return_value=mock_result)

    result = await get_household_for_user(mock_session, uuid.uuid4())
    assert result == expected_id


def test_household_create_schema_validation():
    """HouseholdCreate rejects empty names and invalid currencies."""
    from pydantic import ValidationError

    from app.schemas.household import HouseholdCreate

    with pytest.raises(ValidationError):
        HouseholdCreate(name="", base_currency="EGP")

    with pytest.raises(ValidationError):
        HouseholdCreate(name="Test", base_currency="JPY")  # not in allowed list

    valid = HouseholdCreate(name="My Home", base_currency="EGP")
    assert valid.name == "My Home"
    assert valid.base_currency == "EGP"
