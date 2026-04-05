# Phase 3.8 Financial Institutions — UAT Report

**Date:** 2026-04-05
**Tester:** Claude (automated browser testing via Cowork)
**Environment:** `http://gharibs-server.taild56824.ts.net:3002/`
**Scope:** Phase 3.8 Financial Institutions implementation

---

## Summary

| Area | Result |
|------|--------|
| Accounts page layout (institution grouping) | ✅ PASS |
| Account creation — all 5 types | ✅ PASS (with bugs) |
| Institution selector (search, popular, other) | ✅ PASS |
| Bank detail page | ✅ PASS |
| Opening Balance transactions | ✅ PASS |
| Account deletion (manage mode) | ⚠️ PARTIAL (missing confirm dialog) |
| RTL / Arabic mode | ✅ PASS (with minor issues) |
| Responsiveness | ✅ PASS |

**Bugs found:** 13 (5 critical, 3 moderate, 3 minor, 2 untested/unverified)
**Feature gaps / design enhancements:** 4
**Observations (not bugs):** 2

---

## Test Results

### 1. Accounts Page Layout

**URL:** `/accounts`

| Check | Result | Notes |
|-------|--------|-------|
| Section ordering: Banks → Digital Wallets → Cash Wallets | ✅ | Financing App section correctly removed when last account deleted |
| Bank groups show institution name + account count | ✅ | "Commercial International Bank · 2 accounts" |
| Bank groups show total balance | ✅ | 11,500.00 EGP (correct: 15,000 − 3,500) |
| Collapse/expand chevron on bank groups | ✅ | Chevron toggles, accounts hide/show |
| FAB button visible at bottom-right | ✅ | Fixed position, correct `end-6` logical CSS |
| Net Worth header: Assets / Liabilities | ✅ | 15,000 / 3,500 correct |
| Currency switcher (EGP/USD/SAR) | ✅ | Present and selectable |
| Section hides when last account deleted | ✅ | Financing App section disappeared after ValU deletion |

**Account cards verified:**
- ✅ Bank Account card (CIB Current Account): name, type label, balance, ACTIVE badge
- ✅ Credit Card (CIB Visa Card): dark card design, masked number (•••• 1105), CARDHOLDER field, utilization bar, credit stats
- ✅ Financing App (ValU Account): BNPL purple badge, purple left border accent
- ✅ Digital Wallet (Vodafone Cash): correct icon
- ✅ Cash Wallet (My Cash): correct section, no institution

---

### 2. Add Account Dialog — Institution Selector

**URL:** `/accounts` → FAB → Add Account dialog

| Check | Result | Notes |
|-------|--------|-------|
| Dialog opens blank on each launch (form reset) | ✅ | Fixed — form no longer retains previous state |
| POPULAR section shows top banks | ✅ | National Bank of Egypt, Banque Misr, CIB, QNB Alahli, HSBC Egypt |
| English search | ✅ | "national" → Arab African Int'l, CIB, National Bank of Egypt |
| Arabic search | ✅ | "مصر" → correctly returns banks with Arabic name containing مصر |
| "Other bank…" link appears in filtered results | ✅ | Appears at bottom of filtered list |
| "Other bank…" reveals custom institution form | ✅ | English Name + Arabic Name fields, Add + Change buttons |
| Arabic Name placeholder is RTL | ✅ | "مثال: بنكي" right-aligned |
| Institution selector absent for cash wallet type | ✅ | No institution field when Type = Cash Wallet |

---

### 3. Account Creation — All 5 Types

| Type | Created | Institution | Opening Balance | Result |
|------|---------|-------------|----------------|--------|
| Bank Account | ✅ | CIB | 15,000 EGP | ✅ |
| Credit Card | ✅ | CIB | 3,500 EGP (outstanding) | ✅ |
| Financing App | ✅ | ValU | 0 | ✅ (later deleted) |
| Digital Wallet | ✅ | Vodafone Cash | 0 | ✅ |
| Cash Wallet | ✅ | — (no institution) | 0 | ✅ |

---

