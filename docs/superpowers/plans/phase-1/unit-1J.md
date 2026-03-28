# Unit 1J: Integration Tests & CI Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add end-to-end integration tests that verify every API endpoint works correctly against the real Supabase schema, confirm the frontend-backend wiring is correct, and run these tests in CI using GitHub Actions secrets.

**Scope:**
- Backend: pytest integration tests hitting real PostgreSQL via `DATABASE_URL` — one test per endpoint
- CI: Extend `backend.yml` to inject secrets and run integration tests as a separate job
- Frontend: `pnpm build` success already validates TS/lint — no Playwright tests yet (deferred to a dedicated Phase)

**Architecture:** Integration tests live in `backend/tests/integration/` — separate from unit tests in `backend/tests/`. Unit tests continue to use SQLite in-memory. Integration tests use the real Supabase pooler with `statement_cache_size=0` (already fixed in `database.py`).

**Required reading:** `CLAUDE.md` (coding conventions), `docs/guides/08-testing.md`, `docs/01-architecture.md` (auth flow — tests need a valid JWT or bypass)

**Auth strategy for tests:** Use Supabase service role key to create a test user + household via the admin API, run tests, then clean up. This bypasses JWT auth for test setup while keeping the actual endpoint auth intact.

---

## File Structure

```
backend/tests/
├── conftest.py                        # MODIFY: add integration fixtures (test user, household, cleanup)
├── integration/
│   ├── __init__.py                    # NEW
│   ├── conftest.py                    # NEW: integration-specific fixtures (auth token, test data)
│   ├── test_accounts_api.py           # NEW: GET/POST/DELETE /api/v1/accounts
│   ├── test_transactions_api.py       # NEW: GET/POST/DELETE /api/v1/transactions
│   ├── test_transfers_api.py          # NEW: GET/POST /api/v1/transfers
│   └── test_categories_api.py         # NEW: GET /api/v1/categories
.github/workflows/
└── backend.yml                        # MODIFY: add integration-tests job with secrets
```

---

### Task 1: Integration Test Fixtures

**Files:**
- Create: `backend/tests/integration/__init__.py`
- Create: `backend/tests/integration/conftest.py`

- [ ] **Step 1: Create integration conftest**

Create `backend/tests/integration/conftest.py`:
```python
"""
Integration test fixtures.

Uses the real Supabase database. Requires these env vars:
  DATABASE_URL             — asyncpg connection string (with statement_cache_size=0)
  SUPABASE_URL             — for admin API calls
  SUPABASE_SERVICE_ROLE_KEY — to create test users without email confirmation
  JWT_SECRET               — to sign test JWTs (or use a real Supabase token)

Each test session creates an isolated household and cleans up after itself.
"""
import os
import uuid
import pytest
import pytest_asyncio
import httpx
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture(scope="session")
def supabase_url() -> str:
    url = os.environ.get("SUPABASE_URL", "")
    if not url:
        pytest.skip("SUPABASE_URL not set — skipping integration tests")
    return url


@pytest.fixture(scope="session")
def service_role_key() -> str:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        pytest.skip("SUPABASE_SERVICE_ROLE_KEY not set — skipping integration tests")
    return key


@pytest_asyncio.fixture(scope="session")
async def test_auth_token(supabase_url: str, service_role_key: str) -> str:
    """
    Create a test user via Supabase Admin API and return their access token.
    Cleans up the user after the test session.
    """
    test_email = f"test-integration-{uuid.uuid4().hex[:8]}@masareef-test.invalid"
    test_password = f"TestPass-{uuid.uuid4().hex[:12]}!"

    async with httpx.AsyncClient() as client:
        # Create user via Admin API
        resp = await client.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
            },
            json={
                "email": test_email,
                "password": test_password,
                "email_confirm": True,
            },
        )
        resp.raise_for_status()
        user_id = resp.json()["id"]

        # Sign in to get access token
        sign_in = await client.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={"apikey": service_role_key},
            json={"email": test_email, "password": test_password},
        )
        sign_in.raise_for_status()
        token = sign_in.json()["access_token"]

    yield token

    # Cleanup: delete test user
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
            },
        )


@pytest_asyncio.fixture(scope="session")
async def api_client(test_auth_token: str) -> AsyncClient:
    """HTTPX async client pointed at the FastAPI app with auth header injected."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {test_auth_token}"},
    ) as client:
        yield client
```

- [ ] **Step 2: Create `__init__.py`**

```bash
touch backend/tests/integration/__init__.py
```

- [ ] **Step 3: Commit**

```bash
git add backend/tests/integration/
git commit -m "test(backend): add integration test fixtures with Supabase admin auth setup"
```

---

### Task 2: Accounts API Integration Tests

**Files:**
- Create: `backend/tests/integration/test_accounts_api.py`

- [ ] **Step 1: Write tests**

