---
name: phase-plan
description: Plan a Masareef implementation phase — loads roadmap context, cross-references feature specs, and produces a structured PLAN.md
argument-hint: "Please specify the phase number and name. For example: 'Plan Phase 2: Core Features' or 'Plan Phase 3: User Experience Improvements.'"
user-invocable: true
---

# Phase Planning

Use this skill to plan a single implementation phase. Output is a `PLAN.md` file that serves as the execution contract for that phase.

## Step 1: Load phase context

Load ALL of these:

1. `docs/05-roadmap.md` — find the phase section, read deliverables + success criteria + required reading list
2. Every feature spec listed under "Required Reading" for this phase (`docs/03-features/*.md`)
3. `docs/01-architecture.md` — system diagram, component responsibilities, auth flow
4. `docs/02-data-models.md` — if any schema work is in this phase

Also check: what was delivered in the previous phase? Look at the prior phase section in `05-roadmap.md`.

## Step 2: Identify the work

List every concrete deliverable this phase requires. Categorize them:

| Category | Examples |
|----------|---------|
| Database | Migrations, table changes, indexes, RLS policies |
| Backend | FastAPI routers, service functions, Pydantic schemas, tests |
| Frontend | Next.js pages, components, TanStack Query hooks, i18n strings |
| Config | Environment variables, Supabase settings, background jobs |
| Testing | Pytest fixtures, integration tests, frontend component tests |

## Step 3: Identify dependencies and order

For each deliverable, ask:
- Does it depend on a migration being applied first? (always: DB → backend → frontend)
- Does it depend on another feature being complete? (check prior phases)
- Can it be done in parallel with another task?

Output a dependency-ordered task list.

## Step 4: Write PLAN.md

Create `.planning/phase-{N}/PLAN.md` with this structure:

```markdown
# Phase N: [Name]

## Goal
One sentence. What does the user get at the end of this phase that they couldn't do before?

## Deliverables
From 05-roadmap.md, verbatim.

## Success Criteria
From 05-roadmap.md, verbatim.

## Pre-conditions
- [ ] List any dependencies that must be complete before starting (prior phase items, env setup, etc.)

## Task Breakdown

### Wave 1 — Database
- [ ] Migration: [describe]
- [ ] RLS policies: [describe]

### Wave 2 — Backend
- [ ] Router: `app/routers/[name].py` — [endpoints]
- [ ] Service: `app/services/[name].py` — [business logic]
- [ ] Schemas: `app/schemas/[name].py` — [Pydantic models]
- [ ] Tests: `tests/[name]/` — [test cases]

### Wave 3 — Frontend
- [ ] Page: `app/(app)/[route]/page.tsx` — [description]
- [ ] Components: [list]
- [ ] Query hooks: [list]
- [ ] i18n: `messages/ar.json` + `messages/en.json` entries

## Conventions Checklist
- [ ] All routes use `/api/v1/` prefix
- [ ] Money amounts stored as BIGINT minor units
- [ ] All queries include `household_id` scoping
- [ ] Soft delete (`is_active = false`) for all deletions
- [ ] CSS uses logical properties only (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`)
- [ ] Pydantic V2: `model.model_dump()` (not `.dict()`)
- [ ] Async SQLAlchemy for all DB operations

## Open Questions
List any ambiguities that need resolution before or during implementation.
```

## Step 5: Sanity-check the plan

Before presenting the plan:

- Confirm wave order: DB migrations always before backend, backend before frontend
- Confirm no float math in any planned monetary calculation
- Confirm RLS policy is planned for every new table with `household_id`
- Confirm Arabic strings are planned (not deferred) for any UI work
- Check that the deliverables list matches `05-roadmap.md` exactly — don't add scope

## Step 6: Flag risks

List any items that are unclear, risky, or likely to unblock later:
- Schema changes that affect existing data
- External dependencies (exchange rate APIs, Supabase edge functions, AI providers)
- Any feature that touches multiple existing tables (higher migration risk)
