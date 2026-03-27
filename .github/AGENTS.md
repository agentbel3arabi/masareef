# Agent Instructions — Masareef

Supplementary guidance for the GitHub Copilot coding agent.
See `COPILOT-INSTRUCTIONS.md` for full coding rules.

---

## Tooling Commands

### Backend (always inside `backend/`)
```bash
uv sync                                   # install dependencies
uv add <pkg>                              # add dependency
uv run pytest                             # run tests
uv run ruff check .                       # lint
uv run ruff format --check .              # format check
uv run uvicorn app.main:app --reload      # dev server
uv run pyright                            # Type check
uv run alembic upgrade head              # Run migrations
uv run alembic revision --autogenerate -m "description"  # Generate migration
```
**Never** run `pip install` — use `uv add` only.

### Frontend (always inside `frontend/`)
```bash
pnpm install                              # install dependencies
pnpm add <pkg>                            # add dependency
pnpm dev                                  # dev server
pnpm build                                # production build
pnpm lint                                 # ESLint
pnpm exec tsc --noEmit                    # type check
pnpm dlx shadcn@latest add <component>   # Add shadcn component
```
**Never** run `npm install` or `yarn` — use `pnpm` only.

---

## File Placement

| What | Where |
|---|---|
| New backend feature | `backend/app/<feature>/router.py`, `service.py`, `schemas.py`, `models.py` |
| New API test | `backend/tests/<feature>/test_<feature>.py` |
| New frontend page | `frontend/app/<feature>/page.tsx` |
| New frontend component | `frontend/components/<Feature>/<Name>.tsx` |
| New frontend hook | `frontend/hooks/use-<name>.ts` |
| Shared types | `frontend/types/<name>.ts` |

---

## File Conventions

- Python files: `snake_case.py`
- TypeScript files: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- Test files: `test_<module>.py` (backend), mirror the source structure
- API routes: `kebab-case` (e.g., `/api/v1/exchange-rates`)

---

## Before Opening a PR

Run all applicable checks locally:

```bash
# Backend
cd backend
uv run ruff check .
uv run ruff format --check .
uv run pytest

# Frontend
cd frontend
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Only open the PR when all checks pass.

---

## Branch & Commit Naming

- Feature branch: `feature/<issue-number>-<short-slug>`
- Bug fix branch: `fix/<issue-number>-<short-slug>`
- Maintenance: `chore/<short-slug>`

Commit format (Conventional Commits):
```
feat(accounts): add soft-delete endpoint
fix(transactions): correct balance reversal on delete
chore(deps): bump pydantic to 2.7.1
```

---

## Playwright MCP (Browser Testing)

Playwright MCP is **enabled by default** — no extra configuration needed. It gives you browser automation tools restricted to localhost.

### Using Playwright MCP for Validation

1. Start both dev servers:
```bash
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev &
sleep 10
```

2. Use Playwright MCP tools to navigate to `http://localhost:3000` and interact with the app.

3. Verify:
   - Pages load without errors
   - RTL layout is correct (Arabic text, sidebar on right)
   - Forms submit and data appears
   - Dark/light mode toggle works
   - Balance updates after creating/deleting transactions

### Running E2E Tests

```bash
# Python E2E tests (requires running dev servers)
cd backend && uv run pytest tests/e2e/ -v

# Frontend E2E (if using Playwright for frontend)
cd frontend && pnpm exec playwright test
```

---

## Do Not

- Modify `docs/02-data-models.md` unless the issue explicitly requires a schema change
- Add columns that are not in `docs/02-data-models.md`
- Use synchronous SQLAlchemy (`Session` instead of `AsyncSession`)
- Import FastAPI types inside service files
- Use `any` type in TypeScript
- Commit `.env` files or secrets
- Commit `backend/.venv/`, `frontend/node_modules/`, or `frontend/.next/`
- Modify `CLAUDE.md` — it is the canonical source of truth
- Create `package-lock.json` — pnpm only
- Use Pydantic V1 syntax (`model.dict()`, `schema()`)
- Use physical CSS direction classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`)
- Use floats for money — all amounts are integer minor units
- Skip `household_id` in any database query
