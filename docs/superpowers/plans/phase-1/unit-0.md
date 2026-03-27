# Unit 0: GitHub Repository Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure the GitHub repository with branch protection, CI/CD workflows, PR template, issue template, and GitHub Copilot coding agent instructions — so every subsequent work unit has automated quality gates and code review.

**Architecture:** Two CI workflows (backend + frontend) with path filtering. Branch protection requires PR + passing CI before merge. Copilot instructions teach the agent Masareef's conventions so it can review PRs and work on issues effectively.

**Tech Stack:** GitHub Actions, GitHub Copilot Coding Agent

**Required reading:** `CLAUDE.md` (Sections H, I, J)

---

## File Structure

```
.github/
├── workflows/
│   ├── backend.yml                    # Backend CI: ruff, pyright, pytest
│   └── frontend.yml                   # Frontend CI: lint, tsc, build
├── COPILOT-INSTRUCTIONS.md            # Copilot coding agent instructions
├── AGENTS.md                          # Copilot tooling rules
├── ISSUE_TEMPLATE/
│   └── feature.md                     # Issue template for features
└── pull_request_template.md           # PR template
```

---

### Task 1: Backend CI Workflow

**Files:**
- Create: `.github/workflows/backend.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/backend.yml`:
```yaml
name: Backend CI

on:
  push:
    branches: [main]
    paths: ['backend/**']
  pull_request:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          version: "latest"

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: uv sync

      - name: Lint (ruff check)
        run: uv run ruff check .

      - name: Format check (ruff format)
        run: uv run ruff format --check .

      - name: Type check (pyright)
        run: uv run pyright

      - name: Run tests
        run: uv run pytest -v --tb=short
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/backend.yml
git commit -m "ci(backend): add GitHub Actions workflow for lint, typecheck, and tests"
```

---

### Task 2: Frontend CI Workflow

**Files:**
- Create: `.github/workflows/frontend.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/frontend.yml`:
```yaml
name: Frontend CI

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - name: Enable corepack
        run: corepack enable

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm exec tsc --noEmit

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
          NEXT_PUBLIC_API_URL: http://localhost:8000
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/frontend.yml
git commit -m "ci(frontend): add GitHub Actions workflow for lint, typecheck, and build"
```

---

### Task 3: PR Template

**Files:**
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Create the template**

Create `.github/pull_request_template.md`:
```markdown
## Summary

<!-- 1-3 bullet points describing what this PR does -->

## Changes

<!-- List the key changes made -->

## Related

<!-- Link to issue, spec, or plan file -->
- Plan: `docs/superpowers/plans/phase-N/unit-X.md`
- Spec: `docs/03-features/xxx.md`

## Testing

- [ ] All existing tests pass (`uv run pytest` / `pnpm build`)
- [ ] New tests added for new functionality
- [ ] Manual verification done (describe below)

## Checklist

- [ ] Money is integer minor units (no floats)
- [ ] All queries include `household_id` and `is_active = TRUE`
- [ ] API responses use standard envelope (`data` + `meta` or `error`)
- [ ] No physical CSS directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`)
- [ ] Pydantic uses `model_dump()` (not `.dict()`)
- [ ] No features added beyond what the spec requires
```

- [ ] **Step 2: Commit**

```bash
git add .github/pull_request_template.md
git commit -m "chore: add PR template with Masareef-specific checklist"
```

---

### Task 4: Issue Template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature.md`

- [ ] **Step 1: Create the template**

Create `.github/ISSUE_TEMPLATE/feature.md`:
```markdown
---
name: Feature
about: Request a feature implementation for Masareef
title: "[Phase N] Short description"
labels: feature
assignees: ''
---

## Context

<!-- Which phase/unit does this belong to? Link the plan file. -->
- Phase: N
- Work unit: unit-X
- Plan: `docs/superpowers/plans/phase-N/unit-X.md`

## Description

<!-- What needs to be built? Reference the feature spec if applicable. -->

## Acceptance Criteria

<!-- Copy from the feature spec or plan file -->
- [ ] Criterion 1
- [ ] Criterion 2

## Required Reading

<!-- List the docs the implementer should read before starting -->
- `CLAUDE.md`
- `docs/03-features/xxx.md`

## Notes

<!-- Any additional context, constraints, or decisions -->
```

- [ ] **Step 2: Commit**

```bash
git add .github/ISSUE_TEMPLATE/feature.md
git commit -m "chore: add feature issue template with phase/unit linking"
```

---

### Task 5: GitHub Copilot Instructions

**Files:**
- Create: `.github/COPILOT-INSTRUCTIONS.md`

- [ ] **Step 1: Create Copilot instructions**

