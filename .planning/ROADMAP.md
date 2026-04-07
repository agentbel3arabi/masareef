# Roadmap: Masareef (مصاريف)

## Overview

Masareef has completed its foundation (Phases 1–3.8): accounts, transactions, imports, debts, categories, UX polish, and financial institutions. This roadmap covers the remaining work to MVP launch — stabilization first to clean up what's built, then Dashboard, AI Categorization, Budgets, Gam3eya, Notifications, and Settings to deliver a complete, launch-ready product. All 32 v1 requirements map to 7 phases. Execution is sequential.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Stabilization** - Fix bugs, eliminate tech debt, add test infrastructure, and clean up documentation before any new features
- [ ] **Phase 2: Dashboard & Charts** - Plotly-powered spending charts, stat cards, and net worth visualization
- [ ] **Phase 3: AI Categorization** - Rules engine + LLM fallback pipeline with user feedback loop
- [ ] **Phase 4: Budgets & Savings** - Envelope budgeting by category with savings goal tracking
- [ ] **Phase 5: Gam3eya** - Rotating savings club management with payment scheduling and payout tracking
- [ ] **Phase 6: Notifications** - In-app, email, and scheduled reminders for bills and budget alerts
- [ ] **Phase 7: Settings & Polish** - Settings pages, data management, and onboarding wizard

## Phase Details

### Phase 1: Stabilization
**Goal**: The codebase is clean, documented, and tested — ready to build on without carrying forward known bugs or technical debt
**Depends on**: Nothing (first phase)
**Requirements**: STAB-01, STAB-02, STAB-03, STAB-04, STAB-05, STAB-06, STAB-07
**Success Criteria** (what must be TRUE):
  1. CLAUDE.md, roadmap, and feature specs have no conflicting information and accurately reflect the current codebase state
  2. All open bugs listed in BACKLOG.md are resolved and closed
  3. N+1 query patterns (BL-027, BL-028, BL-029) are eliminated and database query count is verifiable in dev
  4. Frontend test infrastructure runs in CI — Vitest + React Testing Library installed, at least one test per major component
  5. All backend routers have RBAC guards applied and unauthorized access returns 403
**Plans:** 7 plans

Plans:
- [ ] 01-01-PLAN.md — Documentation audit and BACKLOG.md re-tagging
- [ ] 01-02-PLAN.md — Verify BL-029 fix, remove stale TODO, close backlog item
- [ ] 01-03-PLAN.md — N+1 query elimination (BL-027 FX batch, BL-028 balance batch)
- [ ] 01-04-PLAN.md — Frontend test infrastructure setup + CI coverage thresholds
- [ ] 01-05-PLAN.md — Frontend test writing (30-50 tests) + backend test expansion
- [ ] 01-06-PLAN.md — RBAC hardening (BL-032) + light auth audit
- [ ] 01-07-PLAN.md — Code refactor, dead code removal, font weight consolidation

### Phase 2: Dashboard & Charts
**Goal**: Users can see their financial picture at a glance through Plotly-powered charts and stat cards on the dashboard
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. User can see an income vs. expenses bar chart on the dashboard that updates when transactions are added
  2. User can see a spending-by-category donut chart that reflects categorized transactions
  3. User can see stat cards showing active debts and upcoming payment amounts
  4. User can toggle between current month and previous month to compare spending
  5. User can see a net worth trend chart that correctly handles multi-currency balances
**Plans**: TBD

Plans:
- [ ] 02-01: Dashboard aggregation endpoints — `/api/v1/dashboard/*` with SQL GROUP BY aggregations
- [ ] 02-02: Income vs. expenses chart — Plotly bar chart with lazy-loading (plotly.js-dist, ssr:false)
- [ ] 02-03: Spending by category chart — donut chart wired to category aggregation endpoint
- [ ] 02-04: Stat cards — active debts and upcoming payments using existing debt/transaction data
- [ ] 02-05: Net worth trend — multi-currency net worth computation and Plotly line chart
- [ ] 02-06: Month comparison toggle — UI control to switch period and re-fetch chart data
**UI hint**: yes

### Phase 3: AI Categorization
**Goal**: Imported transactions get categorized automatically — rules engine handles known merchants, LLM handles unknowns, user corrections create new rules
**Depends on**: Phase 2
**Requirements**: AICAT-01, AICAT-02, AICAT-03, AICAT-04
**Success Criteria** (what must be TRUE):
  1. After a user corrects the same merchant 3 times, the system auto-applies that correction to future imports without prompting
  2. For merchants with no existing rule, the system calls an LLM provider and applies the returned category
  3. User can review a list of AI-suggested categorizations and approve or reject each one individually
  4. User can view all saved categorization rules and delete or edit any of them
**Plans**: TBD

Plans:
- [ ] 03-01: Categorization rules schema and service — `categorization_rules` table, rule match engine
- [ ] 03-02: LLM fallback pipeline — litellm + instructor integration, multi-provider routing
- [ ] 03-03: Background categorization job — BackgroundTasks trigger after import commit
- [ ] 03-04: User review interface — approve/reject suggestions UI with batch actions
- [ ] 03-05: Rules management page — view, edit, delete categorization rules
**UI hint**: yes