Create `backend/tests/integration/test_accounts_api.py`:
```python
"""Integration tests for /api/v1/accounts endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_accounts_empty_or_present(api_client: AsyncClient) -> None:
    """GET /api/v1/accounts returns 200 with data/meta envelope."""
    resp = await api_client.get("/api/v1/accounts")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_create_account(api_client: AsyncClient) -> None:
    """POST /api/v1/accounts creates an account and returns it."""
    payload = {
        "name": "Integration Test Account",
        "type": "bank_account",
        "currency": "EGP",
        "initial_balance": 0,
    }
    resp = await api_client.post("/api/v1/accounts", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["name"] == "Integration Test Account"
    assert body["data"]["currency"] == "EGP"
    assert "id" in body["data"]
    return body["data"]["id"]


@pytest.mark.asyncio
async def test_get_account(api_client: AsyncClient) -> None:
    """GET /api/v1/accounts/{id} returns the account."""
    # Create first
    create_resp = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Fetch Test", "type": "cash_wallet", "currency": "USD"},
    )
    assert create_resp.status_code == 201
    account_id = create_resp.json()["data"]["id"]

    resp = await api_client.get(f"/api/v1/accounts/{account_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == account_id


@pytest.mark.asyncio
async def test_delete_account(api_client: AsyncClient) -> None:
    """DELETE /api/v1/accounts/{id} soft-deletes and returns 204."""
    create_resp = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Delete Test", "type": "cash_wallet", "currency": "EGP"},
    )
    assert create_resp.status_code == 201
    account_id = create_resp.json()["data"]["id"]

    del_resp = await api_client.delete(f"/api/v1/accounts/{account_id}")
    assert del_resp.status_code == 204

    # Should no longer appear in list
    list_resp = await api_client.get("/api/v1/accounts")
    ids = [a["id"] for a in list_resp.json()["data"]]
    assert account_id not in ids


@pytest.mark.asyncio
async def test_get_nonexistent_account(api_client: AsyncClient) -> None:
    """GET /api/v1/accounts/999999 returns 404."""
    resp = await api_client.get("/api/v1/accounts/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_request() -> None:
    """Requests without auth token return 401."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/accounts")
        assert resp.status_code == 401
```

- [ ] **Step 2: Commit**

```bash
git add backend/tests/integration/test_accounts_api.py
git commit -m "test(backend): add accounts API integration tests"
```

---

### Task 3: Transactions & Transfers API Integration Tests

**Files:**
- Create: `backend/tests/integration/test_transactions_api.py`
- Create: `backend/tests/integration/test_transfers_api.py`

- [ ] **Step 1: Write transaction tests**

Create `backend/tests/integration/test_transactions_api.py`:
```python
"""Integration tests for /api/v1/transactions endpoints."""
import pytest
from httpx import AsyncClient
from datetime import date


@pytest_asyncio.fixture
async def test_account_id(api_client: AsyncClient) -> int:
    """Create a throwaway account for transaction tests."""
    resp = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Tx Test Account", "type": "bank_account", "currency": "EGP"},
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_list_transactions(api_client: AsyncClient, test_account_id: int) -> None:
    """GET /api/v1/transactions returns 200 with envelope."""
    resp = await api_client.get(
        "/api/v1/transactions", params={"account_id": test_account_id}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body


@pytest.mark.asyncio
async def test_create_transaction(api_client: AsyncClient, test_account_id: int) -> None:
    """POST /api/v1/transactions creates a transaction."""
    payload = {
        "account_id": test_account_id,
        "date": str(date.today()),
        "description": "Test Purchase",
        "amount_minor": -50000,
        "type": "debit",
        "currency": "EGP",
    }
    resp = await api_client.post("/api/v1/transactions", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["amount_minor"] == -50000
    assert body["data"]["account_id"] == test_account_id


@pytest.mark.asyncio
async def test_delete_transaction(api_client: AsyncClient, test_account_id: int) -> None:
    """DELETE /api/v1/transactions/{id} soft-deletes and returns 204."""
    create_resp = await api_client.post(
        "/api/v1/transactions",
        json={
            "account_id": test_account_id,
            "date": str(date.today()),
            "amount_minor": -10000,
            "type": "debit",
            "currency": "EGP",
        },
    )
    assert create_resp.status_code == 201
    tx_id = create_resp.json()["data"]["id"]

    del_resp = await api_client.delete(f"/api/v1/transactions/{tx_id}")
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_transaction_filters(api_client: AsyncClient, test_account_id: int) -> None:
    """Query params (type, date_from) filter results correctly."""
    resp = await api_client.get(
        "/api/v1/transactions",
        params={"account_id": test_account_id, "type": "debit", "page": 1, "page_size": 10},
    )
    assert resp.status_code == 200
    for tx in resp.json()["data"]:
        assert tx["type"] == "debit"
```