Create `.github/COPILOT-INSTRUCTIONS.md`:
```markdown
# Copilot Coding Agent Instructions — Masareef

You are working on Masareef (مصاريف), an AI-powered personal finance platform for Egyptian/MENA users.

## Before You Start

1. Read `CLAUDE.md` at the repo root — it contains all coding conventions, API patterns, and rules.
2. Read the relevant feature spec in `docs/03-features/` for the feature you're working on.
3. Read `docs/02-data-models.md` if your work involves database schemas.

## Critical Rules

### Money
- All monetary amounts are **BIGINT in minor units** (piasters/cents). Never use floats.
- Use `int` in Python, `number` in TypeScript. Never `float` or `decimal`.
- Format for display using `services/money.py` (backend) or `lib/money.ts` (frontend).

### Database
- Every query MUST include `household_id` filtering.
- Every query on user-facing tables MUST include `WHERE is_active = TRUE`.
- Soft delete only — never hard-delete user data.
- Use `model.model_dump()` (Pydantic v2). Never `model.dict()`.

### API
- All routes prefixed with `/api/v1/`.
- Success: `{"data": ..., "meta": {...}}`.
- Error: `{"error": {"code": "...", "message": "...", "details": [...]}}`.
- HTTP status: 200 (OK), 201 (created), 204 (deleted), 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found).

### Frontend
- **CSS logical properties only.** Physical directional classes are FORBIDDEN:
  - BANNED: `pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`, `text-left`, `text-right`
  - USE: `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end`
- Use shadcn/ui components. Use TanStack Query for all server state.
- Use `next-intl` for all i18n. Arabic is the primary locale.

### Architecture
- FastAPI backend: services are pure business logic (no HTTP awareness).
- Services receive `session` + `household_id` as plain parameters via dependency injection.
- All mutations go through FastAPI — no direct Supabase PostgREST calls from frontend.

### Testing
- Backend: pytest with pytest-asyncio. Every endpoint needs at minimum: happy path, auth failure (401), wrong household (404), validation error (400).
- Run `uv run pytest` (backend) and `pnpm build` (frontend) before submitting.

## Workflow

1. Read the issue description and linked plan file.
2. Create a feature branch: `feature/N-short-slug` or `fix/N-short-slug`.
3. Implement following the plan's task-by-task steps.
4. Write tests before or alongside implementation.
5. Run the full test suite.
6. Open a PR using the PR template.
```

- [ ] **Step 2: Commit**

```bash
git add .github/COPILOT-INSTRUCTIONS.md
git commit -m "docs: add GitHub Copilot coding agent instructions with Masareef conventions"
```

---

### Task 6: Copilot Tooling Rules (AGENTS.md)

**Files:**
- Create: `.github/AGENTS.md`

- [ ] **Step 1: Create AGENTS.md**

Create `.github/AGENTS.md`:
```markdown
# Agent Tooling Rules

## Package Managers

- **Backend:** Use `uv` exclusively. Never `pip install`. Lock file: `backend/uv.lock`.
- **Frontend:** Use `pnpm` exclusively. Never `npm install`. Lock file: `frontend/pnpm-lock.yaml`.

## Commands

### Backend
```bash
cd backend
uv sync                          # Install dependencies
uv run pytest -v                 # Run tests
uv run ruff check .              # Lint
uv run ruff format .             # Format
uv run pyright                   # Type check
uv run alembic upgrade head      # Run migrations
uv run alembic revision --autogenerate -m "description"  # Generate migration
uv run uvicorn app.main:app --reload  # Dev server
```

### Frontend
```bash
cd frontend
pnpm install                     # Install dependencies
pnpm build                       # Production build
pnpm dev                         # Dev server
pnpm lint                        # Lint
pnpm exec tsc --noEmit           # Type check
pnpm dlx shadcn@latest add <component>  # Add shadcn component
```

## File Conventions

- Python files: `snake_case.py`
- TypeScript files: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- Test files: `test_<module>.py` (backend), mirror the source structure
- API routes: `kebab-case` (e.g., `/api/v1/exchange-rates`)

## Do Not

- Do not modify `CLAUDE.md` — it is the canonical source of truth.
- Do not create `package-lock.json` — pnpm only.
- Do not use Pydantic V1 syntax (`model.dict()`, `schema()`).
- Do not use physical CSS direction classes.
- Do not use floats for money.
- Do not skip `household_id` in any database query.
```

- [ ] **Step 2: Commit**

```bash
git add .github/AGENTS.md
git commit -m "docs: add AGENTS.md with tooling rules for Copilot coding agent"
```

---

### Task 7: Configure Repository Settings (Manual Steps)

These settings must be configured in the GitHub UI. Claude cannot do this programmatically.

- [ ] **Step 1: Enable branch protection on `main`**

Go to: Repository → Settings → Branches → Add rule

Configure:
- Branch name pattern: `main`
- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Add: `Backend CI / test` and `Frontend CI / build`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

- [ ] **Step 2: Configure merge settings**

Go to: Repository → Settings → General → Pull Requests

Configure:
- [x] Allow squash merging (set default commit message to "Pull request title")
- [ ] Allow merge commits — **uncheck**
- [ ] Allow rebase merging — **uncheck**
- [x] Automatically delete head branches

- [ ] **Step 3: Enable Copilot for the repository**

Go to: Repository → Settings → Copilot → Coding agent

- Enable "Copilot coding agent"
- Ensure `.github/COPILOT-INSTRUCTIONS.md` is detected

- [ ] **Step 4: Verify Copilot can review PRs**

Create a test branch, push a small change, open a PR. Verify:
- CI workflows trigger
- Copilot can be requested as a reviewer (click "Reviewers" → search "Copilot")
- PR template auto-populates

---

### Task 8: Verify CI Workflows Locally (Optional)

- [ ] **Step 1: Verify backend workflow commands**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/backend
uv sync && uv run ruff check . && uv run ruff format --check . && uv run pytest -v
```

Expected: All pass.

- [ ] **Step 2: Verify frontend workflow commands**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef/frontend
pnpm install && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```

Expected: All pass.

Note: These commands won't work yet since the frontend and backend haven't been created (that's Unit 1A+). This task verifies the CI config is syntactically correct. Actual CI runs happen after Unit 1A is implemented and pushed.
