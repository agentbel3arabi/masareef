---
phase: 2
slug: dashboard-charts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | pytest 8.x + pytest-asyncio (async) |
| **Framework (frontend)** | Vitest 4.x + React Testing Library |
| **Config file (backend)** | `backend/pyproject.toml` [tool.pytest.ini_options] |
| **Config file (frontend)** | `frontend/vitest.config.ts` |
| **Quick run (backend)** | `cd backend && uv run pytest tests/services/test_dashboard.py -x` |
| **Quick run (frontend)** | `cd frontend && pnpm test -- --run src/hooks/__tests__/use-dashboard.test.ts` |
| **Full suite (backend)** | `cd backend && uv run pytest` |
| **Full suite (frontend)** | `cd frontend && pnpm test` |
| **Estimated runtime** | ~15 seconds (backend), ~10 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** `cd backend && uv run pytest tests/services/test_dashboard.py tests/routers/test_dashboard.py -x`
- **After every plan wave:** `cd backend && uv run pytest && cd ../frontend && pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DASH-01 | T-02-01 | household_id filter on all queries | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_income_vs_expenses -x` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DASH-02 | T-02-01 | household_id filter on all queries | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_spending_by_category -x` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DASH-03 | T-02-01 | household_id filter on all queries | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_stat_cards_debts -x` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | DASH-04 | T-02-01 | household_id filter on all queries | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_upcoming_payments -x` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | DASH-05 | T-02-01 | household_id filter on all queries | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_income_vs_expenses_comparison -x` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | DASH-06 | T-02-01 | household_id filter on all queries | unit (service) | `uv run pytest tests/services/test_dashboard.py::test_net_worth_trend -x` | ❌ W0 | ⬜ pending |
| 02-01-07 | 01 | 1 | DASH-01 | T-02-02 | Pydantic validates query params | integration (router) | `uv run pytest tests/routers/test_dashboard.py -x` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | DASH-01 | — | N/A | unit (hook) | `pnpm test -- --run src/hooks/__tests__/use-dashboard.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/services/test_dashboard.py` — stubs for DASH-01 through DASH-06 service logic
- [ ] `backend/tests/routers/test_dashboard.py` — stubs for dashboard API endpoints (envelope, auth, validation)
- [ ] `frontend/src/hooks/__tests__/use-dashboard.test.ts` — stubs for dashboard hooks

*Existing infrastructure (pytest, vitest, conftest) covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plotly chart renders correctly in browser | DASH-01, DASH-02, DASH-06 | Visual rendering cannot be unit-tested | Open dashboard, verify charts render with sample data |
| RTL layout flips charts/cards correctly | All DASH-* | CSS logical properties require visual inspection | Toggle locale to Arabic, verify layout mirrors |
| Month toggle re-fetches and updates all charts | DASH-05 | Integration of multiple components + API calls | Click month toggle, verify all charts update with comparison data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
