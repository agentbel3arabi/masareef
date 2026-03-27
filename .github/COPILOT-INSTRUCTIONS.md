# Copilot Coding Agent Instructions — Masareef

This file is auto-loaded by GitHub Copilot for every task assigned to this repository.
Follow every rule here without exception.

---

## 1. Tech Stack (non-negotiable)

**Backend**
- Python 3.12
- FastAPI — all route handlers must be `async def`
- Pydantic V2 — all request/response schemas use Pydantic `BaseModel`
- SQLAlchemy (async) — all DB interactions use `AsyncSession`, never synchronous sessions
- uv — dependency management (`pyproject.toml` + `uv.lock`); never run `pip install` directly

**Frontend**
- Next.js 14.2.x with **App Router** (`app/` directory) — do not use Pages Router
- TypeScript in strict mode — no `any`, no implicit `any`
- shadcn/ui components — always prefer these over custom UI primitives
- Tailwind CSS — all styling via Tailwind classes
- pnpm — never run `npm install` or `yarn`

---

## 2. Money Rules

- All monetary amounts are stored and passed as **integers in minor units** (e.g. EGP: centimes, 1,250.00 EGP = `125000`)
- **Never use floats for money** — no exceptions
- Currency exponent from the canonical config determines the divisor:

```python
CURRENCIES = {
    "EGP": {"exponent": 2},  # 125000 → 1,250.00
    "USD": {"exponent": 2},
    "EUR": {"exponent": 2},
    "GBP": {"exponent": 2},
    "SAR": {"exponent": 2},
    "AED": {"exponent": 2},
    "KWD": {"exponent": 3},  # 125000 → 125.000
}
```

---

## 3. Household Scoping (mandatory)

- Every table with user data has a `household_id` column
- **Every query must include `household_id`** — never fetch data without it
- Supabase RLS policies exist as a safety net, but application-layer scoping is required (defense in depth)
- All FastAPI routes receive `household_id` via `Depends(get_household_id)`

---

## 4. Soft Delete Rules

- All user-facing tables have `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- **Never hard-delete user data** — always set `is_active = FALSE`
- All queries filter `WHERE is_active = TRUE` at the application layer

---

## 5. API Conventions

- All routes: `/api/v1/<resource>` (kebab-case for multi-word, e.g. `/api/v1/exchange-rates`)
- Success envelope:
  ```json
  { "data": {...}, "meta": { "total": 150, "page": 1, "page_size": 50 } }
  ```
- Error envelope:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
  ```
- HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 500
- Pagination params: `page` (1-indexed, default 1), `page_size` (default 50, max 100)

---

## 6. Dependency Injection Pattern

```python
@router.get("/api/v1/accounts")
async def list_accounts(
    session: AsyncSession = Depends(get_db_session),
    household_id: UUID = Depends(get_household_id),
):
    return await account_service.list_accounts(session, household_id)
```

- Service functions are pure business logic — no FastAPI imports, no HTTP awareness
- Services receive `session` and `household_id` as plain parameters

---

## 7. Schema Source of Truth

- **`docs/02-data-models.md`** owns all table definitions — do not invent columns
- **Feature files in `docs/03-features/`** own API contracts (request/response shapes, behavior)
- If a feature spec references a table, that is a pointer to `02-data-models.md`, not a redefinition

---

## 8. Arabic-First UI

- UI is designed for RTL first; all strings need both Arabic and English
- Never treat Arabic as a translation afterthought — it is the primary language
- Use `dir="rtl"` on root layout; Arabic text in `font-arabic` or equivalent Tailwind class

---

## 9. Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| Python files | `snake_case` | `account_service.py` |
| Python functions/vars | `snake_case` | `compute_balance()` |
| Python classes | `PascalCase` | `AccountService` |
| TypeScript vars/functions | `camelCase` | `formatAmount()` |
| TypeScript components/types | `PascalCase` | `AccountCard` |
| API routes | `kebab-case` | `/api/v1/exchange-rates` |
| DB tables | `snake_case`, plural | `transactions` |
| DB columns | `snake_case` | `amount_minor`, `household_id` |

---

## 10. CI Checks (must pass before PR is ready)

**Backend** (`uv run` prefix):
1. `ruff check .` — linting must be clean
2. `ruff format --check .` — formatting must match
3. `pyright` — no type errors
4. `pytest` — all tests pass

**Frontend**:
1. `pnpm lint` — ESLint clean
2. `pnpm exec tsc --noEmit` — no type errors
3. `pnpm build` — build must succeed

Do not open a PR unless all applicable checks pass.

---

## 11. File Placement

- Backend new modules: `backend/app/<feature>/` (router, service, schemas, models)
- Frontend new pages: `frontend/app/<feature>/page.tsx`
- Frontend new components: `frontend/components/<Feature>/<ComponentName>.tsx`

---

## 12. Branch & Commit Style

- Branch: `feature/N-short-slug`, `fix/N-short-slug`, `chore/short-slug`
- Commits: Conventional Commits — `feat(scope): subject`, `fix(scope): subject`, etc.
- Squash merge to `main` — keep commits clean on the feature branch

---

## 13. What NOT to Do

- Never use floats for money
- Never hard-delete user data
- Never query without `household_id`
- Never run `npm install` (use `pnpm`) or `pip install` (use `uv add`)
- Never use Next.js 15 — pin to 14.2.x
- Never use Pages Router — always App Router
- Never use synchronous SQLAlchemy sessions
- Never add a column to a table without consulting `docs/02-data-models.md`