### 4. Bank Detail Page

**URL:** `/accounts/bank/cib`

| Check | Result | Notes |
|-------|--------|-------|
| Navigates from bank group header click | ✅ | Clicking institution name navigates to `/accounts/bank/cib` |
| "Back to Accounts" link navigates correctly | ✅ | Returns to `/accounts` |
| Institution logo displayed | ❌ | Broken image — see Bug #1 |
| English name displayed | ✅ | "Commercial International Bank" |
| Arabic name displayed | ✅ | "البنك التجاري الدولي" |
| Account count | ✅ | "2 accounts" |
| Total Deposits stat | ✅ | 15,000.00 |
| Total Credit Used stat | ✅ | 3,500.00 (red) |
| Available Credit stat | ✅ | 46,500.00 (50,000 − 3,500) |
| Net Position stat | ✅ | 11,500.00 (15,000 − 3,500) |
| Account list shows all bank accounts | ✅ | CIB Current Account + CIB Visa Card |

---

### 5. Opening Balance Transactions

**URL:** `/transactions`

| Check | Result | Notes |
|-------|--------|-------|
| Opening Balance created for bank account (15,000 EGP) | ✅ | Date: 05/04/2026, CIB Current Account |
| Opening Balance created for credit card (−3,500 EGP) | ✅ | Date: 05/04/2026, CIB Visa Card, shown as debit |
| Transaction count updates correctly | ✅ | 3 transactions total (includes 1 pre-existing) |

**Bug #9 (new):** Opening balance transactions show no institution/bank info — only the account badge (e.g., "CIB Current Account") but no institution group column. The third legacy transaction (01/01/2026, +103,245.36) shows neither account nor institution, indicating deleted/legacy accounts produce truly orphaned transactions with no label. See Bug #9 below.

---

### 6. Account Deletion (Manage Mode)

**URL:** `/accounts` → Manage → select → Delete Selected

| Check | Result | Notes |
|-------|--------|-------|
| Manage mode activates (Cancel button, checkboxes) | ✅ | All account cards show checkboxes |
| Selecting account shows count + Delete Selected button | ✅ | "1 account selected", red Delete Selected button |
| Confirmation dialog before deletion | ❌ | **Bug #7 — no confirm dialog** |
| Account removed from list after deletion | ✅ | ValU Account removed immediately |
| Section hides when last account in section deleted | ✅ | Financing App section disappeared |
| Success toast after deletion | ⚠️ | Not observed (may have appeared briefly) |
| Deleted account's transactions removed from `/transactions` | ❌ | **Bug #12 — not verified** — transaction list not re-checked after deletion |
| Deleting a transfer removes both transaction legs | ❌ | **Bug #13 — not tested** — not tested in this session |

---

### 7. RTL / Arabic Mode

**Accessed via:** AG avatar → العربية

| Check | Result | Notes |
|-------|--------|-------|
| Language switch from user menu | ✅ | "العربية" toggle in avatar dropdown |
| Sidebar mirrors to right side | ✅ | Full RTL layout flip |
| All nav labels translated to Arabic | ✅ | الحسابات, المعاملات, التحويلات, الديون, etc. |
| Header controls mirror to left | ✅ | Search, avatar on left in RTL |
| Institution name shows Arabic in group header | ✅ | "البنك التجاري الدولي" |
| Account count label in Arabic | ✅ | "2 حسابات" |
| Balance position mirrors correctly | ✅ | Balance on left in RTL (was right in LTR) |
| Chevron position mirrors | ✅ | Far left in RTL |
| Bank detail page titles in Arabic | ✅ | Arabic name primary, English secondary |
| Bank detail stat labels in Arabic | ✅ | إجمالي الودائع, إجمالي الائتمان المستخدم, etc. |
| "Back to Accounts" in Arabic | ✅ | "العودة للحسابات ←" |
| Number formatting consistency | ⚠️ | Bug #8 — inconsistent numeral styles |
| Switch back to English | ✅ | "English" appears in menu while in Arabic mode |

---

### 8. Responsiveness

