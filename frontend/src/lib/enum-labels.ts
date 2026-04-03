/**
 * Human-readable labels for backend enum values.
 * Override map for special cases; fallback converts snake_case to Title Case.
 */

const OVERRIDES: Record<string, string> = {
  bnpl: "BNPL",
  p2p: "P2P",
  credit_card: "Credit Card",
  bank_account: "Bank Account",
  cash_wallet: "Cash Wallet",
  digital_wallet: "Digital Wallet",
  financing_app: "Financing App",
  personal_lent: "Lent",
  personal_borrowed: "Borrowed",
  semi_annual: "Semi-Annual",
};

/** Convert a snake_case enum value to a human-readable label */
export function formatEnumLabel(value: string): string {
  if (OVERRIDES[value]) return OVERRIDES[value];
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
