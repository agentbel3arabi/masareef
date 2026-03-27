## Summary

<!-- 1-3 bullet points describing what this PR does -->

-

Closes #<!-- issue number -->

## Changes

<!-- What was added, changed, or removed -->

-
-

## Related

<!-- Link to issue, spec, or plan file -->

- Plan: `docs/superpowers/plans/phase-N/unit-X.md`
- Spec: `docs/03-features/xxx.md`

## Testing

- [ ] All existing tests pass (`uv run pytest` / `pnpm build`)
- [ ] New tests added for new functionality
- [ ] Manual verification done (describe below)

<!-- Steps or notes for manual verification -->

## Checklist

- [ ] All CI checks pass (backend lint/type/test, frontend lint/type/build)
- [ ] Money is integer minor units — no floats, no exceptions
- [ ] All queries include `household_id` and `is_active = TRUE`
- [ ] Soft-delete used (no hard-deletes)
- [ ] API responses use standard envelope (`data` + `meta` or `error`)
- [ ] Pydantic uses `model_dump()` (not `.dict()`)
- [ ] No physical CSS directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`) — use logical equivalents (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`)
- [ ] Arabic + English strings provided for any new UI copy
- [ ] No `npm install` or `pip install` used — pnpm / uv only
- [ ] No features added beyond what the spec requires

## Screenshots

<!-- If UI changes, attach before/after screenshots -->

## Breaking Changes

<!-- List any breaking changes, or write "None" -->

None
