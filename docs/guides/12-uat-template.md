# UAT Checklist — Unit {id}: {title}

**Date:** {date}
**Branch:** {branch}
**Tested by:** {name}

---

## Standard Checks (Apply to Every Unit)

These checks apply to every unit across all phases. Complete these first.

- [ ] **CI pipeline green** — lint, type check, build, and all tests pass on the PR
- [ ] **No new console errors or warnings** — open browser dev tools (F12), navigate all changed pages, verify console is clean
- [ ] **RTL spot-check** — switch locale to Arabic, verify layout doesn't break (no text overflow, misaligned elements, or direction-flip issues)
- [ ] **Dark mode spot-check** — toggle theme to dark mode, verify all colors are readable and no text/background clashes
- [ ] **Mobile spot-check** — resize browser to 375px width, verify no horizontal scroll and all content is accessible

---

## Phase/Feature-Specific Checks

Add unit-specific checks here based on the features built in this unit.

### Backend Features
If this unit includes new API endpoints:
- [ ] Test each new endpoint manually (curl, Postman, or Thunder Client)
- [ ] Test all documented request/response shapes with valid and invalid inputs
- [ ] Verify error responses follow the standard envelope: `{ "error": { "code": "...", "message": "...", "details": [...] } }`
- [ ] Check pagination works if applicable (valid `page` and `page_size` params; verify `meta` in response)
- [ ] Test household scoping — verify user can only access their own household data (RLS + application layer)
- [ ] Test soft-delete cascades match `02-data-models.md` specifications

### Frontend Features
If this unit includes new pages or components:
- [ ] Test each new page load and navigation paths
- [ ] Test all interactive elements (buttons, forms, dropdowns, modals)
- [ ] Test form validation with empty/invalid inputs
- [ ] Test loading and error states
- [ ] Test empty state (when no data exists)
- [ ] Verify text aligns correctly in both RTL and LTR modes
- [ ] Check that all client-side redirects work (auth gates, 404s, etc.)

### Edge Cases & Boundary Conditions
- [ ] Empty state: app behavior when no records exist
- [ ] Error state: API returns error; verify UI shows appropriate message
- [ ] Large data: test with high volumes (many transactions, large numbers)
- [ ] Network latency: throttle network in dev tools, verify loading states appear
- [ ] Session expiry: simulate expired auth token, verify redirect to login

### Data Integrity
- [ ] Verify all money amounts are stored and displayed in minor units (no float rounding)
- [ ] Verify exchange rates are applied correctly if this unit touches currency conversion
- [ ] Check that soft deletes work (data is hidden but not permanently removed)
- [ ] Verify historical data is preserved when editing (if applicable)

---

## Sign-off

| Field | Value |
|-------|-------|
| Tested by | |
| Date | |
| Result | ☐ Pass  ☐ Fail  ☐ Partial |
| Notes | |

**Notes field guidance:**
- If "Fail" or "Partial": list specific issues found and their severity (blocker vs. nice-to-have)
- If "Pass": optionally note anything exceptional (e.g., "Excellent performance on mobile", "RTL perfect")
- Cross-reference any GitHub issues created during testing
