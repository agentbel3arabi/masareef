# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- Python files: `snake_case` (e.g., `account_service.py`, `account.py`)
- TypeScript/TSX files: `kebab-case` for pages/components in directories, PascalCase for exported component names
  - Example: `landing-hero.tsx` exports `LandingHero` component
  - Service modules: `kebab-case` (e.g., `api-client.ts`, `query-client.ts`)

**Functions and Variables:**
- Python: `snake_case` (e.g., `compute_balance()`, `get_account()`, `validate_institution()`)
- TypeScript: `camelCase` (e.g., `formatAmount()`, `parseAmountMinor()`, `getAuthHeaders()`)
- Private/internal functions: prefix with underscore (Python: `_helper_func()`, TypeScript: avoided in favor of module scope)

**Types and Classes:**
- Python classes: `PascalCase` (e.g., `Account`, `AccountService`, `ErrorDetail`)
- TypeScript types/interfaces: `PascalCase` (e.g., `ApiErrorBody`, `ApiResponse<T>`)
- TypeScript components: `PascalCase` (e.g., `LandingHero`, `AppShell`, `Button`)

**API Routes:**
- Prefix: `/api/v1/`
- Path segments: `kebab-case` (e.g., `/api/v1/accounts`, `/api/v1/import-templates`, `/api/v1/financial-institutions`)

**Database:**
- Tables: `snake_case`, plural (e.g., `accounts`, `transactions`, `debt_payments`)
- Columns: `snake_case` (e.g., `amount_minor`, `household_id`, `is_active`)
- Enums: stored as string values in database (e.g., `bank_account`, `credit_card`)

## Code Style

**Formatting (Backend):**
- Tool: **ruff** (linter + formatter)
- Line length: 100 characters
- Target: Python 3.12
- Config file: `backend/pyproject.toml` → `[tool.ruff]` section
- Rules enforced: E (errors), F (PyFlakes), I (isort imports), UP (upgrades)

**Formatting (Frontend):**
- Tool: **ESLint** with Next.js + TypeScript configs
- Config: `frontend/eslint.config.mjs` extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Run: `pnpm lint`

**Type Checking (Backend):**
- Tool: **pyright**
- Mode: `basic` type checking
- Config: `backend/pyproject.toml` → `[tool.pyright]` section
- Run: `pyright` from backend directory

**Type Checking (Frontend):**
- Tool: **TypeScript** (strict mode)
- Config: `frontend/tsconfig.json` with `strict: true`
- Run: `pnpm exec tsc --noEmit` or part of build pipeline

## Import Organization

**Backend (Python):**
Order imports in this sequence:
1. Standard library (e.g., `import uuid`, `from datetime import date`)
2. Third-party (e.g., `from fastapi import APIRouter`, `from sqlalchemy import select`)
3. Local application (e.g., `from app.models.account import Account`, `from app.schemas.account import AccountCreate`)

Enforce with ruff import sorting.

Example from `app/routers/accounts.py`:
```python
import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_household_id
from app.dependencies_rbac import get_member_role, require_role
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountDetailResponse
from app.services import account as account_service
```

**Frontend (TypeScript):**
Order imports in this sequence:
1. React and Next.js imports
2. Third-party libraries (utilities, UI frameworks)
3. Local imports with path aliases (`@/lib`, `@/components`, `@/contexts`)
4. Type imports (use `import type` for types-only)

Example from `frontend/src/components/landing/landing-hero.tsx`:
```typescript
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart, Briefcase, Phone, Users } from "lucide-react";
```

**Path Aliases:**
- Backend: No aliases; use relative or absolute imports from `app/`
- Frontend: `@/*` maps to `frontend/src/` (configured in `frontend/tsconfig.json`)

## Error Handling

**Backend Patterns:**
- HTTP errors use `HTTPException(status_code=..., detail=...)` from FastAPI
- Error responses follow envelope format:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable message",
      "details": [...]
    }
  }
  ```
- Schema for error responses: `ErrorResponse` in `app/schemas/common.py` containing `ErrorDetail`
- HTTP status codes:
  - 200: Success (GET, PUT, PATCH)
  - 201: Created (POST resource)
  - 204: No content (DELETE)
  - 400: Bad request (validation errors)
  - 401: Unauthorized (missing/invalid auth)
  - 403: Forbidden (auth valid but lacks permission)
  - 404: Not found (resource doesn't exist or wrong household)
  - 409: Conflict (duplicate, soft-delete reversal)
  - 422: Unprocessable entity (Pydantic validation)
  - 500: Server error

Example from `app/routers/accounts.py`:
```python
if not account:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=ErrorResponse(
            error=ErrorDetail(code="NOT_FOUND", message="Account not found")
        ).model_dump(),
    )
