"""Shared test data factories. Used across router, service, and model tests.

Import these in test files instead of defining local _create_* helpers.
"""


async def create_test_account(
    client,
    name: str = "Test Account",
    type: str = "bank_account",
    currency: str = "EGP",
    opening_balance: int = 1000000,
) -> int:
    """Create a test account and return its id."""
    resp = await client.post(
        "/api/v1/accounts",
        json={
            "name": name,
            "type": type,
            "currency": currency,
            "opening_balance": opening_balance,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]


async def create_test_category(
    client,
    name: str = "Test Category",
    type: str = "expense",
) -> int:
    """Create a custom category and return its id."""
    resp = await client.post(
        "/api/v1/categories",
        json={"name_en": name, "name_ar": "فئة", "type": type},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]


async def create_test_transaction(
    client,
    account_id: int,
    amount_minor: int = 50000,
    type: str = "debit",
    currency: str = "EGP",
    date: str = "2024-01-15",
    description: str = "Test Transaction",
) -> dict:
    """Create a transaction and return response data."""
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account_id,
            "date": date,
            "description": description,
            "amount_minor": amount_minor,
            "type": type,
            "currency": currency,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def create_test_debt(
    client,
    name: str = "Test Loan",
    principal_minor: int = 1200000,
    tenure_months: int = 12,
    annual_rate_percent: float = 0,
    **overrides,
) -> int:
    """Create a bank loan debt and return its id."""
    payload = {
        "type": "bank_loan",
        "name": name,
        "institution": "CIB",
        "principal_minor": principal_minor,
        "currency": "EGP",
        "annual_rate_percent": annual_rate_percent,
        "tenure_months": tenure_months,
        "start_date": "2024-01-01",
    }
    payload.update(overrides)
    resp = await client.post("/api/v1/debts", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]
