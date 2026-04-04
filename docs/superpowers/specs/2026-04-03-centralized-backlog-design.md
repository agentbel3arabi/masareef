# Design Spec: Centralized Backlog System

**Date:** 2026-04-03
**Status:** Draft
**Scope:** Docs reorganization — centralized tracking for deferred features, tech debt, bugs, new ideas, and backend dependencies

---

## Problem

During implementation, gaps and new requirements surface constantly — deferred features, tech debt, rework needs, backend dependencies, and new ideas. Currently these are scattered across:

- Handoff notes (`docs/superpowers/handoff/phase-*.md`) — "Known Gaps / Deferred" sections
- Design specs (`docs/superpowers/specs/*.md`) — "Out of Scope" / "Deferred" sections
- `docs/backend-dependencies.md` — UI elements waiting for backend endpoints
- `docs/05-roadmap.md` — static phase table that rarely updates

There is no centralized place to see all tracked items, no way to ensure deferred items from Phase 2 are reviewed when planning Phase 4, and no archive strategy to keep things manageable.

---

## Solution

A single `BACKLOG.md` file at the repo root with a hybrid format: summary table at the top for quick scanning, detail sections grouped by target phase below. Completed/cancelled items are periodically moved to `docs/backlog-archive.md` to keep the active file lean.

Three mandatory workflow checkpoints in CLAUDE.md enforce that the backlog is always updated and consulted.

---

## File Structure

```
masareef/
├── BACKLOG.md                          # Active backlog (summary table + detail sections)
├── docs/
│   ├── backlog-archive.md              # Completed/cancelled items moved here
│   ├── backend-dependencies.md         # DEPRECATED — replaced by BACKLOG.md
│   └── ...
```

- `BACKLOG.md` lives at repo root alongside `CLAUDE.md` for maximum visibility
- `docs/backlog-archive.md` holds resolved items, organized by the phase in which they were resolved
- `docs/backend-dependencies.md` gets a deprecation header pointing to `BACKLOG.md`; its 24 existing items are migrated into the backlog

---

## BACKLOG.md Format

### Header

```markdown
# Backlog

Centralized tracker for deferred features, tech debt, bugs, new ideas, and backend dependencies.
Completed items are archived in [`docs/backlog-archive.md`](docs/backlog-archive.md).

**Active items:** {count} | **By phase:** Phase 3.5 ({n}) · Phase 4 ({n}) · Phase 5+ ({n}) · Unscheduled ({n})
```

### Summary Table

```markdown
## Summary

| ID | Item | Category | Target | Priority | Status |
|----|------|----------|--------|----------|--------|
| BL-001 | N+1 FX queries in person balances | tech-debt | Phase 4+ | Low | ⏳ Open |
| BL-002 | Delete loan + linked transactions cascade | deferred | Phase 4 | Medium | ⏳ Open |
| BL-003 | Dashboard Plotly charts | deferred | Phase 4 | High | ⏳ Open |
| ...
```

### Detail Sections (grouped by target phase)

```markdown
---

## Phase 3.5 — UX Polish Sprint

### BL-019: Account balance trend indicator
- **Category:** backend-dep
- **Origin:** backend-dependencies.md #19
- **Priority:** Low
- **Context:** Accounts page shows no trend indicator (↑/↓). Needs `GET /api/v1/accounts/{id}/balance-history?period=month` to compare current balance to start-of-month.
- **Acceptance:** Account cards show a green up-arrow or red down-arrow next to the balance based on month-over-month change.
- **Status:** ⏳ Open

---

## Phase 4 — Dashboard & Charts

### BL-002: Delete loan and linked transactions cascade
- **Category:** deferred
- **Origin:** Phase 3D-4 handoff
- **Priority:** Medium
- **Context:** Delete dialog shows "Coming soon" for the "Delete loan and all linked transactions" option. Implementing requires cascading soft-delete of linked payment transactions with correct balance reversal logic.
- **Acceptance:** User can delete a loan and optionally soft-delete all linked payment transactions; account balances are correctly reversed.
- **Status:** ⏳ Open

---

## Unscheduled

### BL-045: Subscription auto-detection from transaction patterns
- **Category:** new-idea
- **Origin:** User suggestion, 2026-04-03
- **Priority:** —
- **Context:** Detect recurring charges from transaction history and surface them as subscriptions.
- **Status:** 💡 Idea
```

