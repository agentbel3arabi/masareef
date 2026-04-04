# Centralized Backlog System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a centralized backlog system (`BACKLOG.md`) that tracks all deferred features, tech debt, bugs, new ideas, and backend dependencies — backfilled from existing handoff notes and `backend-dependencies.md` — with archive support and mandatory workflow checkpoints.

**Architecture:** Docs-only change. A root-level `BACKLOG.md` with hybrid format (summary table + detail sections grouped by target phase). Archive file at `docs/backlog-archive.md`. Workflow enforcement via CLAUDE.md rules. Existing `backend-dependencies.md` deprecated but preserved.

**Tech Stack:** Markdown files only. No code changes.

**Spec:** `docs/superpowers/specs/2026-04-03-centralized-backlog-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `BACKLOG.md` | Active backlog: summary table + detail sections grouped by target phase |
| Create | `docs/backlog-archive.md` | Archive for completed/cancelled items |
| Modify | `docs/backend-dependencies.md` | Add deprecation header |
| Modify | `CLAUDE.md` | Update Rule 8, add Rule 11, update directory map table, update task router |
| Modify | `docs/05-roadmap.md` | Add "Backlog" column to phase overview table |
| Modify | `docs/handoff-template.md` | Update Section 3 with BL-ID reference pattern |

---

### Task 1: Create `BACKLOG.md` with backfilled items

This is the largest task — it creates the backlog file with all items extracted from handoff notes, backend-dependencies.md, and design specs. The agent who worked on the brainstorming session already extracted all deferred items. This task uses that extraction to build the actual file.

**Files:**
- Create: `BACKLOG.md`

**Required reading before starting:**
- `docs/superpowers/specs/2026-04-03-centralized-backlog-design.md` (the spec — format, taxonomy, examples)
- All handoff files in `docs/superpowers/handoff/` (scan the "Known Gaps / Deferred" sections)
- `docs/backend-dependencies.md` (all 24 rows)
- Design specs in `docs/superpowers/specs/` (scan "Deferred" / "Out of Scope" sections)

- [ ] **Step 1: Read all source files and build the item inventory**

Read every handoff note's Section 3 ("Known Gaps / Deferred"), all 24 rows of `backend-dependencies.md`, and the "Deferred" / "Out of Scope" sections of design specs. For each item, determine:

1. Is it still open? Check the codebase — if a later phase clearly resolved it (e.g., "P2P types" deferred in 3A but Phase 3B is complete and P2P types exist), mark it as resolved.
2. Category: `deferred`, `tech-debt`, `bug`, `new-idea`, or `backend-dep`
3. Target phase (use the phase mentioned in the source, or "Unscheduled" if none)
4. Priority: `Critical` / `High` / `Medium` / `Low` / `—`
5. Deduplicate: if the same item appears in multiple handoff notes, use the most recent origin. If a backend-dependencies.md row and a handoff note overlap, merge into one entry with category `backend-dep`.

- [ ] **Step 2: Write `BACKLOG.md` with all active items**

Create the file at the repo root with this structure:

```markdown
# Backlog

Centralized tracker for deferred features, tech debt, bugs, new ideas, and backend dependencies.
Completed items are archived in [`docs/backlog-archive.md`](docs/backlog-archive.md).

**Active items:** {count} | **By phase:** Phase 3.5 ({n}) · Phase 4 ({n}) · Phase 5+ ({n}) · Unscheduled ({n})

---

## Summary

| ID | Item | Category | Target | Priority | Status |
|----|------|----------|--------|----------|--------|
| BL-001 | {item} | {category} | {target} | {priority} | {status} |
...

---

## Phase 3.5 — UX Polish Sprint

