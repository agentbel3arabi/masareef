import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_compute_net_worth_uses_bulk_query():
    """compute_net_worth must issue exactly two aggregate queries (accounts + tx_sums), not one per account."""
    from app.services.account import compute_net_worth

    household_id = uuid.uuid4()

    def mock_acct(aid: int, currency: str, balance: int) -> MagicMock:
        return MagicMock(
            id=aid,
            currency=currency,
            balance_minor=balance,
            opened_at=None,
            household_id=household_id,
        )

    accounts = [mock_acct(1, "EGP", 100000), mock_acct(2, "EGP", 50000), mock_acct(3, "USD", 20000)]

    # First execute call: accounts query — result.scalars().all() returns accounts list
    accounts_result = MagicMock()
    accounts_result.scalars.return_value.all.return_value = accounts

    # Second execute call: bulk tx_sums query — iterable of rows
    tx_rows = [MagicMock(account_id=1, tx_sum=10000), MagicMock(account_id=2, tx_sum=5000)]
    tx_result = MagicMock()
    tx_result.__iter__ = MagicMock(return_value=iter(tx_rows))

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[accounts_result, tx_result])
    mock_session.get = AsyncMock(return_value=MagicMock(base_currency="EGP"))

    result = await compute_net_worth(mock_session, household_id)

    # Two execute calls: one for accounts, one for bulk tx_sums
    assert mock_session.execute.call_count == 2
    assert result["account_count"] == 3
    assert result["base_currency"] == "EGP"
