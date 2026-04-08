"""Integration tests for categorization endpoints.

Tests for:
- POST /api/v1/categorization-rules/categorize-batch
- POST /api/v1/categorization-rules/approve-batch
- POST /api/v1/categorization-rules/correct
- GET /api/v1/transactions?needs_review=true

All service calls mocked — tests verify HTTP contract and routing only.
"""

from unittest.mock import AsyncMock, patch

import pytest

from tests.factories import create_test_account as _create_account
from tests.factories import create_test_transaction as _create_tx

# ---------------------------------------------------------------------------
# POST /api/v1/categorization-rules/categorize-batch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_categorize_batch_empty_list(client):
    """Empty transaction_ids list returns 200 with empty results."""
    with patch(
        "app.services.categorization.categorize_transactions",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.post(
            "/api/v1/categorization-rules/categorize-batch",
            json={"transaction_ids": []},
        )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "results" in data
    assert data["results"] == []


@pytest.mark.asyncio
async def test_categorize_batch_returns_results(client):
    """Returns categorization results from the service."""
    mock_result = [
        {
            "transaction_id": 1,
            "category_id": 5,
            "confidence": 0.92,
            "source": "rule",
        }
    ]

    from app.schemas.categorization import CategorizationResult

    schema_results = [CategorizationResult(**r) for r in mock_result]

    with patch(
        "app.services.categorization.categorize_transactions",
        new_callable=AsyncMock,
        return_value=schema_results,
    ):
        resp = await client.post(
            "/api/v1/categorization-rules/categorize-batch",
            json={"transaction_ids": [1]},
        )
    assert resp.status_code == 200
    results = resp.json()["data"]["results"]
    assert len(results) == 1
    assert results[0]["transaction_id"] == 1
    assert results[0]["source"] == "rule"


# ---------------------------------------------------------------------------
# POST /api/v1/categorization-rules/approve-batch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_approve_batch_returns_count(client):
    """Returns approved count from service."""
    with patch(
        "app.services.categorization.approve_batch",
        new_callable=AsyncMock,
        return_value=3,
    ):
        resp = await client.post(
            "/api/v1/categorization-rules/approve-batch",
            json={"transaction_ids": [1, 2, 3]},
        )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["approved"] == 3


@pytest.mark.asyncio
async def test_approve_batch_empty(client):
    """Empty transaction list returns 0 approved."""
    with patch(
        "app.services.categorization.approve_batch",
        new_callable=AsyncMock,
        return_value=0,
    ):
        resp = await client.post(
            "/api/v1/categorization-rules/approve-batch",
            json={"transaction_ids": []},
        )
    assert resp.status_code == 200
    assert resp.json()["data"]["approved"] == 0


# ---------------------------------------------------------------------------
# POST /api/v1/categorization-rules/correct
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_correct_category_ok(client):
    """Correct endpoint calls apply_correction and returns ok=True."""
    with patch(
        "app.services.categorization.apply_correction",
        new_callable=AsyncMock,
        return_value=None,
    ):
        resp = await client.post(
            "/api/v1/categorization-rules/correct",
            json={"transaction_id": 42, "category_id": 7},
        )
    assert resp.status_code == 200
    assert resp.json()["data"]["ok"] is True


@pytest.mark.asyncio
async def test_correct_category_not_found(client):
    """404 from apply_correction is surfaced as 404 response."""
    with patch(
        "app.services.categorization.apply_correction",
        new_callable=AsyncMock,
        side_effect=ValueError("Transaction not found"),
    ):
        resp = await client.post(
            "/api/v1/categorization-rules/correct",
            json={"transaction_id": 999, "category_id": 7},
        )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/transactions?needs_review=true
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_needs_review_filter_true(client):
    """?needs_review=true returns 200 (filter applied at service level)."""
    account_id = await _create_account(client)
    resp = await client.get(
        "/api/v1/transactions",
        params={"needs_review": "true", "account_id": account_id},
    )
    assert resp.status_code == 200
    # No ai_categorized txs → empty result
    data = resp.json()["data"]
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_needs_review_filter_false_no_change(client):
    """?needs_review=false (default) still returns all non-review transactions."""
    account_id = await _create_account(client)
    await _create_tx(client, account_id)
    resp = await client.get(
        "/api/v1/transactions",
        params={"account_id": account_id},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
