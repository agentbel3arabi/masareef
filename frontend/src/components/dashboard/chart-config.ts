/**
 * Shared Plotly chart configuration for dashboard charts.
 * Matches the UI-SPEC Plotly Chart Styling Contract.
 */

export const baseLayout: Partial<Plotly.Layout> = {
  font: {
    family: "Inter, Noto Sans Arabic, system-ui, sans-serif",
    size: 12,
    color: "hsl(215.4 16.3% 46.9%)",
  },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  margin: { t: 8, r: 16, b: 40, l: 48 },
  showlegend: false,
  hoverlabel: {
    bgcolor: "hsl(0 0% 100%)",
    bordercolor: "hsl(214.3 31.8% 91.4%)",
    font: {
      family: "Inter, Noto Sans Arabic, system-ui, sans-serif",
      size: 13,
      color: "hsl(222.2 47.4% 11.2%)",
    },
  },
};

export const baseConfig: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: false,
  staticPlot: false,
};

/** Chart color constants from CSS variables */
export const CHART_COLORS = {
  primary: "hsl(142.1 76.2% 36.3%)",
  primaryFaded: "hsla(142.1, 76.2%, 36.3%, 0.2)",
  destructive: "hsl(0 84.2% 60.2%)",
  destructiveFaded: "hsla(0, 84.2%, 60.2%, 0.2)",
  skyBlue: "hsl(199.4 95.5% 73.9%)",
  skyBlueFill: "hsla(199.4, 95.5%, 73.9%, 0.15)",
  muted: "hsl(215.4 16.3% 46.9%)",
  mutedHalf: "hsla(215.4, 16.3%, 46.9%, 0.5)",
  gridLine: "hsla(222.2, 47.4%, 11.2%, 0.05)",
  /** Fallback chart palette from CSS --chart-1 through --chart-5 */
  chartPalette: [
    "hsl(142.1 76.2% 36.3%)",
    "hsl(215.4 16.3% 46.9%)",
    "hsl(37.7 92.1% 50.2%)",
    "hsl(0 84.2% 60.2%)",
    "hsl(199.4 95.5% 73.9%)",
  ],
} as const;

/** Convert minor units to major using currency exponent */
export function minorToMajor(amountMinor: number, currency: string): number {
  const EXPONENTS: Record<string, number> = {
    EGP: 2, USD: 2, EUR: 2, GBP: 2, SAR: 2, AED: 2, KWD: 3,
  };
  const exp = EXPONENTS[currency] ?? 2;
  return amountMinor / Math.pow(10, exp);
}
