---
name: Feature
about: Feature implementation for Masareef — use for Copilot agent or manual work
title: "feat(<scope>): <short description>"
labels: feature
assignees: ''
---

## Context

<!-- Which phase/unit does this belong to? Link the plan file. -->
- Phase: N
- Work unit: unit-X
- Plan: `docs/superpowers/plans/phase-N/unit-X.md`

## Description

<!-- What needs to be built and why? Be specific. -->

## Requirements

<!-- Bulleted list of what the implementation must do -->

-
-
-

## Acceptance Criteria

<!-- Checkboxes Copilot and reviewers use to verify completeness -->

- [ ]
- [ ]
- [ ]

## Technical Notes

<!-- Help Copilot place code correctly and follow project conventions -->

**Files to touch:**
-

**Schema reference:** `docs/02-data-models.md` — table(s): <!-- list relevant tables -->

**API contract:** `docs/03-features/<feature>.md` — endpoint(s): <!-- list relevant endpoints -->

**Relevant rules:**
- Money amounts: integer minor units only (no floats)
- All queries must include `household_id`
- Soft-delete: set `is_active = FALSE`, never hard-delete
- Arabic + English strings required for any UI copy

## Required Reading

<!-- List the docs the implementer should read before starting -->
- `CLAUDE.md`
- `docs/03-features/xxx.md`

## Testing Instructions

<!-- How should the implementation be tested? What inputs/outputs are expected? -->

1.
2.

## Out of Scope

<!-- What explicitly should NOT be done in this issue -->

-
