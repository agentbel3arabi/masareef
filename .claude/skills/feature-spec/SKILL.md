---
name: feature-spec
description: Author or update a Masareef feature specification file in docs/03-features/
argument-hint: "Please specify the feature name and whether it's a new spec or an update to an existing one. For example: 'Create a new feature spec for multi-currency support' or 'Update the savings goals feature spec to include new endpoints.'"
user-invocable: true
---

# Feature Spec Authoring

Use this skill to create a new feature spec or update an existing one in `docs/03-features/`.

## Step 1: Load required context

Load ALL of these before writing a single line:

1. `docs/02-data-models.md` — canonical table schemas (never invent columns)
2. `docs/01-architecture.md` — API patterns, auth flow, error envelopes
3. The existing spec file if updating (read it first, understand current state)

## Step 2: Identify the feature scope

Answer these before writing:

- Which tables does this feature touch? (cross-check `02-data-models.md`)
- Does it introduce new endpoints, or modify existing ones?
- Does it require any schema changes? (flag separately — schema changes require a migration, not just a spec update)
- Does it interact with other features? (list them)

## Step 3: Structure the spec

Every feature spec MUST follow this structure:

```
# Feature Name

## Overview
One paragraph. What does this feature do? Who uses it? Why does it exist?

## Data Model
List the tables this feature reads/writes. Cross-reference `02-data-models.md`.
Do NOT redefine table schemas here — pointer only.

## API Endpoints
### `METHOD /api/v1/resource`
- **Auth:** Required / Public
- **Request:** (body or query params)
- **Response:** (success shape)
- **Errors:** (relevant error codes from the standard envelope)

## Business Rules
Numbered list of invariants and constraints.

## Acceptance Criteria
Numbered list of testable conditions. Written as: "Given X, when Y, then Z."

## Edge Cases
Numbered list of non-obvious behaviors to handle.
```

## Step 4: Apply mandatory conventions

For every endpoint written:

- **Route prefix:** always `/api/v1/` — no exceptions
- **Route style:** `kebab-case` (e.g., `/api/v1/exchange-rates`, `/api/v1/savings-goals`)
- **Money amounts:** specify `BIGINT minor units` in the model description; include the currency exponent note
- **Error shape:**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
  ```
- **Success shape:**
  ```json
  { "data": {...}, "meta": { "total": 150, "page": 1, "page_size": 50 } }
  ```
- **Soft deletes:** every DELETE endpoint sets `is_active = false`, never hard-deletes
- **Household scoping:** every endpoint implicitly filters by `household_id` — document this once in Overview, don't repeat per endpoint
- **Signed vs. absolute amounts:** `transactions.amount_minor` is signed; split/payment amounts are always positive absolute integers

## Step 5: Validate before finishing

Run this mental checklist:

- [ ] All endpoints use `/api/v1/` prefix
- [ ] No table schema definitions duplicated from `02-data-models.md` (pointer only)
- [ ] Every money field specifies minor units
- [ ] DELETE endpoints use soft delete, not hard delete
- [ ] Arabic field names/labels included where UI-facing
- [ ] Acceptance criteria are testable (Given/When/Then format)
- [ ] No float arithmetic — all monetary math uses integer minor units
- [ ] If schema changes are needed, flagged explicitly with a note: "Requires migration: ..."

## Step 6: Cross-check with roadmap

After writing, verify the endpoint set is consistent with the phase it belongs to in `docs/05-roadmap.md`. If the spec introduces endpoints for a later phase, call that out explicitly.