### Phase 4: Budgets & Savings
**Goal**: Users can set monthly spending limits per category and track savings targets with progress indicators
**Depends on**: Phase 3
**Requirements**: BUDG-01, BUDG-02, BUDG-03, BUDG-04
**Success Criteria** (what must be TRUE):
  1. User can create a monthly budget that assigns a spending limit to one or more categories
  2. User can see a progress bar for each budget category showing amount spent vs. limit, updated in real time
  3. User can create a savings goal with a target amount and target date
  4. User can see savings goal progress showing current amount saved vs. target
**Plans**: TBD

Plans:
- [ ] 04-01: Budgets data model and API — `budgets`, `budget_categories` tables, CRUD endpoints
- [ ] 04-02: Budget progress computation — spending-vs-limit aggregation with multi-currency awareness
- [ ] 04-03: Budgets UI — budget creation form, category limit assignment, progress view
- [ ] 04-04: Savings goals API — `savings_goals` table, CRUD endpoints, progress computation
- [ ] 04-05: Savings goals UI — goal creation form, progress tracker, goal completion state
**UI hint**: yes

### Phase 5: Gam3eya
**Goal**: Users can manage rotating savings clubs — create groups, record payments, track the payout schedule, and mark received payouts
**Depends on**: Phase 4
**Requirements**: GAM-01, GAM-02, GAM-03, GAM-04
**Success Criteria** (what must be TRUE):
  1. User can create a Gam3eya group by specifying members, monthly contribution amount, and rotation order
  2. User can record a monthly payment from any member and see the group's payment status for that cycle
  3. User can view a full payout schedule showing which member receives the pool each month and on what expected date
  4. User can mark a payout as received and see the group history reflect the completed payout
**Plans**: TBD

Plans:
- [ ] 05-01: Gam3eya data model and API — `gam3eyas`, `gam3eya_members`, `gam3eya_payments` tables, CRUD endpoints
- [ ] 05-02: Payment recording and cycle management — payment creation, cycle completion logic
- [ ] 05-03: Payout schedule computation — rotation order → expected dates algorithm
- [ ] 05-04: Gam3eya UI — group creation, member management, payment recording form
- [ ] 05-05: Payout schedule view and mark-as-received — schedule display, payout confirmation flow
**UI hint**: yes

### Phase 6: Notifications
**Goal**: Users receive timely alerts for upcoming bills, budget threshold crossings, and Gam3eya payment reminders via in-app notifications and email
**Depends on**: Phase 5
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04
**Success Criteria** (what must be TRUE):
  1. User sees a notification bell icon that increments when new notifications arrive and can open a list of all notifications
  2. User receives an email reminder 3 days before an upcoming bill payment is due
  3. User receives an in-app alert when their spending reaches 80% and again at 100% of a budget limit
  4. User can open notification preferences and toggle each notification type on or off per channel (in-app, email)
**Plans**: TBD

Plans:
- [ ] 06-01: Notifications data model and API — `notifications` table, in-app delivery via Supabase Realtime
- [ ] 06-02: Email delivery — Resend integration, bill reminder email templates (Arabic RTL)
- [ ] 06-03: Scheduled bill reminders — APScheduler job scanning upcoming payments, 3-day advance trigger
- [ ] 06-04: Budget threshold alerts — event hook on transaction create/update that checks budget limits
- [ ] 06-05: Notification bell UI and preferences page — badge counter, notification list, channel toggles
**UI hint**: yes

### Phase 7: Settings & Polish
**Goal**: Users can configure the app to their preferences, export or delete their data, and new users are guided through setup via an onboarding wizard
**Depends on**: Phase 6
**Requirements**: SETT-01, SETT-02, SETT-03
**Success Criteria** (what must be TRUE):
  1. User can open a settings page and change locale (Arabic/English), default currency, and display preferences — changes take effect immediately
  2. User can export all their transaction data as a file download
  3. User can permanently delete their account and all associated data
  4. A new user who has never logged in before sees a step-by-step onboarding wizard that guides them through creating their first account
**Plans**: TBD

Plans:
- [ ] 07-01: Settings pages — locale, currency, display preferences with immediate effect
- [ ] 07-02: Data export endpoint — transactions CSV export, async generation for large datasets
- [ ] 07-03: Account deletion flow — soft-delete cascade, confirmation step, data purge
- [ ] 07-04: Onboarding wizard — first-login detection, step-by-step account setup flow
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Stabilization | 0/7 | Planning complete | - |
| 2. Dashboard & Charts | 0/6 | Not started | - |
| 3. AI Categorization | 0/5 | Not started | - |
| 4. Budgets & Savings | 0/5 | Not started | - |
| 5. Gam3eya | 0/5 | Not started | - |
| 6. Notifications | 0/5 | Not started | - |
| 7. Settings & Polish | 0/4 | Not started | - |
