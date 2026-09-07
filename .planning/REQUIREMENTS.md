# Requirements: Masareef (مصاريف)

**Defined:** 2026-04-07
**Core Value:** Users can track all their money — across accounts, currencies, debts, and household members — in one Arabic-first platform that understands Egyptian financial patterns.

## v1 Requirements

Requirements for MVP launch. Each maps to roadmap phases.

### Stabilization

- [ ] **STAB-01**: Documentation consolidated — CLAUDE.md, roadmap, feature specs cleaned up to remove conflicts and align with GSD workflow
- [ ] **STAB-02**: Roadmap updated — Phase 3.8 marked complete, stale status corrected
- [ ] **STAB-03**: All open bugs from BACKLOG.md are fixed
- [ ] **STAB-04**: N+1 query patterns resolved (BL-027, BL-028, BL-029)
- [ ] **STAB-05**: Frontend test infrastructure set up (Vitest + React Testing Library + CI)
- [ ] **STAB-06**: Code refactored for consistent patterns, dead code removed
- [ ] **STAB-07**: RBAC guards applied to all routers (BL-032)

### Dashboard & Charts

- [ ] **DASH-01**: User can view income vs expenses bar chart on dashboard
- [ ] **DASH-02**: User can view spending by category donut chart on dashboard
- [ ] **DASH-03**: User can see active debts stat card on dashboard
- [ ] **DASH-04**: User can see upcoming payments stat card on dashboard
- [ ] **DASH-05**: User can compare current month vs previous month spending
- [ ] **DASH-06**: User can see net worth trend chart over time (multi-currency)

### AI Categorization

- [ ] **AICAT-01**: System auto-applies rules from user corrections (3+ corrections = auto-rule)
- [ ] **AICAT-02**: System falls back to LLM (Claude/OpenAI) for unknown merchants
- [x] **AICAT-03**: User can review and approve/reject AI categorization suggestions
- [ ] **AICAT-04**: User can manage categorization rules (view, edit, delete)

### Budgets & Savings

- [ ] **BUDG-01**: User can create monthly envelope budgets per category
- [ ] **BUDG-02**: User can see budget progress (spent vs limit) per category
- [ ] **BUDG-03**: User can create savings goals with target amounts
- [ ] **BUDG-04**: User can track savings goal progress

### Gam3eya

- [ ] **GAM-01**: User can create a Gam3eya group (members, amount, rotation)
- [ ] **GAM-02**: User can record monthly payments per member
- [ ] **GAM-03**: User can see payout schedule with expected dates
- [ ] **GAM-04**: User can mark payouts as received

### Notifications

- [ ] **NOTF-01**: User receives in-app notifications (bell icon with list)
- [ ] **NOTF-02**: User receives email reminders for upcoming bill payments
- [ ] **NOTF-03**: User receives alerts when approaching/exceeding budget limits
- [ ] **NOTF-04**: User can configure notification preferences

### Settings & Polish

- [ ] **SETT-01**: User can access settings pages (locale, currency, preferences)
- [ ] **SETT-02**: User can manage their data (export, delete account)
- [ ] **SETT-03**: New user sees onboarding wizard on first login

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Forecasting

- **FCST-01**: User can view 12-month cash flow projection
- **FCST-02**: User can see debt payoff timeline
- **FCST-03**: System detects recurring transactions automatically

### Asset Tracking

- **ASST-01**: User can add assets (car, property, gold, savings certificates)
- **ASST-02**: User can update asset valuations over time
- **ASST-03**: Assets are included in net worth calculation
- **ASST-04**: User can link expenses to assets (cost of ownership)

### Multi-User & Household

- **MUSER-01**: User can invite household members via email/link
- **MUSER-02**: Roles (admin, member, child) with appropriate permissions
- **MUSER-03**: Activity log shows who changed what

### Reports & Export

- **REPT-01**: User can export transactions as CSV
- **REPT-02**: User can generate PDF financial reports (Arabic RTL)
- **REPT-03**: User can generate Excel reports
- **REPT-04**: 7 report types available (spending, income, net worth, etc.)

### Additional Features

- **TGBOT-01**: User can log expenses via Telegram bot
- **SCAN-01**: User can import scanned PDF bank statements (OCR)
- **RCPT-01**: User can scan receipts and auto-create transactions
- **SUB-01**: System auto-detects recurring charges
- **ISLM-01**: User can calculate Zakat on eligible assets
- **SCEN-01**: User can run what-if forecasting simulations
- **PWA-01**: App installable as PWA with offline support

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native mobile app (iOS/Android) | PWA-first strategy, native deferred indefinitely |
| Open Banking API integration | No Egyptian open banking standard exists yet |
| Crypto/DeFi tracking | Not relevant to target MENA audience |
| AI financial advice | Regulatory risk — categorization only, no recommendations |
| Social features / leaderboards | Privacy-sensitive financial data should not be social |
| Real-time stock price feeds | Finance app, not trading platform |
| Double-entry accounting | Personal finance, not business accounting |
| WhatsApp bot | API costs too high for target market |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 1 | Pending |
| STAB-02 | Phase 1 | Pending |
| STAB-03 | Phase 1 | Pending |
| STAB-04 | Phase 1 | Pending |
| STAB-05 | Phase 1 | Pending |
| STAB-06 | Phase 1 | Pending |
| STAB-07 | Phase 1 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| DASH-05 | Phase 2 | Pending |
| DASH-06 | Phase 2 | Pending |
| AICAT-01 | Phase 3 | Pending |
| AICAT-02 | Phase 3 | Pending |
| AICAT-03 | Phase 3 | Complete |
| AICAT-04 | Phase 3 | Pending |
| BUDG-01 | Phase 4 | Pending |
| BUDG-02 | Phase 4 | Pending |
| BUDG-03 | Phase 4 | Pending |
| BUDG-04 | Phase 4 | Pending |
| GAM-01 | Phase 5 | Pending |
| GAM-02 | Phase 5 | Pending |
| GAM-03 | Phase 5 | Pending |
| GAM-04 | Phase 5 | Pending |
| NOTF-01 | Phase 6 | Pending |
| NOTF-02 | Phase 6 | Pending |
| NOTF-03 | Phase 6 | Pending |
| NOTF-04 | Phase 6 | Pending |
| SETT-01 | Phase 7 | Pending |
| SETT-02 | Phase 7 | Pending |
| SETT-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32/32 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after roadmap creation*
