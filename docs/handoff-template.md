# Session Handoff Note — Phase {N}, Unit {X}: {Title}

**Date:** {date}
**PR:** #{number} — {title}
**Branch:** {branch}

---

## 1. What Was Completed

List every deliverable with its file path and a one-line description.

**New files:**
- `path/to/file.py` — reason/purpose

**Modified files:**
- `path/to/file.py` — what changed and why

---

## 2. Key Decisions & Rationale

Architectural choices made during this unit that aren't obvious from the code. Future sessions must know *why*, not just *what*.

- **Decision name** — rationale. Include trade-offs and any alternatives rejected.

---

## 3. Known Gaps / Deferred

<!-- For each gap: add to BACKLOG.md if not already tracked, then reference the BL-ID here -->

What is *not* done and why. Every item listed here MUST also exist in `BACKLOG.md` with a `BL-NNN` ID.

- **BL-XXX: [item name]** — [brief description]. Target: Phase N.
- **BL-YYY: [item name]** — [brief description]. Target: Phase N.

---

## 4. What's Next

The next unit slug, plan file, and any critical context to pick up immediately.

- Next unit: `phase-N-unit-X+1` — `docs/superpowers/plans/phase-N/unit-X+1.md`
- First thing to do: ...
- Dependencies or prerequisites to verify before starting

---

## 5. PRs Merged

- **PR #{number}** — {title} — merged ✅ / closed ❌

---

## 6. Test Status

- Unit tests: {N} passed, {N} failed
- Integration tests: passed / skipped (requires DB credentials)
- CI: green / red — {note if red}

---

## 7. Notes / Surprises

Anything unexpected encountered that the next session should know about: gotchas, fragile areas, temporary workarounds.