---

## Taxonomy

### Categories (5 types)

| Tag | Meaning | Example |
|-----|---------|---------|
| `deferred` | Planned in a spec but intentionally skipped | "Delete loan + transactions" cascade |
| `tech-debt` | Works but needs a better implementation | N+1 FX queries in person balances |
| `bug` | Found during implementation, not blocking current phase | Net worth card green on negative |
| `new-idea` | Not in the original roadmap at all | Subscription auto-detection |
| `backend-dep` | UI element waiting for a backend endpoint | Dashboard "Monthly Spending" stat card |

### Statuses

| Status | Meaning |
|--------|---------|
| ⏳ Open | Not yet started |
| 💡 Idea | New idea, not yet evaluated or scheduled |
| 🔨 In Progress | Being worked on in current phase |
| ✅ Done | Completed — moves to archive on next cleanup |
| ❌ Cancelled | Won't do — moves to archive on next cleanup |

### Priorities

`Critical` · `High` · `Medium` · `Low` · `—` (unrated, for new ideas)

### ID Format

`BL-NNN` — sequential, never reused. When an item is archived, its ID is retired.

---

## Archive Rules

### When to archive

- At the end of each completed phase (mandatory)
- When `BACKLOG.md` exceeds ~40 active items (recommended)
- On demand when the file feels unwieldy

### What moves

All items with status `✅ Done` or `❌ Cancelled`.

### Archive format

`docs/backlog-archive.md` has the same structure — summary table at top, detail sections grouped by **the phase in which the item was resolved** (not the phase it was originally targeted for). Each archived item gets two additional fields:

```markdown
### BL-002: Delete loan and linked transactions cascade
- **Category:** deferred
- **Origin:** Phase 3D-4 handoff
- **Resolved in:** Phase 4, PR #67
- **Resolution date:** 2026-05-15
- **Context:** ...
- **Status:** ✅ Done
```

### Cleanup process

1. Move all `✅ Done` and `❌ Cancelled` items from `BACKLOG.md` to `docs/backlog-archive.md`
2. Remove them from the active summary table
3. Add them to the archive summary table and the appropriate phase section
4. Update the active item count in the `BACKLOG.md` header

---

## Workflow Integration

Three mandatory checkpoints added to CLAUDE.md:

### Checkpoint A: End of every implementation unit (at handoff time)

Before writing the handoff note, the agent MUST:

1. Review all deferred items, discovered bugs, tech debt, or new ideas from the session
2. For each item, either:
   - Add it to `BACKLOG.md` with a new `BL-NNN` ID, category, origin, target phase, and priority
   - Or confirm it was already tracked (update existing item if needed)
3. Update the summary table and header counts
4. Reference the backlog IDs in the handoff note's "Known Gaps / Deferred" section (e.g., "See BL-042")

### Checkpoint B: Start of every phase plan

Before writing the implementation plan, the agent MUST:

1. Read `BACKLOG.md` and filter all items tagged for this phase
2. For each item, either:
   - Include it in the plan with a specific unit assignment — note the BL-ID in the plan
   - Or explicitly re-defer it to a later phase with a justification comment in the backlog item's detail
3. Update re-deferred items' target phase in both the summary table and detail section

### Checkpoint C: Phase completion

After all units in a phase are merged, the agent MUST:

1. Review all backlog items tagged for the completed phase
2. Mark resolved items as `✅ Done` with the PR reference
3. Mark items that were skipped again as re-deferred (update target phase)
4. Run the archive cleanup process (move Done/Cancelled to archive)
5. Update the summary counts

---

## Roadmap Integration

The `05-roadmap.md` phase overview table gets a new "Backlog" column showing the count of open items targeting that phase:

```markdown
| Phase | Name | Goal | Est. Effort | Backlog | Status |
|-------|------|------|-------------|---------|--------|
| 3.5 | UX Polish Sprint | Fix critical UX bugs... | Medium | 3 open | 🔨 In Progress |
| 4 | Dashboard & Charts | Net worth, spending... | Medium | 12 open | ⏳ Pending |
| 5 | Gam3eya | Rotating savings... | Medium | 2 open | ⏳ Pending |
```

