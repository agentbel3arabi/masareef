---
phase: 3
slug: ai-categorization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio |
| **Config file** | `backend/pyproject.toml` — `[tool.pytest.ini_options]` |
| **Quick run command** | `uv run pytest tests/ -k "categoriz" -x` |
| **Full suite command** | `uv run pytest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest tests/ -k "categoriz" -x`
- **After every plan wave:** Run `uv run pytest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | AICAT-01 | T-3-01 | household_id scoping on all rule queries | unit | `uv run pytest tests/services/test_categorization.py::test_correction_creates_rule -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | AICAT-01 | — | N/A | unit | `uv run pytest tests/services/test_categorization.py::test_rule_engine_contains_match -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | AICAT-01 | — | N/A | unit | `uv run pytest tests/services/test_categorization.py::test_rule_hit_count_increments -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | AICAT-02 | T-3-02 | LLM prompt injection prevention — description as data field | unit (mocked) | `uv run pytest tests/services/test_categorization.py::test_llm_fallback_called -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | AICAT-02 | — | N/A | unit (mocked) | `uv run pytest tests/services/test_categorization.py::test_llm_invalid_category_rejected -x` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | AICAT-02 | T-3-03 | Budget check before every LLM call batch | unit | `uv run pytest tests/services/test_categorization.py::test_budget_exhausted_skips_llm -x` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | AICAT-03 | — | N/A | integration | `uv run pytest tests/routers/test_categorization.py::test_needs_review_filter -x` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | AICAT-03 | — | N/A | integration | `uv run pytest tests/routers/test_categorization.py::test_batch_categorize -x` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 3 | AICAT-04 | T-3-01 | household_id scoping on rule list/delete | integration | `uv run pytest tests/routers/test_categorization.py::test_list_rules -x` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 3 | AICAT-04 | — | N/A | integration | `uv run pytest tests/routers/test_categorization.py::test_delete_rule -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/services/test_categorization.py` — unit tests for rule engine, LLM fallback (mocked), budget guard, merchant extractor
- [ ] `tests/routers/test_categorization.py` — router integration tests (4 per endpoint minimum)
- [ ] `tests/unit/test_merchant_extractor.py` — pure unit tests for extract_merchant_name() with various bank description formats
- [ ] No framework install needed — pytest infrastructure already in place

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI badge color-coding renders correctly | AICAT-03 | Visual check — CSS color tiers | Inspect transactions page with mixed confidence values; verify green (>95%), yellow (75-95%), red (<75%) badges |
| Bulk approve button UX flow | AICAT-03 | End-to-end user interaction | Filter "Needs review", click "Approve all", verify badges update and filter clears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