### BL-NNN: {item title}
- **Category:** {category}
- **Origin:** {source file and section}
- **Priority:** {priority}
- **Context:** {1-3 sentences explaining the gap and what's needed}
- **Acceptance:** {what "done" looks like — omit for ideas}
- **Status:** ⏳ Open

---

## Phase 4 — Dashboard & Charts

### BL-NNN: {item title}
...

---

## Phase 5+ (Later Phases)

### BL-NNN: {item title}
...

---

## Unscheduled

### BL-NNN: {item title}
...
```

Rules for writing each item:
- IDs are sequential starting from BL-001, never skip numbers
- Summary table row and detail section must have identical ID, item name, category, target, priority, and status
- Every active item gets both a summary row AND a detail block
- Group detail blocks by target phase in ascending order, with "Unscheduled" last
- Items confirmed as resolved go to `docs/backlog-archive.md` (Task 2), not here
- `backend-dep` items must include the exact endpoint path needed in the Context field
- Phase grouping headers use the format: `## Phase {N} — {Phase Name}` matching `05-roadmap.md`

- [ ] **Step 3: Verify the file**

1. Count the summary table rows — must match the "Active items" count in the header
2. Count detail sections — must match the summary table rows (1:1)
3. Verify IDs are sequential with no gaps
4. Verify each phase section header matches a phase in `docs/05-roadmap.md`
5. Verify no duplicate items (same gap tracked twice under different IDs)

- [ ] **Step 4: Commit**

```bash
git add BACKLOG.md
git commit -m "docs: create centralized BACKLOG.md with backfilled items from handoff notes and backend-dependencies"
```

---

### Task 2: Create `docs/backlog-archive.md`

**Files:**
- Create: `docs/backlog-archive.md`

- [ ] **Step 1: Write the archive file**

Create the file with this content. Include any items from the backfill that were confirmed as already resolved:

```markdown
# Backlog Archive

Completed and cancelled items from [`BACKLOG.md`](../BACKLOG.md).
Organized by the phase in which items were resolved.

---

## Summary

| ID | Item | Category | Resolved In | Status |
|----|------|----------|-------------|--------|
| BL-NNN | {item} | {category} | Phase {N} | ✅ Done |
...

---

## Resolved During Backfill (2026-04-03)

Items that were deferred in earlier phases but confirmed resolved by the time this backlog was created.

### BL-NNN: {item title}
- **Category:** {category}
- **Origin:** {source file}
- **Resolved in:** {phase where it was fixed, PR # if known}
- **Resolution date:** 2026-04-03 (backfill)
- **Context:** {description}
- **Status:** ✅ Done
```

If no items are confirmed resolved during backfill, write the file with just the header and an empty summary table:

```markdown
# Backlog Archive

Completed and cancelled items from [`BACKLOG.md`](../BACKLOG.md).
Organized by the phase in which items were resolved.

---

## Summary

| ID | Item | Category | Resolved In | Status |
|----|------|----------|-------------|--------|
| — | No archived items yet | — | — | — |
```

- [ ] **Step 2: Commit**

```bash
git add docs/backlog-archive.md
git commit -m "docs: create backlog archive file"
```

---

### Task 3: Deprecate `docs/backend-dependencies.md`

**Files:**
- Modify: `docs/backend-dependencies.md`

- [ ] **Step 1: Add deprecation header**

Insert the following block at the very top of `docs/backend-dependencies.md`, before the existing `# Backend Dependencies` heading:

```markdown
> **⚠️ DEPRECATED** — This file has been replaced by [`BACKLOG.md`](../BACKLOG.md).
> All items have been migrated. New backend dependency items go in `BACKLOG.md` with category `backend-dep`.
> This file is preserved for historical reference only.

```

Do NOT delete any existing content — the file stays intact for git history.

- [ ] **Step 2: Commit**

```bash
git add docs/backend-dependencies.md
git commit -m "docs: deprecate backend-dependencies.md in favor of BACKLOG.md"
```

---

### Task 4: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Four changes in this file. Make them all before committing.

- [ ] **Step 1: Update Rule 8**

Find the existing Rule 8 text in Section E:

```
8. **Track every "coming soon" UI element in `backend-dependencies.md`.** Any time frontend code shows `"—"`, a disabled button, a "Coming soon" tooltip, or a placeholder instead of real data — because the backend endpoint doesn't exist yet — you MUST add a row to `docs/backend-dependencies.md` with: the UI element name, the page it appears on, the exact endpoint needed, and the target phase. This file is read by Phase 2+ planners to know what's already wired up and waiting. Failure to track here creates silent gaps between frontend and backend work.
```

Replace it with:

```
8. **Track every "coming soon" UI element in `BACKLOG.md`.** Any time frontend code shows `"—"`, a disabled button, a "Coming soon" tooltip, or a placeholder instead of real data — because the backend endpoint doesn't exist yet — add a row to `BACKLOG.md` with category `backend-dep`, the UI element name, the page it appears on, the exact endpoint needed, and the target phase. This is read by phase planners to know what's already wired up and waiting.
```

- [ ] **Step 2: Add Rule 11**

After Rule 10, add:

```
11. **Backlog is mandatory.** At the end of every implementation unit, extract all deferred items, bugs, tech debt, and new ideas into `BACKLOG.md` with a `BL-NNN` ID. At the start of every phase plan, pull all items tagged for that phase and either include them in the plan or explicitly re-defer them. At phase completion, archive resolved items to `docs/backlog-archive.md`. See `BACKLOG.md` header for format and taxonomy.
```

- [ ] **Step 3: Update Section B — Directory Map table**

In the directory map table (Section B), find the row for `backend-dependencies.md`:

```
| [backend-dependencies.md](./docs/backend-dependencies.md) | UI elements that need future backend endpoints, mapped to roadmap phases | Planning any phase — check before scoping backend work |
```

Replace it with:

```
| [BACKLOG.md](./BACKLOG.md) | Centralized tracker: deferred features, tech debt, bugs, new ideas, backend deps | Any implementation or planning task |
| [backend-dependencies.md](./docs/backend-dependencies.md) | ⚠️ DEPRECATED — migrated to BACKLOG.md | Historical reference only |
```

Also add a row in the directory tree (`masareef/` tree block) right after the `CLAUDE.md` line:

```
├── BACKLOG.md                          # Centralized backlog — deferred, tech debt, bugs, ideas, backend deps
```

- [ ] **Step 4: Update Section C — Task Router table**

In the Task Router table:

1. Find the "Planning / prioritization" row. Change the "Also Load" column from `—` to `BACKLOG.md`.

The current row:
```
| Planning / prioritization      | `CLAUDE.md` + `05-roadmap.md` + `06-research.md` + `docs/stitch-screen-map.md`                   | —                                              |
```

Replace with:
```
| Planning / prioritization      | `CLAUDE.md` + `05-roadmap.md` + `06-research.md` + `docs/stitch-screen-map.md`                   | `BACKLOG.md`                                   |
```

2. Find the "Starting any implementation unit" row. Add `BACKLOG.md` to the "Also Load" column.

The current row:
```
| Starting any implementation unit | `CLAUDE.md` + plan file + feature spec                                                          | Most recent `docs/superpowers/handoff/phase-N-unit-X.md` — **always read this first** |
```

Replace with:
```
| Starting any implementation unit | `CLAUDE.md` + plan file + feature spec                                                          | Most recent `docs/superpowers/handoff/phase-N-unit-X.md` — **always read this first**; `BACKLOG.md` — check for items tagged to current phase |
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add backlog rules (Rule 8 update + Rule 11), update directory map and task router"
```

---

### Task 5: Update `docs/05-roadmap.md` — add Backlog column

**Files:**
- Modify: `docs/05-roadmap.md`

- [ ] **Step 1: Add Backlog column to phase overview table**

The current phase overview table header is:

```
| Phase | Name | Goal | Est. Effort | Status |
|-------|------|------|-------------|--------|
```

Replace with:

```
| Phase | Name | Goal | Est. Effort | Backlog | Status |
|-------|------|------|-------------|---------|--------|
```

For each row, add the backlog count. Count the items in `BACKLOG.md` targeting each phase. Completed phases (1, 1.5, 1.75, 2, 3) get `—` since their backlog items have been archived or re-targeted. Use the actual counts from the `BACKLOG.md` you created in Task 1.

Example (actual counts will depend on backfill results):
```
| 1 | Foundation | Accounts, transactions, categories — the core data loop | Large | — | ✅ Complete |
| 1.5 | Gap Remediation & Polish | Infrastructure upgrade, UI foundation, landing page, workflow formalization | Large | — | ✅ Complete |
| 1.75 | Design System & Page Redesign | Full Stitch design fidelity — design tokens, page redesigns, UI consistency | Medium | — | ✅ Complete |
| 2 | Import & Templates | Bank statement import pipeline with template system | Large | — | ✅ Complete |
| 3 | Debts & Installments | Loans, P2P, CC installments, store plans, amortization | Large | — | ✅ Complete |
| **3.5** | **UX Polish Sprint** | **Fix critical UX bugs, form consistency, card enhancements, date standardization** | **Medium** | **{n} open** | **🔨 In Progress** |
| 4 | Dashboard & Charts | Net worth, spending trends, category breakdown, Plotly | Medium | {n} open | ⏳ Pending |
| 5 | Gam3eya | Rotating savings clubs with payment scheduling | Medium | {n} open | ⏳ Pending |
...
```

Phases with 0 open backlog items get `—`.

- [ ] **Step 2: Commit**

```bash
git add docs/05-roadmap.md
git commit -m "docs(roadmap): add Backlog column to phase overview table"
```

---

### Task 6: Update `docs/handoff-template.md`

**Files:**
- Modify: `docs/handoff-template.md`

- [ ] **Step 1: Update Section 3**

Find the current Section 3:

```markdown
## 3. Known Gaps / Deferred

What is *not* done and why. Distinguish blockers from intentional deferrals.

- **Gap description** — reason deferred, target phase/unit if known
```

Replace with:

```markdown
## 3. Known Gaps / Deferred

<!-- For each gap: add to BACKLOG.md if not already tracked, then reference the BL-ID here -->

What is *not* done and why. Every item listed here MUST also exist in `BACKLOG.md` with a `BL-NNN` ID.

- **BL-XXX: [item name]** — [brief description]. Target: Phase N.
- **BL-YYY: [item name]** — [brief description]. Target: Phase N.
```

- [ ] **Step 2: Commit**

```bash
git add docs/handoff-template.md
git commit -m "docs: update handoff template with BACKLOG.md BL-ID reference pattern"
```

---

### Task 7: Final verification and combined commit

- [ ] **Step 1: Verify all files are consistent**

1. Open `BACKLOG.md` — verify the active item count matches the summary table row count
2. Open `docs/backlog-archive.md` — verify it exists and has proper structure
3. Open `docs/backend-dependencies.md` — verify the deprecation header is present at the top
4. Open `CLAUDE.md` — verify:
   - Rule 8 references `BACKLOG.md` (not `backend-dependencies.md`)
   - Rule 11 exists after Rule 10
   - Directory map has `BACKLOG.md` row and deprecated `backend-dependencies.md` row
   - Task router "Planning" row has `BACKLOG.md` in "Also Load"
   - Task router "Starting any implementation unit" row mentions `BACKLOG.md`
   - Directory tree has `BACKLOG.md` entry
5. Open `docs/05-roadmap.md` — verify the "Backlog" column exists and counts match `BACKLOG.md`
6. Open `docs/handoff-template.md` — verify Section 3 has the `BL-XXX` pattern

- [ ] **Step 2: Run a cross-reference check**

Count items in `BACKLOG.md` by target phase. Compare those counts to the "Backlog" column in `docs/05-roadmap.md`. They must match exactly. Fix any mismatches.

- [ ] **Step 3: Push the branch**

```bash
git log --oneline -7
```

Verify all 6 commits are present, then push.
