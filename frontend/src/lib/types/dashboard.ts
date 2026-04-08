export interface StatCardTrend {
  direction: "up" | "down" | "flat";
  absolute_delta: number; // minor units
  percentage: number | null; // null when previous period was 0
}

export interface StatCardItem {
  label: string;
  value_minor: number;
  currency: string;
  trend: StatCardTrend | null;
  count: number | null; // for "Active Debts" card
}

export interface StatCardsData {
  net_worth: StatCardItem;
  spending: StatCardItem;
  active_debts: StatCardItem;
  upcoming_payments: StatCardItem;
}

export interface IncomeVsExpensesMonth {
  month: string; // "2026-01"
  income_minor: number;
  expenses_minor: number;
  currency: string;
}

export interface SpendingByCategory {
  category_id: number | null; // null for "Other"
  category_name: string;
  category_name_ar: string | null;
  category_color: string | null;
  amount_minor: number; // absolute positive
  percentage: number; // 0-100
  currency: string;
}

export interface NetWorthTrendPoint {
  month: string; // "2026-01"
  accounts_minor: number;
  debts_minor: number; // positive = debt owed
  net_worth_minor: number; // accounts - debts
  currency: string;
}
