/**
 * TypeScript interfaces mirroring backend Pydantic schemas for Phase 3.
 * All monetary amounts are integers in minor units.
 */

// ── Debts ──────────────────────────────────────────────────

export type DebtType = "bank_loan" | "personal_lent" | "personal_borrowed";
export type DebtStatus = "active" | "paid_off";
export type RepaymentMode = "lump_sum" | "equal_splits" | "custom_splits";
export type PaymentFrequency = "monthly" | "quarterly" | "semi_annual" | "annual";

export interface DebtResponse {
  id: number;
  type: DebtType;
  person_id: number | null;
  linked_account_id: number | null;
  name: string;
  institution: string | null;
  principal_minor: number;
  currency: string;
  annual_rate_bps: number;
  tenure_months: number;
  start_date: string;
  payment_day_of_month: number | null;
  payment_frequency: PaymentFrequency;
  monthly_payment_minor: number;
  repayment_mode: RepaymentMode | null;
  due_date: string | null;
  status: DebtStatus;
  notes: string | null;
  is_active: boolean;
  total_paid_minor: number;
  remaining_minor: number;
}

export interface DebtCreateInput {
  type: DebtType;
  name: string;
  institution?: string | null;
  principal_minor: number;
  currency: string;
  annual_rate_percent?: number;
  tenure_months: number;
  start_date: string;
  payment_day_of_month?: number | null;
  payment_frequency?: PaymentFrequency;
  linked_account_id?: number | null;
  notes?: string | null;
  person_id?: number | null;
  repayment_mode?: RepaymentMode | null;
  due_date?: string | null;
  split_count?: number | null;
  splits?: SplitInput[] | null;
  account_id?: number | null;
}

export interface DebtUpdateInput {
  name?: string;
  institution?: string | null;
  linked_account_id?: number | null;
  notes?: string | null;
}

export interface SplitInput {
  amount_minor: number;
  due_date: string;
}

export interface PaymentCreate {
  date: string;
  amount_minor: number;
  account_id: number;
  link_existing_transaction_id?: number | null;
  notes?: string | null;
}

export interface PaymentResponse {
  id: number;
  debt_id: number;
  date: string;
  amount_minor: number;
  principal_minor: number | null;
  interest_minor: number | null;
  transaction_id: number | null;
  notes: string | null;
}

export type ScheduleRowStatus = "paid" | "overdue" | "upcoming";

export interface ScheduleRow {
  payment_number: number;
  date: string;
  payment_minor: number;
  principal_minor: number;
  interest_minor: number;
  remaining_minor: number;
  status: ScheduleRowStatus;
}

export interface MatchSuggestion {
  transaction_id: number;
  date: string;
  amount_minor: number;
  description: string;
  score: number;
}

export interface P2PDebtSplitResponse {
  id: number;
  debt_id: number;
  amount_minor: number;
  due_date: string;
  paid: boolean;
  payment_id: number | null;
  status: ScheduleRowStatus;
}

// ── Installments ───────────────────────────────────────────

export type InstallmentType = "credit_card" | "store" | "financing_app";
export type LifecycleStatus = "active" | "completed";

export interface InstallmentResponse {
  id: number;
  type: InstallmentType;
  name: string;
  merchant_name: string | null;
  source_account_id: number | null;
  linked_account_id: number | null;
  total_amount_minor: number;
  monthly_amount_minor: number;
  total_months: number;
  start_month: string;
  currency: string;
  annual_rate_bps: number;
  status: LifecycleStatus;
  is_active: boolean;
  months_paid: number;
  remaining_months: number;
  remaining_minor: number;
}

export interface InstallmentCreateInput {
  type: InstallmentType;
  name: string;
  merchant_name?: string | null;
  source_account_id?: number | null;
  linked_account_id?: number | null;
  total_amount_minor: number;
  monthly_amount_minor: number;
  total_months: number;
  start_month: string;
  currency: string;
  annual_rate_bps?: number;
}

export interface InstallmentUpdateInput {
  name?: string;
  merchant_name?: string | null;
  linked_account_id?: number | null;
  annual_rate_bps?: number | null;
}

export interface FinancingAppDetail {
  account_id: number;
  name: string;
  name_ar: string | null;
  credit_limit_minor: number;
  balance_minor: number;
  available_minor: number;
  utilization_percent: number;
  active_plans_count: number;
  monthly_commitment_minor: number;
}

export interface FinancingAppsTotals {
  total_limit_minor: number;
  total_used_minor: number;
  total_available_minor: number;
  total_monthly_minor: number;
  total_remaining_minor: number;
}

export interface FinancingAppsSummary {
  apps: FinancingAppDetail[];
  totals: FinancingAppsTotals;
}

// ── Persons ────────────────────────────────────────────────

export type PersonRelationship =
  | "family"
  | "friend"
  | "colleague"
  | "business"
  | "other";

export interface PersonBalances {
  by_currency: Record<string, number>;
  total_base_minor: number;
  base_currency: string;
  fx_warnings: string[];
}

export interface PersonResponse {
  id: number;
  name: string;
  name_ar: string | null;
  phone: string | null;
  email: string | null;
  relationship: PersonRelationship | null;
  notes: string | null;
  is_active: boolean;
  balances: PersonBalances | null;
}

export interface PersonCreateInput {
  name: string;
  name_ar?: string | null;
  phone?: string | null;
  email?: string | null;
  relationship?: PersonRelationship | null;
  notes?: string | null;
}

export interface PersonUpdateInput {
  name?: string;
  name_ar?: string | null;
  phone?: string | null;
  email?: string | null;
  relationship?: PersonRelationship | null;
  notes?: string | null;
}

// ── Bulk Payment Types ────────────────────────────────────

export interface BulkPastPaymentRequest {
  installment_numbers: number[];
  account_id: number;
}

export interface BulkPastPaymentResponse {
  recorded_count: number;
  balance_affecting_count: number;
  history_only_count: number;
  total_balance_impact_minor: number;
}

export interface BulkPaymentItem {
  debt_id: number;
  amount_minor: number;
}

export interface BulkPaymentRequest {
  items: BulkPaymentItem[];
  fee_minor: number;
  account_id: number;
  date: string;
  link_existing_transaction_id?: number | null;
}

export interface BulkPaymentResponse {
  payments_created: number;
  total_minor: number;
  fee_transaction_id: number | null;
}
