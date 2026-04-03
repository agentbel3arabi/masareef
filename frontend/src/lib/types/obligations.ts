import type {
  DebtType,
  DebtStatus,
  InstallmentType,
  LifecycleStatus,
} from "@/lib/types/debts";

export interface ObligationDebt {
  id: number;
  type: DebtType;
  name: string;
  monthly_payment_minor: number;
  remaining_minor: number;
  status: DebtStatus;
}

export interface ObligationInstallment {
  id: number;
  type: InstallmentType;
  name: string;
  merchant_name: string | null;
  monthly_amount_minor: number;
  remaining_minor: number;
  remaining_months: number;
  status: LifecycleStatus;
}

export interface AccountObligationsResponse {
  debts: ObligationDebt[];
  installments: ObligationInstallment[];
}
