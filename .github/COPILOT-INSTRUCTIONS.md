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

## 13. Playwright MCP — Visual Validation & E2E Testing

Playwright MCP is enabled by default for this repository. Use it to validate UI changes by interacting with the running app in the browser.

### Starting Dev Servers

Before using Playwright MCP, start both servers:
```bash
# Terminal 1: Backend API (port 8000)
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Terminal 2: Frontend (port 3000)
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev &

# Wait for servers to be ready
sleep 10
```

### What to Validate with Playwright MCP

After implementing UI changes, use Playwright MCP to verify:

1. **Page loads correctly** — navigate to the relevant page, check for errors
2. **RTL layout** — Arabic text flows right-to-left, sidebar on the right side
3. **Dark mode** — toggle theme, verify all components render correctly in both modes
4. **Data flows** — create an account → add transaction → verify balance updates
5. **Forms work** — fill and submit forms, verify success/error states
6. **Responsive layout** — resize viewport, verify mobile vs desktop layouts

### Playwright MCP Tips

- Use **accessibility snapshots** (default) rather than screenshots for element interaction
- Use `getByRole()`, `getByText()`, `getByTestId()` for stable locators
- Playwright MCP is restricted to **localhost only** — this is expected
- Always wait for network requests to complete before asserting on page content

### Writing Playwright E2E Tests (Python)

The backend test suite includes E2E tests using Python Playwright (`backend/tests/e2e/`):

```python
# backend/tests/e2e/test_accounts_flow.py
import pytest
from playwright.async_api import async_playwright

@pytest.mark.asyncio
async def test_accounts_page_loads():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:3000/accounts")
        await page.wait_for_selector("h1")
        title = await page.text_content("h1")
        assert "الحسابات" in title or "Accounts" in title
        await browser.close()
```

---

## 14. CSS Logical Properties (RTL/LTR)

Physical directional CSS classes are **strictly forbidden**. The app must work in both RTL (Arabic) and LTR (English).

| BANNED | USE INSTEAD |
|--------|-------------|
| `pl-4`, `pr-4` | `ps-4`, `pe-4` |
| `ml-2`, `mr-2` | `ms-2`, `me-2` |
| `left-0`, `right-0` | `start-0`, `end-0` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `border-l`, `border-r` | `border-s`, `border-e` |
| `rounded-l`, `rounded-r` | `rounded-s`, `rounded-e` |

---

## 15. Unit Execution Workflow (mandatory)

Every work unit follows these steps — no exceptions:

1. **Read handoff** — check `docs/superpowers/handoff/` for the prior unit's note before writing any code
2. **Branch** — cut `feature/N-short-slug` (or `fix/`, `chore/`) from `main`; never commit implementation directly to `main`
3. **Execute** — TDD: tests first, then implementation; commit frequently with Conventional Commits format
4. **Push** — `git push -u origin feature/N-short-slug`
5. **PR** — open a Pull Request: concise title, 2–3 bullet summary, link to plan file, any deviations from spec
6. **Copilot review** — request Copilot review via GitHub UI (Reviewers → gear → "Request Copilot review"); do **not** merge until review is complete and all blocking issues are resolved
7. **UAT** — run through `docs/guides/12-uat-template.md` after CI passes and Copilot review is approved
8. **Squash merge** — merge via GitHub UI "Squash and merge" only; head branch auto-deletes
9. **Handoff note** — create `docs/superpowers/handoff/phase-N-unit-X.md` using `docs/handoff-template.md`; commit directly to `main` and push

**Branch naming:**
- `feature/N-short-slug` — new features
- `fix/N-short-slug` — bug fixes
- `chore/short-slug` — tooling / deps (no N- prefix)

**Merge blockers** — do not merge if:
- CI is not passing
- Copilot review is incomplete or has unresolved blocking issues
- UAT found critical bugs

---

## 16. What NOT to Do

- Never use floats for money
- Never hard-delete user data
- Never query without `household_id`
- Never run `npm install` (use `pnpm`) or `pip install` (use `uv add`)
- Never use Next.js 15 — pin to 14.2.x
- Never use Pages Router — always App Router
- Never use synchronous SQLAlchemy sessions
- Never add a column to a table without consulting `docs/02-data-models.md`
