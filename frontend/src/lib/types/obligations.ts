export interface ObligationDebt {
  id: number;
  type: string;
  name: string;
  monthly_payment_minor: number;
  remaining_minor: number;
  status: string;
}

export interface ObligationInstallment {
  id: number;
  type: string;
  name: string;
  merchant_name: string | null;
  monthly_amount_minor: number;
  remaining_minor: number;
  remaining_months: number;
  status: string;
}

export interface AccountObligationsResponse {
  debts: ObligationDebt[];
  installments: ObligationInstallment[];
}