Create `backend/tests/integration/test_transfers_api.py`:
```python
"""Integration tests for /api/v1/transfers endpoints."""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from datetime import date


@pytest_asyncio.fixture
async def two_accounts(api_client: AsyncClient):
    """Create two accounts for transfer tests."""
    acc1 = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Transfer From", "type": "bank_account", "currency": "EGP"},
    )
    acc2 = await api_client.post(
        "/api/v1/accounts",
        json={"name": "Transfer To", "type": "cash_wallet", "currency": "EGP"},
    )
    assert acc1.status_code == 201
    assert acc2.status_code == 201
    return acc1.json()["data"]["id"], acc2.json()["data"]["id"]


@pytest.mark.asyncio
async def test_list_transfers(api_client: AsyncClient) -> None:
    """GET /api/v1/transfers returns 200 with envelope."""
    resp = await api_client.get("/api/v1/transfers")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body


@pytest.mark.asyncio
async def test_create_transfer(api_client: AsyncClient, two_accounts) -> None:
    """POST /api/v1/transfers creates a transfer between two accounts."""
    from_id, to_id = two_accounts
    payload = {
        "from_account_id": from_id,
        "to_account_id": to_id,
        "amount_minor": 100000,
        "date": str(date.today()),
        "description": "Integration test transfer",
    }
    resp = await api_client.post("/api/v1/transfers", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert "transfer_id" in body["data"]
    assert body["data"]["source_amount"] == 100000
```

- [ ] **Step 2: Commit**

```bash
git add backend/tests/integration/test_transactions_api.py backend/tests/integration/test_transfers_api.py
git commit -m "test(backend): add transactions and transfers API integration tests"
```

---

### Task 4: Categories API Integration Test

**Files:**
- Create: `backend/tests/integration/test_categories_api.py`

- [ ] **Step 1: Write tests**

Create `backend/tests/integration/test_categories_api.py`:
```python
"""Integration tests for /api/v1/categories endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_categories(api_client: AsyncClient) -> None:
    """GET /api/v1/categories returns 200 with seeded predefined categories."""
    resp = await api_client.get("/api/v1/categories")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    # At least the 18 predefined categories should exist
    assert body["meta"]["total"] >= 18


@pytest.mark.asyncio
async def test_filter_categories_by_type(api_client: AsyncClient) -> None:
    """GET /api/v1/categories?type=expense returns only expense categories."""
    resp = await api_client.get("/api/v1/categories", params={"type": "expense"})
    assert resp.status_code == 200
    for cat in resp.json()["data"]:
        assert cat["type"] == "expense"


@pytest.mark.asyncio
async def test_predefined_categories_have_bilingual_names(api_client: AsyncClient) -> None:
    """All predefined categories have both name_en and name_ar."""
    resp = await api_client.get("/api/v1/categories")
    assert resp.status_code == 200
    for cat in resp.json()["data"]:
        if cat["is_predefined"]:
            assert cat["name_en"], f"Category {cat['id']} missing name_en"
            assert cat["name_ar"], f"Category {cat['id']} missing name_ar"
```

- [ ] **Step 2: Commit**

```bash
git add backend/tests/integration/test_categories_api.py
git commit -m "test(backend): add categories API integration tests"
```

---

### Task 5: CI — Add Integration Test Job to backend.yml

**Files:**
- Modify: `.github/workflows/backend.yml`

- [ ] **Step 1: Read current backend.yml**

```bash
cat .github/workflows/backend.yml
```

- [ ] **Step 2: Add integration-tests job**

Add a second job `integration-tests` that runs after `test` passes. It uses the same steps but injects `SUPABASE_SERVICE_ROLE_KEY` from secrets and runs only integration tests:

```yaml
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install uv
        uses: astral-sh/setup-uv@v3

      - name: Install dependencies
        run: uv sync

      - name: Run integration tests
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_DATABASE_URL: ${{ secrets.DIRECT_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          APP_ENV: testing
        run: uv run pytest tests/integration/ -v --tb=short
```

**Note:** Add the following secrets to the GitHub repo before this job can run:
- `SUPABASE_URL` — already in `backend/.env`
- `SUPABASE_ANON_KEY` — already in `backend/.env`
- `SUPABASE_SERVICE_ROLE_KEY` — get from Supabase dashboard → Project Settings → API
- `DATABASE_URL` — already in `backend/.env`
- `DIRECT_DATABASE_URL` — already in `backend/.env`
- `JWT_SECRET` — already in `backend/.env`

- [ ] **Step 3: Verify existing unit tests still pass locally**

```bash
cd backend && uv run pytest tests/ --ignore=tests/integration -v 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/backend.yml
git commit -m "ci(backend): add integration-tests job using Supabase service role key"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run integration tests locally**

With the real `backend/.env` in place:
```bash
cd backend && uv run pytest tests/integration/ -v --tb=short
```

Expected: All tests pass. Clean up happens automatically (test user deleted after session).

- [ ] **Step 2: Verify unit tests unaffected**

```bash
cd backend && uv run pytest tests/ --ignore=tests/integration -v 2>&1 | tail -5
```

Expected: Same pass rate as before.

- [ ] **Step 3: Add GitHub secrets**

In the GitHub repo settings, add these repository secrets (values from `backend/.env`):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `JWT_SECRET`

- [ ] **Step 4: Push and verify CI**

```bash
git push
```

Open the Actions tab and confirm both `test` and `integration-tests` jobs pass on the push.
