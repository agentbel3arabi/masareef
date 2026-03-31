import pytest
from unittest.mock import AsyncMock, MagicMock, call, patch
import uuid


@pytest.mark.asyncio
async def test_bulk_delete_issues_single_update():
    """bulk_delete must use a single UPDATE statement, not N individual SELECTs."""
    from app.services.transaction import bulk_delete

    mock_session = AsyncMock()
    # Simulate execute returning verified IDs
    mock_result = MagicMock()
    mock_result.__iter__ = MagicMock(return_value=iter([(1,), (2,), (3,)]))
    mock_session.execute = AsyncMock(return_value=mock_result)

    household_id = uuid.uuid4()
    count = await bulk_delete(mock_session, household_id, [1, 2, 3])

    # Must call execute exactly 3 times: SELECT (verify), DELETE splits, UPDATE transactions
    assert mock_session.execute.call_count == 3
    assert count == 3


@pytest.mark.asyncio
async def test_bulk_categorize_issues_single_update():
    """bulk_categorize must use a single UPDATE statement."""
    from app.services.transaction import bulk_categorize, validate_category_access

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.rowcount = 2  # fewer than len(ids) — proves we use rowcount, not len(ids)
    mock_session.execute = AsyncMock(return_value=mock_result)

    household_id = uuid.uuid4()

    with patch("app.services.transaction.validate_category_access", new_callable=AsyncMock):
        count = await bulk_categorize(mock_session, household_id, [1, 2, 3], category_id=5)

    # Must call execute exactly once for the bulk UPDATE (after validate_category_access)
    assert mock_session.execute.call_count == 1
    # Returns actual rowcount, not len(ids) — so 2, not 3
    assert count == 2