This count is updated whenever `BACKLOG.md` changes. When unscheduled items accumulate significantly, a remediation phase (like 1.5 or 3.5) can be inserted into the roadmap.

---

## CLAUDE.md Changes

Update Rule 8 — replace the reference to `backend-dependencies.md` with `BACKLOG.md`:

> **8. Track every "coming soon" UI element in `BACKLOG.md`.** Any time frontend code shows `"—"`, a disabled button, a "Coming soon" tooltip, or a placeholder instead of real data — because the backend endpoint doesn't exist yet — add a row to `BACKLOG.md` with category `backend-dep`, the UI element name, the page, the exact endpoint needed, and the target phase.

Add new Rule 11:

> **11. Backlog is mandatory.** At the end of every implementation unit, extract all deferred items, bugs, tech debt, and new ideas into `BACKLOG.md` with a `BL-NNN` ID. At the start of every phase plan, pull all items tagged for that phase and either include them in the plan or explicitly re-defer them. At phase completion, archive resolved items to `docs/backlog-archive.md`. See `BACKLOG.md` header for format.

Add to Section B (Directory Map) table:

> | `BACKLOG.md` | Centralized tracker: deferred features, tech debt, bugs, new ideas, backend deps | Any implementation or planning task |

Add to Section C (Task Router) "Starting any implementation unit" row:

> Also load: `BACKLOG.md` — check for items tagged to current phase

Update Section C "Planning / prioritization" row:

> Also load: `BACKLOG.md`

---

## backend-dependencies.md Deprecation

The file gets a deprecation header:

```markdown
> **⚠️ DEPRECATED** — This file has been replaced by [`BACKLOG.md`](../BACKLOG.md).
> All items have been migrated. New backend dependency items go in `BACKLOG.md` with category `backend-dep`.
> This file is preserved for historical reference only.
```

No items are deleted — the file stays as-is for git history. New items go exclusively to `BACKLOG.md`.

---

## Backfill Scope

One-time migration to populate `BACKLOG.md` with existing deferred items from:

1. **All handoff notes** (`docs/superpowers/handoff/phase-*.md`) — "Known Gaps / Deferred" sections
2. **All 24 rows from `docs/backend-dependencies.md`**
3. **Design spec "Deferred" / "Out of Scope" sections** (`docs/superpowers/specs/*.md`)

Items that have clearly been resolved in later phases (e.g., "P2P types added in Phase 3B" when Phase 3B is complete) are added directly to the archive as `✅ Done`. Items that are still open get added to the active backlog.

### Deduplication rules

- If the same item appears in multiple handoff notes (e.g., deferred in 3A, mentioned again in 3B), create one backlog entry with the most recent origin
- If a backend-dependencies.md row and a handoff note describe the same gap, merge into one entry with category `backend-dep`
- Items that were deferred and later completed (confirmed by checking the codebase) go directly to the archive

---

## Handoff Template Update

Add to `docs/handoff-template.md` Section 3 (Known Gaps / Deferred):

```markdown
## 3. Known Gaps / Deferred

<!-- For each gap: add to BACKLOG.md if not already tracked, then reference the BL-ID here -->

- **BL-XXX: [item name]** — [brief description]. Target: Phase N.
- **BL-YYY: [item name]** — [brief description]. Target: Phase N.
```

---

## Implementation Summary

| Step | What | Files Changed |
|------|------|---------------|
| 1 | Create `BACKLOG.md` with backfilled items | New: `BACKLOG.md` |
| 2 | Create empty `docs/backlog-archive.md` with header | New: `docs/backlog-archive.md` |
| 3 | Deprecate `docs/backend-dependencies.md` | Modified: `docs/backend-dependencies.md` |
| 4 | Update `CLAUDE.md` — add Rule 11, update directory map, update task router | Modified: `CLAUDE.md` |
| 5 | Update `docs/05-roadmap.md` — add Backlog column to phase table | Modified: `docs/05-roadmap.md` |
| 6 | Update `docs/handoff-template.md` — add BL-ID reference pattern | Modified: `docs/handoff-template.md` |
