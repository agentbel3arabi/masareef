---
name: Feature
about: New feature or enhancement — use this template for GitHub Copilot agent assignments
title: "feat(<scope>): <short description>"
labels: feature
assignees: ''
---

## Problem Statement

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

## Testing Instructions

<!-- How should the implementation be tested? What inputs/outputs are expected? -->

1.
2.

## Out of Scope

<!-- What explicitly should NOT be done in this issue -->

-
