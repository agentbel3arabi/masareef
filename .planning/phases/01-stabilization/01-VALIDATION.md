---
phase: 1
slug: stabilization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
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
| **Framework (frontend)** | vitest 4.1.2 (to be installed in Wave 0) |
| **Config file (frontend)** | `frontend/vitest.config.ts` (to be created) |
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
| 01-01-01 | 01 | 1 | STAB-01 | — | N/A | manual | N/A — documentation review | N/A | ⬜ pending |
| 01-02-01 | 02 | 2 | STAB-03 | — | N/A | integration | `uv run pytest tests/routers/test_accounts.py -x` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 2 | STAB-04 | — | N/A | integration | `uv run pytest tests/routers/test_accounts.py tests/services/ -x` | Partially | ⬜ pending |
| 01-04-01 | 04 | 3 | STAB-05 | — | N/A | smoke | `cd frontend && pnpm test` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 4 | STAB-07 | T-01-01 | Unauthenticated/unauthorized requests return 401/403 | integration | `uv run pytest tests/routers/test_rbac.py -x` | ✅ | ⬜ pending |
| 01-06-01 | 06 | 5 | STAB-06 | — | N/A | unit+integration | `uv run pytest -x && cd ../frontend && pnpm test` | Partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/vitest.config.ts` — Vitest configuration
- [ ] `frontend/src/test/setup.ts` — Test setup with jest-dom matchers
- [ ] Frontend test dependencies installed (vitest, @testing-library/react, @testing-library/jest-dom, jsdom)
- [ ] `frontend/package.json` test and test:coverage scripts added
- [ ] `.github/workflows/frontend.yml` updated with test step

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docs align with codebase | STAB-01 | Documentation correctness requires human review | Diff 02-data-models.md against actual SQLAlchemy models; diff feature specs against actual API endpoints |
| Roadmap status correct | STAB-02 | Status fields are semantic, not code-checkable | Review ROADMAP.md phase statuses and BACKLOG.md tags against actual state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