**Tested via:** CSS class inspection (physical resize not possible on remote server)

| Check | Result | Notes |
|-------|--------|-------|
| Sidebar collapses on mobile | ✅ | `hidden md:flex` — hidden below 768px |
| Mobile hamburger menu present | ✅ | `md:hidden` element in header |
| Account cards: 1→2→3 columns | ✅ | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Bank detail stat cards: 2→4 columns | ✅ | `grid-cols-2 lg:grid-cols-4` |
| FAB uses logical CSS | ✅ | `end-6` not `right-6` |

---

## Bugs

### 🔴 Critical

#### Bug #1 — Institution logos broken (all institutions)
- **Page:** `/accounts`, `/accounts/bank/cib`, Add Account dialog
- **Steps:** Load any page showing an institution
- **Expected:** Institution logo SVG renders (e.g., CIB crest)
- **Actual:** Broken image icon + alt text ("Comm", "Nat", "Ban") shown for all institutions
- **Cause:** SVG files missing from `frontend/public/institutions/` directory
- **Impact:** Affects accounts page, bank detail page, institution selector across the entire app

#### Bug #2 — Invalid IBAN shows generic API error toast
- **Page:** `/accounts` → Add Account → bank_account type
- **Steps:** Enter invalid IBAN (e.g., EG123456789), submit
- **Expected:** "Invalid IBAN format" user-friendly validation message
- **Actual:** "API error: 400" generic toast
- **Impact:** Poor UX — user does not understand what went wrong

#### Bug #7 — No confirmation dialog before account deletion
- **Page:** `/accounts` → Manage → select account → Delete Selected
- **Steps:** Select any account, click Delete Selected
- **Expected:** Confirmation dialog ("Delete this account? This cannot be undone.")
- **Actual:** Account deleted immediately with no confirmation step
- **Impact:** Users can accidentally delete accounts with no recovery path

---

### 🟡 Moderate

#### Bug #3 — Error toast does not auto-dismiss
- **Page:** `/accounts` → Add Account → trigger any API error
- **Steps:** Submit form with invalid data
- **Expected:** Error toast auto-dismisses after ~5 seconds
- **Actual:** Toast persists permanently, requires page refresh to clear
- **Impact:** Blocks FAB button, stacks with subsequent toasts

#### Bug #4 — Success toast does not auto-dismiss
- **Page:** `/accounts` → Add Account → successful creation
- **Steps:** Create any account successfully
- **Expected:** Success toast auto-dismisses after ~3–5 seconds
- **Actual:** Toast persists permanently and stacks with other toasts
- **Impact:** Toast stack blocks FAB and disrupts further interactions

#### Bug #5 — Toast banner overlaps FAB button
- **Page:** `/accounts`
- **Steps:** Trigger any toast (success or error)
- **Expected:** Toast appears without covering FAB
- **Actual:** Toast extends to the right edge of the screen, covering the FAB
- **Note:** Directly caused by Bug #3/#4 (persistence) — auto-dismiss would mitigate this

---

### 🔵 Minor

#### Bug #6 — Form state retained between dialog opens (fixed/resolved)
- **Status:** ✅ **Resolved** — observed in earlier session, confirmed fixed in this session. Dialog correctly resets to blank on each open.

#### Bug #8 — Inconsistent number formatting in Arabic mode
- **Page:** `/accounts` (any page with numbers in Arabic mode)
- **Steps:** Switch to Arabic mode, view accounts page or bank detail page
- **Expected:** Consistent numeral style throughout (either all Arabic-Indic or all Western)
- **Actual:** Net Worth / Assets header uses Arabic-Indic numerals (١١,٥٠٠,٠٠) while credit card stats use Western numerals (50,000.00, 3,500.00) on the same screen
- **Additional:** Decimal separator appears as comma (١١,٥٠٠,٠٠) rather than period or Arabic decimal separator (٫)

