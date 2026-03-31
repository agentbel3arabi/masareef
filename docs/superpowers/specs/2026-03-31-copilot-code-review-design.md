# Copilot Code Review — Design Spec

**Date:** 2026-03-31
**Status:** Approved

## Objective

Trigger GitHub Copilot to perform a full code quality audit of the Masareef codebase by creating two GitHub issues (one per layer) and assigning Copilot to each.

Claude's role is limited to: writing well-structured issue descriptions and creating/assigning the issues via the GitHub MCP. Claude performs no code analysis.

## Issues

### Issue 1 — Backend Code Review

**Title:** `[Code Review] Backend — Quality, Security & Best Practices Audit`

**Scope:** `backend/` directory

**Copilot is asked to review for:**
1. Code quality — dead code, unclear naming, overly complex functions
2. Refactoring opportunities — duplication, missing abstractions, logic that belongs in services vs. routers
3. Security risks — exposed secrets, SQL injection risk, missing auth checks, unvalidated inputs
4. FastAPI best practices — correct use of `Depends()`, background tasks, lifespan events
5. Pydantic V2 compliance — no `model.dict()` calls, correct validators, schema hygiene
6. Deviation from project conventions in `.github/COPILOT-INSTRUCTIONS.md` — money handling, household scoping, soft deletes, naming

**Expected output:** A markdown report saved to `docs/reports/code-review-backend.md` listing findings by category with severity (Critical / Warning / Suggestion) and file:line references.

---

### Issue 2 — Frontend Code Review

**Title:** `[Code Review] Frontend — Quality, Security & Best Practices Audit`

**Scope:** `frontend/` directory

**Copilot is asked to review for:**
1. Code quality — dead code, unclear naming, components doing too much
2. Refactoring opportunities — duplicated JSX, missing shared components, large files
3. Security risks — XSS vectors, unsafe use of `dangerouslySetInnerHTML`, exposed API keys, missing input sanitization
4. Next.js / React best practices — correct server vs. client component boundaries, missing `Suspense` / error boundaries, improper data fetching
5. RTL / logical CSS compliance — any physical directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`, `text-left`, `text-right`) that violate the RTL-first rule
6. Tailwind v4 + shadcn base-nova alignment — physical config in JS instead of CSS, use of forbidden component patterns (e.g. `asChild` instead of `render` prop)

**Expected output:** A markdown report saved to `docs/reports/code-review-frontend.md` listing findings by category with severity (Critical / Warning / Suggestion) and file:line references.

---

## Execution

1. Create backend issue via GitHub MCP → get issue number
2. Assign Copilot to backend issue via GitHub MCP
3. Create frontend issue via GitHub MCP → get issue number
4. Assign Copilot to frontend issue via GitHub MCP
5. Report both issue URLs back to user
