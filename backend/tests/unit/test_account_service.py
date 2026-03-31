import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_compute_net_worth_uses_bulk_query():
    """compute_net_worth must issue a single aggregate query, not one per account."""
    from app.services.account import compute_net_worth

    household_id = uuid.uuid4()

    # Mock list_accounts to return 3 accounts (none with opened_at)
    def mock_acct(aid: int, currency: str, balance: int) -> MagicMock:
        return MagicMock(
            id=aid,
            currency=currency,
            balance_minor=balance,
            opened_at=None,
            household_id=household_id,
        )

    accounts = [mock_acct(1, "EGP", 100000), mock_acct(2, "EGP", 50000), mock_acct(3, "USD", 20000)]

    mock_session = AsyncMock()

    # First execute: bulk tx_sums query → returns rows per account
    tx_rows = [MagicMock(account_id=1, tx_sum=10000), MagicMock(account_id=2, tx_sum=5000)]
    bulk_result = MagicMock()
    bulk_result.__iter__ = MagicMock(return_value=iter(tx_rows))

    # Second execute: household get → returns household object
    hh = MagicMock(base_currency="EGP")
    mock_session.get = AsyncMock(return_value=hh)
    mock_session.execute = AsyncMock(return_value=bulk_result)

    with patch("app.services.account.list_accounts", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = (accounts, 3)
        result = await compute_net_worth(mock_session, household_id)

    # execute should be called exactly once (bulk tx_sums query)
    assert mock_session.execute.call_count == 1
    assert result["account_count"] == 3
    assert result["base_currency"] == "EGP"