#### Bug #9 — Transaction list shows no institution/bank column; orphaned transactions have no label
- **Page:** `/transactions`
- **Steps:** View any Opening Balance transaction in the transaction list
- **Expected:** Transaction row shows account name + institution (bank name/logo) so user can identify which bank the transaction belongs to
- **Actual:** Only account badge shown (e.g., "CIB Current Account"); no institution/bank grouping column. Legacy/deleted account transactions show no badge at all — completely unlabelled rows
- **Impact:** Users can't tell at a glance which bank a transaction comes from in the global list

#### Bug #10 — Deleting a transaction throws a JavaScript error (`apiDelete`)
- **Page:** `/transactions`
- **Steps:** Attempt to delete any transaction
- **Expected:** Transaction is soft-deleted and removed from the list
- **Actual:** JavaScript runtime error thrown at `src/lib/api-client.ts:88` — `fetch()` call inside `apiDelete` fails
- **Stack trace reported:** `rc/lib/api-client.ts (88:21) @ apiDelete`
- **Impact:** Transaction deletion is completely broken — users cannot remove any transaction
- **Priority:** P1 — critical regression

---

### 🔵 Minor

#### Bug #11 — Credit card account card is taller than other account type cards
- **Page:** `/accounts`
- **Steps:** View accounts page with a mix of account types
- **Expected:** All account cards have uniform height; credit cards use the extra space for useful info (e.g., month's income/expense/transaction count)
- **Actual:** The credit card dark-design card is significantly taller than Bank Account, Digital Wallet, and Cash Wallet cards due to the utilization bar + 3-stat row, creating a visually uneven grid
- **Suggestion:** Normalize card heights; add useful month-at-a-glance stats (this month's inflows, outflows, # transactions) to the extra space in non-credit-card cards

#### Bug #12 — Deleted account's transactions may persist in global transaction list (unverified)
- **Page:** `/transactions` after deleting an account via Manage mode
- **Steps:** Delete an account (e.g., ValU Account), navigate to `/transactions`
- **Expected:** Transactions belonging to the deleted account are removed (soft-deleted / filtered out)
- **Actual:** Not verified in this test session — transaction list was not re-checked after ValU deletion
- **Action needed:** Manually verify after a fresh account-with-transactions deletion

#### Bug #13 — Deleting a transfer may not remove both transaction legs (unverified)
- **Page:** `/transactions` or `/transfers` after deleting a transfer
- **Steps:** Create a transfer between two accounts, then delete it
- **Expected:** Both the debit leg (source account) and credit leg (destination account) are removed from the transaction list
- **Actual:** Not tested in this UAT session
- **Action needed:** Create a transfer and verify deletion cascades to both legs

---

## Feature Gaps & Design Enhancements

These are not regressions but missing or incomplete behaviors that should be addressed in a follow-up unit.

#### FG-1 — BNPL / Financing App card missing credit stats (parity with credit card)
- **Page:** `/accounts` → Financing App section
- **Current:** Financing App card shows only balance and ACTIVE badge with BNPL badge
- **Expected:** Should display Credit Limit, Amount Due, and Available Credit — identical to the credit card stats row — since BNPL accounts are effectively revolving credit facilities
- **Suggested fix:** Reuse the credit stats row component for `financing_app` type accounts with non-null credit limits

#### FG-2 — Account creation: card number / IBAN should be optional
- **Page:** `/accounts` → Add Account → Credit Card or Bank Account type
- **Current:** Unclear if card number (PAN) and IBAN are required or optional fields
- **Expected:** Both should be optional — many users won't have their card number handy. Display masked placeholder (•••• 1234) when not provided
- **Suggested fix:** Make `iban` and `card_last_four` optional in the creation schema; show a generic placeholder on the card design when absent

#### FG-3 — Add Transaction form: account dropdown needs institution short name + logo
- **Page:** `/transactions` → Add Transaction → Account selector dropdown
- **Current:** Account dropdown shows full account name only (e.g., "CIB Current Account — Bank Account") — no logo, no institution abbreviation
- **Expected:** Each dropdown option shows: [institution logo] + account name + institution short name (e.g., "CIB")
- **Impact:** With many accounts, the dropdown becomes unwieldy and hard to scan

#### FG-4 — Bank detail page: institution header not clickable
- **Page:** `/accounts/bank/cib`
- **Current:** The institution logo + name in the page header is static — no link or action
- **Expected:** Clicking the institution logo/name should navigate to an institution directory entry or edit page (future feature), or at minimum show a tooltip with the institution's details
- **Note:** Low priority until an institution directory/edit page exists

---

## Observations (Not Bugs)

1. **CARDHOLDER field shows account name, not user name:** The dark credit card shows "CARDHOLDER: CIB VISA CARD" using the account name. This is expected until a real cardholder name field is added to the account model.

2. **Financing App / Digital Wallet / Cash Wallet sections have no collapse toggle:** Only bank groups have a collapse/expand chevron. Non-bank sections are always expanded. May be intentional given they are flat lists with no sub-grouping.

---

## What Passed Well

- ✅ Institution grouping logic and section ordering (Banks → Digital Wallets → Cash Wallets)
- ✅ Bank detail page layout — all 4 stat cards mathematically correct
- ✅ Bilingual search (Arabic and English) in institution selector
- ✅ "Other bank" custom institution form with RTL Arabic placeholder
- ✅ Credit card design — dark card, utilization bar, masked PAN
- ✅ BNPL badge and purple accent on Financing App cards
- ✅ Collapse/expand for bank groups
- ✅ Opening Balance transactions auto-created on account creation
- ✅ Full RTL/Arabic layout flip — all critical paths work in Arabic
- ✅ Responsive CSS classes in place (mobile sidebar hidden, responsive card grids)
- ✅ Logical CSS used throughout (end-6, ps-4, etc. — no physical right-/left- classes on new components)
- ✅ Manage mode UI — checkboxes, "N selected" counter, Delete Selected button

---

#### Bug #14 — Add Account type dropdown uses native browser styling (not design system)
- **Page:** `/accounts` → Add Account dialog → Type field
- **Steps:** Open the Add Account dialog and observe the Type dropdown
- **Expected:** Dropdown uses shadcn/ui Select component with app design colors, border radius, and token-based styling
- **Actual:** Dropdown renders with the native OS/browser default `<select>` appearance — no custom styling, does not match the app's design language
- **Impact:** Visual inconsistency; also prevents adding institution logo + short name inside the option rows (FG-3)

---

## Recommended Fix Priority

| Priority | Bug | Effort |
|----------|-----|--------|
| P1 | Bug #10 — Transaction delete throws JS error (`apiDelete`) | Medium — debug fetch call in api-client.ts |
| P1 | Bug #1 — Institution logos missing | Low — download/add SVG files to `public/institutions/` |
| P1 | Bug #3/#4/#5 — Toast persistence + FAB overlap | Low — set `duration` prop on Sonner `<Toaster>` |
| P1 | Bug #7 — No deletion confirmation | Low — add confirm dialog before delete |
| P2 | Bug #14 — Account type dropdown uses native browser styling | Medium — replace `<select>` with shadcn/ui `<Select>` |
| P2 | Bug #9 — Transaction list missing institution column | Medium — add institution column/badge to transaction row |
| P2 | Bug #2 — Generic IBAN error toast | Medium — map backend 400 validation to friendly message |
| P2 | Bug #11 — Credit card card taller than others | Medium — normalize card heights; add month stats to plain cards |
| P2 | FG-1 — BNPL card missing credit stats | Medium — reuse credit stats row for financing_app type |
| P2 | FG-2 — Card number / IBAN optional on creation | Low — make fields optional in schema + show placeholder |
| P3 | Bug #12/#13 — Account/transfer deletion cascades | Medium — verify and test cascade behavior |
| P3 | FG-3 — Add Transaction account dropdown UX | Medium — add logo + institution short name to options |
| P3 | Bug #8 — Number formatting inconsistency in AR | Medium — audit `next-intl` number format config for `ar-EG` |
| P4 | FG-4 — Institution header not clickable on bank detail page | Low — deferred until institution directory exists |
