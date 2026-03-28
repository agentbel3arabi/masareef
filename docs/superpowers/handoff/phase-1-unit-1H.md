# Unit 1H: Transactions UI — Session Handoff

## What Was Done

Unit 1H built the transaction and transfer frontend, completing all Phase 1 functional UI work.

### Deliverables

- **TanStack Query hooks** (`hooks/use-transactions.ts`): `useTransactions`, `useCreateTransaction`, `useDeleteTransaction` — typed with `Transaction`, `TransactionFilters`, `CreateTransactionInput` interfaces
- **TanStack Query hooks** (`hooks/use-transfers.ts`): `useTransfers`, `useCreateTransfer` — typed with `Transfer`, `CreateTransferInput` interfaces
- **TransactionRow** (`components/transactions/transaction-row.tsx`): Table row with date, description+notes, category badge (with color), MoneyDisplay amount
- **TransactionTable** (`components/transactions/transaction-table.tsx`): Full table with headers, TransactionRow map, empty state (`t("common.noResults")`), pagination (Previous/Next, only shown when totalPages > 1)
- **TransactionForm** (`components/transactions/transaction-form.tsx`): Sheet slide-out with debit/credit toggle, date/description/amount/notes fields. Amount converts to minor units via `CURRENCIES[currency]?.exponent`. Notes included in API payload.
- **TransactionFilterBar** (`components/transactions/transaction-filters.tsx`): Search, type select, date_from/date_to — all reset page to 1 on change
- **Account detail page** (`app/(app)/accounts/[id]/page.tsx`): Replaced placeholder with AccountBalanceHeader + TransactionTable + TransactionForm integration
- **Global transactions page** (`app/(app)/transactions/page.tsx`): Filter bar + paginated TransactionTable with `showAccount`
- **TransferForm** (`components/transfers/transfer-form.tsx`): Dialog with from/to account selects, amount, FX rate field (cross-currency only), date, description. FX rate stored as `Math.round(rate * 10000)`.
- **Transfers page** (`app/(app)/transfers/page.tsx`): Transfer history table with Date/From/Arrow/To/Amount columns
- **Sheet RTL fix**: Converted physical CSS in `components/ui/sheet.tsx` to logical properties (`end-4`, `border-e`, `border-s`, `text-start`, `gap-2`)

### Key Decisions

- **`showAccount` prop in TransactionRow** — interface declares it (for future account column), but the prop is not destructured in the component body to avoid lint errors. Will be used when account column is added.
- **`px-4` in table cells is allowed** — symmetric shorthand (applies both sides equally), not a physical directional violation. Only asymmetric classes (`pl-4`, `pr-4`, etc.) are forbidden.
- **Transfer page pagination** — page state is declared but there are no Previous/Next buttons. Always loads page 1. Pagination UI deferred to future phase when transfer lists grow.
- **Hardcoded English labels** — form labels and button text in transfer/transaction forms are English-only. Known Phase 1 gap, will be i18n'd in Unit 1I (design polish phase).
- **`side="right"` in Sheet** — shadcn Sheet only supports `left|right|top|bottom` as valid `side` values; `"end"` is not a valid option despite the plan spec. Using `"right"` is correct for RTL since the Sheet component's CSS was converted to logical properties.

### Known Gaps (Not Blocking)

- **No unit/integration tests** — Frontend test infrastructure not set up yet
- **Hardcoded English strings** — form labels, placeholders, button text are English-only in new components
- **No toast/error feedback** — mutation errors are silent (pattern consistent with Unit 1G)
- **Transfer pagination UI** — page 1 always loaded; no next/previous buttons on transfers page
- **`showAccount` column not rendered** — `TransactionRow` accepts the prop but doesn't use it yet

## PR

- PR #11 open, Copilot review requested
- Branch: `feature/unit-1H-transactions-ui`
- Worktree: `.worktrees/unit-1H`

## Next Steps

- PR #11 awaiting Copilot review → human review → squash merge
- Next frontend work: Unit 1I (Design Polish — Stitch designs, logos, locale switching)
