---
phase: 1
slug: stabilization
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
updated: 2026-04-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | pytest 8.0+ with pytest-asyncio |
| **Config file (backend)** | `backend/pyproject.toml` [tool.pytest.ini_options] |
| **Quick run command (backend)** | `cd backend && uv run pytest -x --tb=short` |
| **Full suite command (backend)** | `cd backend && uv run pytest -v --cov=app --cov-fail-under=50` |
| **Framework (frontend)** | vitest 4.1.2 (installed in Plan 04, Wave 3) |
| **Config file (frontend)** | `frontend/vitest.config.ts` (created in Plan 04) |
| **Quick run command (frontend)** | `cd frontend && pnpm test` |
| **Full suite command (frontend)** | `cd frontend && pnpm test:coverage` |
| **Estimated runtime** | ~30 seconds (backend) + ~15 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** Run quick run command for affected area (backend or frontend)
- **After every plan wave:** Run full suite for both backend and frontend
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | STAB-01 | — | N/A | manual | `grep -n "Phase 1" BACKLOG.md \| grep -E "BL-02[789]\|BL-032" \| wc -l` | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | STAB-01, STAB-02 | — | N/A | automated | `cd /home/gharib/projects/masareef && grep -c "NOT YET IMPLEMENTED" docs/03-features/*.md; python3 -c "import json; pkg=json.loads(open('frontend/package.json').read()); deps={**pkg.get('dependencies',{}), **pkg.get('devDependencies',{})}; claude=open('CLAUDE.md').read(); checks=[]; checks.append('next-in-pkg') if 'next' in deps else None; checks.append('next-in-claude') if 'next' in claude.lower() else None; print(','.join(checks))"; ls backend/app/routers/*.py \| wc -l; grep -c 'routers/' docs/01-architecture.md; echo "audit-complete"` | N/A | ⬜ pending |
| 01-02-01 | 02 | 2 | STAB-03 | — | N/A | integration | `cd /home/gharib/projects/masareef/backend && uv run pytest tests/routers/test_transfers.py -x -v --tb=short 2>&1 \| tail -20` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 2 | STAB-04 | T-01-03 | Batch balance scoped to household | integration | `cd /home/gharib/projects/masareef/backend && uv run pytest tests/services/test_person_balances_fx.py -x -v --tb=short 2>&1 \| tail -20` | ✅ | ⬜ pending |
| 01-03-02 | 03 | 2 | STAB-03, STAB-04 | T-01-04 | Batch and single balance match | integration | `cd /home/gharib/projects/masareef/backend && uv run pytest tests/routers/test_accounts.py -x -v --tb=short 2>&1 \| tail -30` | ✅ | ⬜ pending |
| 01-04-01 | 04 | 3 | STAB-05 | — | N/A | smoke | `cd /home/gharib/projects/masareef/frontend && cat package.json \| grep -cE '"test"\|"test:watch"\|"test:coverage"\|"user-event"' && cat vitest.config.ts \| grep -c "defineConfig"` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 3 | STAB-05 | — | N/A | unit+integration | `cd /home/gharib/projects/masareef/frontend && pnpm test 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 01-05-02 | 05 | 3 | STAB-05 | — | N/A | unit | `cd /home/gharib/projects/masareef/backend && uv run pytest tests/services/test_account_service.py tests/services/test_debt_service.py -x -v --tb=short 2>&1 \| tail -20` | Partial | ⬜ pending |
| 01-06-01 | 06 | 4 | STAB-07 | T-01-06, T-01-07, T-01-08, T-01-10 | Unauthenticated/unauthorized requests return 401/403 | integration | `cd /home/gharib/projects/masareef/backend && grep -c "require_role" app/routers/import_.py app/routers/import_templates.py app/routers/financial_institutions.py` | ✅ | ⬜ pending |
| 01-06-02 | 06 | 4 | STAB-07 | T-01-06 | Viewer role rejected on all mutations | integration | `cd /home/gharib/projects/masareef/backend && uv run pytest tests/routers/test_rbac_guards.py -x -v --tb=short 2>&1 \| tail -20` | ❌ (created in task) | ⬜ pending |
| 01-07-01 | 07 | 5 | STAB-06 | T-01-11 | Refactoring preserves behavior | integration | `cd /home/gharib/projects/masareef/backend && uv run pytest tests/routers/test_accounts.py tests/routers/test_transactions.py -x -v --tb=short 2>&1 \| tail -20` | ✅ | ⬜ pending |
| 01-07-02 | 07 | 5 | STAB-06 | — | N/A | unit+integration | `cd /home/gharib/projects/masareef/backend && uv run pytest --ignore=tests/integration -x --tb=short 2>&1 \| tail -10 && cd ../frontend && pnpm test 2>&1 \| tail -10` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `frontend/vitest.config.ts` — Vitest configuration (Plan 04, Task 1)
- [x] `frontend/src/test/setup.ts` — Test setup with jest-dom matchers (Plan 04, Task 1)
- [x] Frontend test dependencies installed: vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom (Plan 04, Task 1)
- [x] `frontend/package.json` test and test:coverage scripts added (Plan 04, Task 1)
- [x] `.github/workflows/frontend.yml` updated with test step (Plan 04, Task 1)

All Wave 0 items are covered by Plan 04 Task 1 (Wave 3). Plans 01-03 (Waves 1-2) have no frontend test dependencies. Plan 05 (test writing) depends on Plan 04 completing Wave 0 setup first.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docs align with codebase | STAB-01 | Documentation correctness requires human review | Diff 02-data-models.md against actual SQLAlchemy models; diff feature specs against actual API endpoints |
| Roadmap status correct | STAB-02 | Status fields are semantic, not code-checkable | Review ROADMAP.md phase statuses and BACKLOG.md tags against actual state |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 04 Task 1 creates all frontend test infra)
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete
