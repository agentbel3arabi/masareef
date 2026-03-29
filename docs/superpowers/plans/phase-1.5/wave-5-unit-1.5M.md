# Unit 1.5M: Workflow & Documentation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalize the project workflow, create UAT templates, write the landing page feature spec, update the roadmap with Phase 1.5 and deferred items, and close out Phase 1.5.

**Architecture:** Pure documentation unit — creates new guide files and updates existing docs. One small backend fix (B4).

**Tech Stack:** Markdown, Python (backend health endpoint)

**Design spec:** `docs/superpowers/specs/2026-03-29-wave5-landing-process-design.md` (Section 5)

**Branch:** `chore/1.5M-workflow-roadmap-updates`

**Prerequisite:** Unit 1.5L merged to main.

---

## File Map

### New Files

| File | Purpose |
|------|---------|
| `docs/guides/11-workflow.md` | Unit execution workflow guide |
| `docs/guides/12-uat-template.md` | UAT checklist template |
| `docs/03-features/landing-page.md` | Landing page feature spec |

### Modified Files

| File | Change |
|------|--------|
| `docs/05-roadmap.md` | Insert Phase 1.5, add deferred items |
| `docs/03-features/accounts.md` | Add utilization formula, note deferred statement cycle |
| `CLAUDE.md` | Add workflow/UAT guide references |
| `backend/app/main.py` | Add return type annotation to health endpoint (B4) |
| `docs/superpowers/plans/phase-1.5/00-master-orchestration.md` | Mark Wave 5 complete |

---

## Task 1: Create branch

- [ ] **Step 1: Create feature branch**

```bash
cd /mnt/d/1-Study/In-progress/saas_ideas/masareef
git checkout main && git pull
git checkout -b chore/1.5M-workflow-roadmap-updates
```

---

## Task 2: Create workflow guide

**Files:**
- Create: `docs/guides/11-workflow.md`

- [ ] **Step 1: Write the workflow guide**

Create `docs/guides/11-workflow.md` documenting the unit execution workflow. Content should cover:

1. **Unit Execution Workflow** — the 8-step process (Plan → Execute → PR → Review → Fix → UAT → Fix → Merge)
2. **Branch naming** — `feature/N-short-slug`, `fix/N-short-slug`, `chore/short-slug`
3. **Commit style** — Conventional Commits (type(scope): subject)
4. **Copilot review** — mandatory for every PR, request via GitHub UI
5. **UAT process** — reference `docs/guides/12-uat-template.md` for checklist template
6. **Merge strategy** — squash merge only, head branch auto-deleted

Use the orchestration plan's Section "Unit Execution Workflow" as the source. Write ~100-150 lines of Markdown.

- [ ] **Step 2: Commit**

```bash
git add docs/guides/11-workflow.md
git commit -m "docs(guides): create unit execution workflow guide"
```

---

## Task 3: Create UAT template

**Files:**
- Create: `docs/guides/12-uat-template.md`

- [ ] **Step 1: Write the UAT template**

Create `docs/guides/12-uat-template.md` with the template content from the design spec Section 5.1. Include:

1. Header block: `# UAT Checklist — Unit {id}: {title}`
2. **Standard Checks** (5 items):
   - CI pipeline green (lint + type check + build + tests)
   - No new console errors or warnings
   - RTL spot-check: switch to Arabic, verify layout doesn't break
   - Dark mode spot-check: toggle theme, verify colors readable
   - Mobile spot-check: resize to 375px, verify no horizontal scroll
3. **Phase-Specific Checks** section (placeholder with instructions)
4. **Sign-off** block (tested by, date, result)

- [ ] **Step 2: Commit**

```bash
git add docs/guides/12-uat-template.md
git commit -m "docs(guides): create UAT checklist template"
```

---

## Task 4: Create landing page feature spec

**Files:**
- Create: `docs/03-features/landing-page.md`

- [ ] **Step 1: Write the feature spec**

Create `docs/03-features/landing-page.md` documenting what was built in Unit 1.5L. Structure:

1. **Overview** — marketing landing page for unauthenticated users
2. **Routing** — `/` shows landing (unauth) or redirects to dashboard (auth)
3. **Language** — detected from browser locale, manual toggle
4. **Sections** — document all 7 sections with content summaries
5. **SEO** — meta tags, OG tags
6. **Responsive breakpoints** — mobile (375px), tablet (768px), desktop (1280px+)
7. **Component list** — `components/landing/*.tsx`
8. **Acceptance criteria** — copied from Unit 1.5L

Base this on the design spec Section 4.1, adapted to reflect what was actually implemented.

- [ ] **Step 2: Commit**

```bash
git add docs/03-features/landing-page.md
git commit -m "docs(features): create landing page feature spec"
```

---

## Task 5: Update roadmap

**Files:**
- Modify: `docs/05-roadmap.md`

- [ ] **Step 1: Read current roadmap**

Read the full roadmap to understand the current structure before making changes.

- [ ] **Step 2: Insert Phase 1.5 between Phase 1 and Phase 2**

After the Phase 1 section, add:

```markdown
## Phase 1.5: Gap Remediation & Polish
**Unlocks:** Full visual fidelity, landing page, workflow formalization. Required before Phase 2.

### Deliverables
- Infrastructure upgrade: Next.js 16, Tailwind CSS v4, shadcn/ui base-nova
- Backend completeness: net-worth endpoint, category hierarchy + icons, credit card validation
- UI foundation: error boundaries, toasts, loading skeletons, empty states, mobile nav drawer
- Auth redesign: split-layout login/signup, onboarding wizard
- Page fidelity: accounts, transactions, transfers pages match Stitch designs
- Landing page: 7-section marketing page with pricing, features, how-it-works
- Workflow: formalized Plan → Execute → Review → UAT → Merge process documented

### Success Criteria
- All Phase 1 pages match Stitch designs at functional fidelity level
- Landing page live for unauthenticated users
- Workflow documented in docs/guides/11-workflow.md
- Roadmap updated with deferred items
```

