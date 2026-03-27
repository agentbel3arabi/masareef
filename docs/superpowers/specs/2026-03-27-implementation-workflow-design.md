# Implementation Workflow Design

How to execute Masareef's 20-phase roadmap using Claude Code with the Superpowers skill suite, without context drift.

---

## 1. Work Unit Decomposition

Each roadmap phase is broken into **work units** — small, testable chunks that fit in a single Claude conversation.

**Phase → Steps → Work Units**

Rules for work units:

- Each unit produces **runnable, testable code** — no half-built features
- Each unit ends with a **green test suite** (backend) or **working UI you can click through** (frontend)
- One conversation per work unit. If a unit runs long (context compression kicks in or you notice quality dropping), close the session with a handoff note and continue in a fresh conversation
- Each unit gets a **separate branch** → squash merged to main
- Backend units come before frontend units within a phase (APIs must exist before UI consumes them)

### Example: Phase 1 Decomposition

| Work Unit | Roadmap Steps | What Gets Built |
|-----------|---------------|-----------------|
| 1A: Project Scaffolding | 1-2 | FastAPI app skeleton, SQLAlchemy base, config, DB connection |
| 1B: Core Models | 3-7 | Household, Account, Category, Transaction, ExchangeRate models + migrations |
| 1C: Auth & Money Services | 8-10 | Pydantic schemas, auth dependency, money/balance services |
| 1D: Account & Category APIs | 11-13 | Account CRUD router, category router, balance computation |
| 1E: Transaction & Transfer APIs | 14-15 | Transaction CRUD + search + splits + bulk ops, transfer router |
| 1F: Frontend Shell | 16-20 | Next.js app shell, auth pages, TanStack Query, i18n, money utils |
| 1G: Accounts UI | 21-22 | Accounts page, account detail with transaction table |
| 1H: Transactions UI | 23-25 | Transaction form, transfer form, global transactions page |

Other phases follow the same pattern. Decomposition happens during the planning step before a phase begins.

---

## 2. Session Protocol

Every conversation follows three phases: **Load → Execute → Close.**

### Load Phase (start of session)

The user kicks off with a message like:

> "Continue Phase 1, work unit 1D: Account & Category APIs"

Claude then:

1. Reads the **plan file** for this work unit (`docs/superpowers/plans/phase-N/unit-X.md`)
2. Reads the **required docs** listed in the plan (feature specs, data models, etc.)
3. Reads the **session handoff note** if one exists from a prior session
4. Runs `git log --oneline -10` to see what was just built
5. Announces what it's about to do and confirms with the user

### Execute Phase (the work)

- **TDD** — write test first, then implement, then verify
- **Small commits** — commit after each meaningful piece works
- **Checkpoint questions** — if Claude encounters an ambiguity not covered by the spec, it asks instead of guessing

### Close Phase (end of session)

Before ending, Claude:

1. Runs the **full test suite** for the work unit
2. Creates a **session handoff note** at `docs/superpowers/handoff/phase-N-unit-X.md` containing:
   - What was completed
   - What's left in this work unit (if anything)
   - Any decisions made that aren't in the original spec
   - Any surprises or deviations to be aware of
3. Commits the handoff note

---

## 3. Anti-Drift Mechanisms

Five layers of protection, from cheapest to most thorough.

### Layer 1: CLAUDE.md as Guardrails (automatic)

CLAUDE.md encodes money rules, naming conventions, RLS enforcement, soft delete patterns, API envelope format, dependency injection patterns, and the task router. Claude reads this at session start. This is the passive defense layer.

### Layer 2: Plans Reference Specs (before execution)

Each work unit plan explicitly lists:

- Which doc files to read
- Which specific rules from CLAUDE.md apply
- Expected file outputs with paths
- Test expectations

The plan acts as a contract — Claude checks its work against the plan file, not against its memory.

### Layer 3: TDD Encodes the Spec (during execution)

Tests are written from the spec before implementation. Examples:

- Money stored as integers, not floats
- Signed vs. absolute amounts in the right places
- `household_id` filtering on every query
- Soft delete (`is_active = TRUE`) in every query
- API response envelope format

If Claude drifts, the test fails.

### Layer 4: Verification Before Completion (end of work unit)

Before Claude claims a work unit is done, it must:

1. Run the test suite and show passing output
2. Grep for known anti-patterns:
   - `float` near money fields
   - `pl-` or `pr-` in frontend CSS (should be `ps-` / `pe-`)
   - `model.dict()` (should be `model.model_dump()`)
   - Missing `household_id` in queries
   - Missing `is_active = TRUE` in queries
3. Confirm every endpoint follows the response envelope format
4. Confirm no feature was added that isn't in the spec

### Layer 5: Code Review at PR Time (before merge)

Use the requesting-code-review skill for a structured review against:

- The original plan
- CLAUDE.md conventions
- The feature spec

GitHub Copilot reviews in parallel.

---

## 4. Phase Execution Lifecycle

### Before a Phase Starts

1. **Brainstorm** (brainstorming skill) — only if the phase has ambiguities or you want to adjust scope. Phases with clear specs can skip to planning.
2. **Write plans** (writing-plans skill) — creates a plan file for each work unit. All plans are written before any code. Plans live at `docs/superpowers/plans/phase-N/unit-X.md`.
3. **Review plans** — user reads, adjusts, approves.

### During a Phase

4. **Execute work units in order** — one conversation per unit, following the session protocol.
5. **Backend before frontend** — backend produces API endpoints + tests, frontend consumes them.
6. **User tests in the browser** — especially for frontend units.

### After a Phase Completes

7. **Phase verification** — run full test suite, confirm all success criteria from the roadmap.
8. **Phase retrospective** — handoff note for the entire phase at `docs/superpowers/handoff/phase-N-complete.md`.
9. **Tag the commit** — `phase-N-complete` on main after all work unit branches are merged.

### Phase Dependencies

The roadmap defines dependencies. Each phase's "Required reading" tells Claude what earlier work matters. The test suite from prior phases is the regression safety net.

---

## 5. Roles

### User Owns

- **Approve plans before execution** — never let Claude code without a reviewed plan
- **Approve PRs before merge** — even if CI passes
- **Supabase console actions** — manual steps like enabling auth providers; Claude provides exact instructions
- **Scope decisions** — Claude asks, user decides
- **Visual verification** — run the app, click through, flag issues

### Claude Owns

- Reading the right docs before coding
- Writing tests before implementation
- Following CLAUDE.md conventions
- Creating session handoff notes
- Never claiming "done" without running tests and showing output

### Frontend Guidance

The user is experienced in Python but new to frontend. For frontend work units:

- Claude handles Next.js, shadcn/ui, Tailwind, TanStack Query implementation
- User verifies visually in the browser (`pnpm dev`)
- Claude explains non-obvious patterns only when asked
- Design tokens + Stitch HTML files constrain UI decisions
- Screenshots or descriptions from user are sufficient for bug reports

---

## 6. Directory Structure

```
docs/superpowers/
├── specs/                              # Brainstorming outputs
│   └── 2026-03-27-implementation-workflow-design.md  # This file
├── plans/                              # Work unit plans (per phase)
│   ├── phase-1/
│   │   ├── unit-1A.md
│   │   ├── unit-1B.md
│   │   └── ...
│   ├── phase-2/
│   └── ...
└── handoff/                            # Session handoff notes
    ├── phase-1-unit-1A.md
    ├── phase-1-unit-1B.md
    ├── phase-1-complete.md
    └── ...
```

---

## 7. Quick Reference — Starting a Session

Copy-paste template for starting any work unit conversation:

```
Continue Phase [N], work unit [X]: [Name].
Plan: docs/superpowers/plans/phase-N/unit-X.md
Handoff: docs/superpowers/handoff/phase-N-unit-X.md (if exists)
```

Claude will read CLAUDE.md automatically, then load the plan, handoff note, and required docs before starting.