```

**Frontend Patterns:**
- Custom `ApiError` class wraps HTTP errors with typed code/status/details
- Async operations handle errors via try-catch or `.catch()` chains
- API calls defined in `lib/api-client.ts` with consistent error handling
- Error body structure parsed from either `response.error` or `response.detail.error`

Example from `frontend/src/lib/api-client.ts`:
```typescript
async function handleError(res: Response): Promise<never> {
  let body: ApiErrorBody = { code: "UNKNOWN_ERROR", message: `API error: ${res.status}` };
  try {
    const json = await res.json();
    if (json?.error) body = json.error;
    else if (json?.detail?.error) body = json.detail.error;
  } catch {
    // intentional: non-JSON error responses fall back to UNKNOWN_ERROR body
  }
  throw new ApiError(res.status, body);
}
```

## Logging

**Backend:**
- Framework: Python's `logging` module (stdlib)
- Logger name: `__name__` for module-level logger
- Pattern: `logger.info()`, `logger.warning()`, `logger.error()` for operational events
- No print statements; use logging exclusively

Example from `app/main.py`:
```python
logger = logging.getLogger(__name__)
logger.warning("Failed to load Settings — falling back to localhost CORS: %s", e)
```

**Frontend:**
- Framework: `console` methods (`console.log()`, `console.error()`, `console.warn()`)
- Used sparingly; client-side errors typically show toast notifications via `sonner`
- No logging library in use (keep lean for browser)

## Comments

**When to Comment:**
- Document non-obvious algorithm logic or workarounds
- Explain why a decision was made, not what the code does (the code itself shows what)
- Flag limitations or future improvements (prefer TODO comments if actionable)

**JSDoc/TSDoc:**
- Python: Use docstrings for public functions (triple-quote format)
- TypeScript: Use JSDoc for exported functions and complex types

Example from `backend/app/routers/accounts.py`:
```python
async def _build_account_response(
    session: AsyncSession,
    account: Account,
    ...
) -> dict:
    """Build account response dict with optional institution embed.

    If institution_embed is not provided, it will be fetched from the DB.
    Callers should pre-load institutions in bulk for list endpoints.
    """
```

Example from `frontend/src/lib/money.ts`:
```typescript
/**
 * Format minor units to display string.
 * formatAmount(125000, "EGP") → "1,250.00"
 * formatAmount(125000, "KWD") → "125.000"
 */
export function formatAmount(amountMinor: number, currency: string): string {
```

## Function Design

**Size:**
- Prefer functions under 50 lines
- Break complex logic into smaller helpers with clear names
- Use leading underscores for private helpers (Python: `_helper()`, TypeScript: function in module scope)

**Parameters:**
- Backend: Pass plain values to services (no HTTP awareness); routers handle dependency injection
- Frontend: Use function parameters over closure captures when possible
- Async operations: Clearly mark with `async def` (Python) or `async function` (TypeScript)

**Return Values:**
- Pydantic models (Python): Use `.model_dump()` for serialization (never `.dict()`)
- TypeScript: Return typed objects matching interface definitions
- Error cases: Raise exceptions; don't return error objects alongside data

## Module Design

**Exports:**
- Python: Each module exports a single logical unit (e.g., `account.py` exports account-related functions)
- TypeScript: Prefer named exports over default exports for clarity

Example from `frontend/src/lib/money.ts`:
```typescript
export function formatAmount(amountMinor: number, currency: string): string { ... }
export function formatAmountAr(amountMinor: number, currency: string): string { ... }
export function formatWithCurrency(amountMinor: number, currency: string): string { ... }
```

**Barrel Files:**
- Backend: Not used; direct imports from submodules
- Frontend: Minimal use; only for component UI library (e.g., `components/ui/`)

## Async/Await Patterns

**Backend:**
- All database calls use async/await with `AsyncSession`
- All route handlers are `async def`
- All services accept `AsyncSession` and use `await` for DB operations

Example from `backend/app/routers/accounts.py`:
```python
async def list_accounts(
    page: int = Query(1, ge=1),
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
):
    # All service calls are awaited
    accounts = await account_service.list_accounts(session, household_id, page, page_size)
```

**Frontend:**
- Use `async/await` for API calls and Supabase operations
- Wrap API calls in React Query `useQuery` or `useMutation` for caching/state management
- Do not use `.then()` chains; prefer async/await

## Money Representation

**Critical Rule: Integer Minor Units Only**
- All monetary amounts are stored and passed as integers representing minor units
- Never use floats for money calculations
- Currency exponent determines divisor (EGP: 2 → 125000 = 1,250.00; KWD: 3 → 125000 = 125.000)

**Backend Examples:**
```python
# Transaction.amount_minor is stored as signed integer
# Debit: -50000 (expense)
# Credit: +50000 (income)

# Splits and debt payments: always absolute positive integers
debt_payment.amount_minor = 50000  # Never negative
```

**Frontend Examples:**
```typescript
// formatAmount(125000, "EGP") → "1,250.00"
// parseMajorToMinor("1250.50", 2) → 125050
// Never: const amount = 1250.50 (float)
```

## Pydantic V2 Patterns

- Use `model_dump()` exclusively for serialization (V1's `.dict()` is forbidden)
- Use `model_config = {"from_attributes": True}` to map ORM models to Pydantic responses
- All schema classes inherit from `BaseModel`
- Field validation via `Field()` with constraints (e.g., `Field(max_length=3)`)

Example from `backend/app/schemas/account.py`:
```python
class AccountCreate(BaseModel):
    name: str
    name_ar: str | None = None
    currency: str = Field(max_length=3)
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)

class AccountResponse(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}
```

## Soft Delete Pattern

- Every user-facing table has `is_active: bool` column (default `True`)
- All application queries filter `WHERE is_active = TRUE`
- Never hard-delete; set `is_active = FALSE`
- `SoftDeleteMixin` in `app/models/base.py` provides the column definition

## Dependency Injection Pattern

**Backend:**
All FastAPI route handlers use `Depends()` to inject dependencies:
```python
async def get_accounts(
    session: AsyncSession = Depends(get_db_session),
    household_id: uuid.UUID = Depends(get_household_id),
    role: HouseholdRole = Depends(get_member_role),
):
    # Service functions receive plain values, no HTTP awareness
    return await account_service.list_accounts(session, household_id)
```

Dependencies defined in `app/dependencies.py` and `app/dependencies_rbac.py`:
- `get_db_session()`: Provides SQLAlchemy AsyncSession
- `get_current_user()`: Extracts user_id from Supabase JWT
- `get_household_id()`: Returns user's household_id
- `get_member_role()`: Returns user's role in household

---

*Convention analysis: 2026-04-07*
