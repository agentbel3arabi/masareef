# Unit Execution Workflow

How to execute Masareef work units from planning through code review and merge.

---

## 1. Unit Execution Workflow

Every work unit follows an 8-step process from plan to production:

### Step 1: Plan
Write or review the plan file at `docs/superpowers/plans/phase-N/unit-X.md`. The plan includes:
- Which docs to read
- Deliverables and file paths
- Test expectations
- Known decisions and constraints
User approves the plan before execution proceeds.

### Step 2: Branch
Cut a feature branch from `main`:
```bash
git checkout main
git pull
git checkout -b feature/N-short-slug
```
Each unit gets its own branch; backend units branch first, then frontend units consume their APIs.

### Step 3: Execute
Follow **test-driven development (TDD)**:
- Write tests first from the spec
- Implement the feature to make tests pass
- Commit frequently (after each meaningful piece works)
- Verify against the plan file, not memory

Load the required docs at session start (`CLAUDE.md` + plan file + feature spec + handoff note if one exists).

### Step 4: Push
Push the branch to origin:
```bash
git push -u origin feature/N-short-slug
```

### Step 5: PR
Open a Pull Request on GitHub. Include:
- Concise title (under 70 characters)
- Summary of changes (2-3 bullet points)
- Link to the related plan file
- Any decisions or deviations from the spec

### Step 6: Review
**Request Copilot code review via the GitHub UI** — this is mandatory for every PR. Wait for the review to complete before merging. Copilot checks:
- Adherence to CLAUDE.md conventions
- Spec completeness
- Code quality and patterns
- Test coverage

If Copilot flags issues, fix them on the same branch and re-push; the review updates automatically.

### Step 7: UAT
After PR passes CI and Copilot review, run through the UAT checklist at `docs/guides/12-uat-template.md`:
- Functional acceptance: does the feature work as spec'd?
- Edge cases: are boundary conditions handled?
- Regression: does the full test suite pass?
- Frontend visual (if applicable): click through the UI, verify against Stitch designs

Critical bugs discovered during UAT get a fix commit on the same branch, then re-run tests before proceeding to merge.

### Step 8: Merge
Squash merge the PR to `main`:
- GitHub UI: "Squash and merge"
- Head branch is auto-deleted after merge
- `main` history remains linear and readable

---

## 2. Branch Naming

Follow these conventions strictly:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/N-short-slug` | `feature/42-account-balance-endpoint` |
| Bug fix | `fix/N-short-slug` | `fix/87-transaction-split-cascade` |
| Chore | `chore/short-slug` | `chore/update-dependencies` |

Use kebab-case for the slug. Omit the "N-" prefix for chores.

---

## 3. Commit Style — Conventional Commits

Every commit follows the format: `type(scope): subject`

### Commit Types

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build, deps, tooling |
| `ci` | CI/CD configuration |

### Commit Scopes

Use the feature area: `accounts`, `transactions`, `debts`, `gam3eya`, `budgets`, `forecasting`, `frontend`, `ci`, `auth`, etc.

### Examples

```
feat(accounts): add balance recalculation endpoint
fix(transactions): correct soft-delete cascade for splits
test(debts): add payment amortization tests
chore(deps): update pydantic to 2.7.1
ci(backend): add pyright type-check step
```

Commit frequently during execution (after each test passes, after each meaningful chunk). Keep commits atomic — one logical change per commit.

---

## 4. Copilot Code Review

**Mandatory for every PR.** Request review via GitHub UI after CI passes:

1. On the PR page, go to **"Reviewers"** on the right sidebar
2. Click the gear icon → **"Request Copilot review"**
3. Wait for the review to complete (typically 2–5 minutes)
4. Read the review feedback — Copilot checks:
   - Spec compliance (did you build what was planned?)
   - CLAUDE.md conventions (naming, money rules, soft deletes, RLS, envelopes)
   - Code quality (duplication, clarity, error handling)
   - Test coverage (is the spec adequately tested?)
5. If issues are found, fix them on the same branch and push again
6. Copilot review auto-updates; re-request if needed

Do not merge until Copilot review is complete and any flagged issues are resolved.

---

## 5. UAT Process

After PR CI passes and Copilot review is approved, run user acceptance testing:

1. Load `docs/guides/12-uat-template.md` — this file contains the UAT checklist
2. Run through all items systematically:
   - **Spec compliance**: does the implementation match the feature spec behavior + API contracts?
   - **Edge cases**: are boundary conditions (empty states, errors, limits) handled correctly?
   - **Regression**: run the full test suite; all tests must pass
   - **Frontend visuals** (if applicable): click through the UI in `pnpm dev`; verify layouts, forms, tables against the corresponding Stitch design screens
3. Document any issues found
4. **Critical bugs** (spec violation or crash): create a fix commit on the same branch, re-run tests, then re-verify the fix
5. **Minor issues** (polish, wording, cosmetic): create a new work unit or defer to a later phase
6. Once UAT passes, proceed to merge

---

## 6. Merge Strategy

**Squash merge only** — no merge commits, no rebase merges.

### Why Squash Merge?

- Keeps `main` history linear and readable
- Each PR becomes one logical commit on `main`
- Easy to revert a whole feature with one `git revert`
- Aligns with the "one PR = one work unit" model

### How to Merge

1. Go to the PR on GitHub
2. Click **"Squash and merge"**
3. Edit the commit message to follow Conventional Commits format (e.g., `feat(accounts): add balance recalculation endpoint`)
4. Confirm — head branch auto-deletes
5. Verify main advanced by one commit: `git log --oneline -1`

### Merge Blockers

Do not merge if:
- CI is not passing
- Copilot review is not complete or flagged blocking issues
- UAT found critical bugs (must be fixed first)

---

## Quick Reference

**Session start template** (copy and paste):

```
Continue Phase [N], work unit [X]: [Name].
Plan: docs/superpowers/plans/phase-N/unit-X.md
Handoff: docs/superpowers/handoff/phase-N-unit-X.md (if exists)
```

Claude will load CLAUDE.md automatically, then the plan, handoff note, and required docs.

**Execution checklist**:
- [ ] Plan approved by user
- [ ] Branch cut from `main`
- [ ] TDD: tests written before implementation
- [ ] All tests passing
- [ ] Commits follow Conventional Commits format
- [ ] Branch pushed to origin
- [ ] PR opened with clear description
- [ ] Copilot review requested and approved
- [ ] UAT checklist run (docs/guides/12-uat-template.md)
- [ ] Squash merged to main
- [ ] Head branch auto-deleted

---