- [ ] **Step 3: Add deferred items to target phases**

Add to Phase 2 (Import) section:
- "Rate limiting and file size limits for upload endpoints"

Add to Phase 3 (Debts) section:
- "Credit card statement cycle — statement generation date, current vs statement balance, minimum payment calculation, payment reminder integration"
- "Transaction pending vs posted state for credit card reconciliation"

Add to Phase 7 (Budgets) section:
- "Category hierarchy reporting aggregation (parent category rollup in budget reports)"

Add to Phase 11 (Notifications) section:
- "APScheduler job persistence strategy (external store or queue)"

- [ ] **Step 4: Commit**

```bash
git add docs/05-roadmap.md
git commit -m "docs(roadmap): insert Phase 1.5, add deferred items to target phases"
```

---

## Task 6: Update accounts feature spec

**Files:**
- Modify: `docs/03-features/accounts.md`

- [ ] **Step 1: Read current spec**

Read `docs/03-features/accounts.md` to understand current content.

- [ ] **Step 2: Add utilization formula and deferred features**

Add a new subsection (e.g., under credit card details or at the end):

```markdown
### Credit Card Utilization

**Calculation:** `utilization = (abs(displayed_balance_minor) / credit_limit) * 100`

**Color thresholds:**
- Green: <50% utilized
- Amber: 50–80% utilized
- Red: >80% utilized

**Display:** Progress bar on account cards (credit_card and financing_app types only), shown when `credit_limit` is set.

### Deferred: Credit Card Statement Cycle (Phase 3)

The following features are deferred to Phase 3 (Debts & Installments):
- Statement generation date
- Current balance vs statement balance distinction
- Minimum payment calculation
- Payment reminder integration
- Transaction pending vs posted state
```

- [ ] **Step 3: Commit**

```bash
git add docs/03-features/accounts.md
git commit -m "docs(features): add utilization formula, note deferred statement cycle"
```

---

## Task 7: Backend health endpoint fix (B4)

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add return type annotation**

In `backend/app/main.py`, find the health endpoint:

```python
@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
```

Change to:

```python
@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 2: Verify tests still pass**

```bash
cd backend && uv run pytest -x -q
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "fix(backend): add return type annotation to health endpoint (B4)"
```

---

## Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add workflow references**

In `CLAUDE.md`, in the directory table (Section B), add rows for the new guides:

```markdown
| [guides/11-workflow.md](./docs/guides/11-workflow.md)   | Unit execution workflow (Plan → Execute → Review → UAT → Merge)  | Starting any implementation unit |
| [guides/12-uat-template.md](./docs/guides/12-uat-template.md) | UAT checklist template with standard + phase-specific checks | Writing UAT checklists |
```

Also add `landing-page.md` to the features table:

```markdown
│   ├── landing-page.md
```

- [ ] **Step 2: Verify CLAUDE.md version references are current**

Check Section F.7 mentions Next.js 16, Tailwind CSS v4, shadcn base-nova. These should already be correct from Unit 1.5B updates. If any are outdated, fix them.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add workflow and UAT guide references"
```

---

## Task 9: Mark Phase 1.5 complete

**Files:**
- Modify: `docs/superpowers/plans/phase-1.5/00-master-orchestration.md`

- [ ] **Step 1: Update orchestration plan**

In the "Current Status" table, update Wave 5:

```markdown
| Wave 5 — Landing & Process | ✅ Complete (PRs #XX, #YY) | `docs/superpowers/plans/phase-1.5/wave-5-unit-1.5L.md`, `wave-5-unit-1.5M.md` |
```

Replace `#XX, #YY` with the actual PR numbers from Units 1.5L and 1.5M.

Update the "Next Step" section:

```markdown
## Next Step

**Phase 1.5 is complete.** All 5 waves (13 units) have been merged to main. Next: Phase 2 (Import & Templates).
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/phase-1.5/00-master-orchestration.md
git commit -m "docs(phase-1.5): mark Wave 5 and Phase 1.5 complete"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run backend tests**

```bash
cd backend && uv run pytest -x -q
```
Expected: All tests pass.

- [ ] **Step 2: Run frontend build**

```bash
cd frontend && pnpm build
```
Expected: Build succeeds (no frontend changes in this unit, but verify nothing broke).

- [ ] **Step 3: Verify all new files exist**

```bash
ls -la docs/guides/11-workflow.md docs/guides/12-uat-template.md docs/03-features/landing-page.md
```
Expected: All three files exist.

- [ ] **Step 4: Verify roadmap has Phase 1.5**

```bash
grep -c "Phase 1.5" docs/05-roadmap.md
```
Expected: At least 1 match.

---

## Summary

| Task | Description | Estimated |
|------|-------------|-----------|
| 1 | Create branch | 2 min |
| 2 | Workflow guide | 20 min |
| 3 | UAT template | 10 min |
| 4 | Landing page feature spec | 20 min |
| 5 | Update roadmap | 15 min |
| 6 | Update accounts spec | 10 min |
| 7 | Backend health fix (B4) | 5 min |
| 8 | Update CLAUDE.md | 10 min |
| 9 | Mark Phase 1.5 complete | 5 min |
| 10 | Final verification | 5 min |

**Note:** Audit finding B3 (route order) was verified to already be correct — `net-worth` is already declared before `/{account_id}` in `backend/app/routers/accounts.py`. No fix needed.
