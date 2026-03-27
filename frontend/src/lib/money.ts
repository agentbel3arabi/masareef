/**
 * Money formatting utilities. All amounts are integer minor units.
 * Never use floating point for money calculations.
 */

export const CURRENCIES: Record<string, { name: string; nameAr: string; exponent: number; symbol: string }> = {
  EGP: { name: "Egyptian Pound", nameAr: "جنيه مصري", exponent: 2, symbol: "EGP" },
  USD: { name: "US Dollar", nameAr: "دولار أمريكي", exponent: 2, symbol: "$" },
  EUR: { name: "Euro", nameAr: "يورو", exponent: 2, symbol: "€" },
  GBP: { name: "British Pound", nameAr: "جنيه إسترليني", exponent: 2, symbol: "£" },
  SAR: { name: "Saudi Riyal", nameAr: "ريال سعودي", exponent: 2, symbol: "SAR" },
  AED: { name: "UAE Dirham", nameAr: "درهم إماراتي", exponent: 2, symbol: "AED" },
  KWD: { name: "Kuwaiti Dinar", nameAr: "دينار كويتي", exponent: 3, symbol: "KWD" },
};

/**
 * Format minor units to display string.
 * formatAmount(125000, "EGP") → "1,250.00"
 * formatAmount(125000, "KWD") → "125.000"
 */
export function formatAmount(amountMinor: number, currency: string): string {
  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const major = amountMinor / Math.pow(10, exponent);
  return major.toLocaleString("en-US", {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
}

/**
 * Format with Arabic-Indic numerals for Arabic locale.
 */
export function formatAmountAr(amountMinor: number, currency: string): string {
  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const major = amountMinor / Math.pow(10, exponent);
  return major.toLocaleString("ar-EG", {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
}

/**
 * Format with currency symbol.
 * formatWithCurrency(125000, "EGP") → "1,250.00 EGP"
 */
export function formatWithCurrency(amountMinor: number, currency: string): string {
  return `${formatAmount(amountMinor, currency)} ${CURRENCIES[currency]?.symbol ?? currency}`;
}
