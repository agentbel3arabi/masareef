import { describe, it, expect } from "vitest";
import {
  formatAmount,
  formatAmountAr,
  parseMajorToMinor,
  formatWithCurrency,
  CURRENCIES,
} from "@/lib/money";

describe("CURRENCIES", () => {
  it("contains all 7 supported currencies", () => {
    expect(Object.keys(CURRENCIES)).toEqual([
      "EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD",
    ]);
  });

  it("KWD has exponent 3", () => {
    expect(CURRENCIES.KWD.exponent).toBe(3);
  });

  it("all exponent-2 currencies have correct exponent", () => {
    for (const code of ["EGP", "USD", "EUR", "GBP", "SAR", "AED"]) {
      expect(CURRENCIES[code].exponent).toBe(2);
    }
  });
});

describe("formatAmount", () => {
  it("formats EGP correctly", () => {
    expect(formatAmount(125000, "EGP")).toBe("1,250.00");
  });

  it("formats KWD with 3 decimal places", () => {
    expect(formatAmount(125000, "KWD")).toBe("125.000");
  });

  it("formats zero amount", () => {
    expect(formatAmount(0, "EGP")).toBe("0.00");
  });

  it("formats negative amount", () => {
    const result = formatAmount(-50000, "EGP");
    // toLocaleString may produce Unicode minus sign or hyphen
    expect(result).toMatch(/-500\.00/);
  });

  it("formats small amount (1 piaster)", () => {
    expect(formatAmount(1, "EGP")).toBe("0.01");
  });

  it("formats large amount (over 1 billion minor units)", () => {
    expect(formatAmount(1500000000, "EGP")).toBe("15,000,000.00");
  });

  it("formats USD", () => {
    expect(formatAmount(999, "USD")).toBe("9.99");
  });

  it("formats EUR", () => {
    expect(formatAmount(10050, "EUR")).toBe("100.50");
  });

  it("formats GBP", () => {
    expect(formatAmount(50000, "GBP")).toBe("500.00");
  });

  it("formats SAR", () => {
    expect(formatAmount(75025, "SAR")).toBe("750.25");
  });

  it("formats AED", () => {
    expect(formatAmount(100000, "AED")).toBe("1,000.00");
  });

  it("defaults to exponent 2 for unknown currency", () => {
    expect(formatAmount(12345, "XYZ")).toBe("123.45");
  });
});

describe("formatAmountAr", () => {
  it("returns Arabic-Indic numeral string for EGP", () => {
    const result = formatAmountAr(125000, "EGP");
    // Arabic locale uses Arabic-Indic numerals
    expect(result).toBeTruthy();
    expect(result).not.toBe("1,250.00"); // should differ from EN
  });
});

describe("parseMajorToMinor", () => {
  it("parses simple EGP amount", () => {
    expect(parseMajorToMinor("1250.50", 2)).toBe(125050);
  });

  it("parses KWD amount with 3 decimals", () => {
    expect(parseMajorToMinor("125.000", 3)).toBe(125000);
  });

  it("parses integer without decimal", () => {
    expect(parseMajorToMinor("100", 2)).toBe(10000);
  });

  it("pads short fractional part", () => {
    expect(parseMajorToMinor("10.5", 2)).toBe(1050);
  });

  it("truncates excess fractional digits", () => {
    expect(parseMajorToMinor("10.555", 2)).toBe(1055);
  });

  it("returns 0 for empty string", () => {
    expect(parseMajorToMinor("", 2)).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(parseMajorToMinor("   ", 2)).toBe(0);
  });

  it("parses negative amount", () => {
    expect(parseMajorToMinor("-50.00", 2)).toBe(-5000);
  });

  it("parses zero", () => {
    expect(parseMajorToMinor("0", 2)).toBe(0);
  });

  it("parses FX rate scale (exponent 4)", () => {
    expect(parseMajorToMinor("0.0199", 4)).toBe(199);
  });
});

describe("formatWithCurrency", () => {
  it("appends currency symbol for EGP", () => {
    expect(formatWithCurrency(125000, "EGP")).toBe("1,250.00 EGP");
  });

  it("appends $ symbol for USD", () => {
    expect(formatWithCurrency(999, "USD")).toBe("9.99 $");
  });

  it("falls back to currency code for unknown currency", () => {
    expect(formatWithCurrency(12345, "XYZ")).toBe("123.45 XYZ");
  });
});
