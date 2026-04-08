"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { ChartSkeleton } from "./chart-skeleton";
import { baseLayout, baseConfig, CHART_COLORS, minorToMajor } from "./chart-config";
import type { IncomeVsExpensesMonth } from "@/lib/types/dashboard";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <ChartSkeleton variant="bar" />,
});

interface IncomeExpensesChartProps {
  data: IncomeVsExpensesMonth[];
  baseCurrency: string;
  compareEnabled: boolean;
}

export function IncomeExpensesChart({ data, baseCurrency, compareEnabled }: IncomeExpensesChartProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-sm font-bold text-foreground">{t("noDataForPeriod")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("addTransactionsToSee")}</p>
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthLabels = data.map((d) => {
    const date = new Date(d.month + "-01");
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { month: "short" });
  });

  const incomeValues = data.map((d) => minorToMajor(d.income_minor, baseCurrency));
  const expenseValues = data.map((d) => minorToMajor(d.expenses_minor, baseCurrency));

  // Determine which months get full opacity
  const isHighlighted = (month: string): boolean => {
    if (compareEnabled && data.length >= 2) {
      const lastTwo = data.slice(-2).map((d) => d.month);
      return lastTwo.includes(month);
    }
    return month === currentMonth;
  };

  const incomeColors = data.map((d) =>
    isHighlighted(d.month) ? CHART_COLORS.primary : CHART_COLORS.primaryFaded
  );
  const expenseColors = data.map((d) =>
    isHighlighted(d.month) ? CHART_COLORS.destructive : CHART_COLORS.destructiveFaded
  );

  const traces: Plotly.Data[] = [
    {
      x: monthLabels,
      y: incomeValues,
      type: "bar",
      name: t("income"),
      marker: { color: incomeColors },
      hovertemplate: `<b>%{x}</b><br>${t("income")}: %{y:,.0f} ${baseCurrency}<extra></extra>`,
    },
    {
      x: monthLabels,
      y: expenseValues,
      type: "bar",
      name: t("expenses"),
      marker: { color: expenseColors },
      hovertemplate: `<b>%{x}</b><br>${t("expenses")}: %{y:,.0f} ${baseCurrency}<extra></extra>`,
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout,
    barmode: "group",
    xaxis: {
      showgrid: false,
    },
    yaxis: {
      showgrid: false,
    },
  };

  return (
    <div role="img" aria-label={t("cashFlow")}>
      <Plot
        data={traces}
        layout={layout}
        config={baseConfig}
        useResizeHandler
        style={{ width: "100%", height: "256px" }}
      />
      {/* Custom HTML legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS.primary }}
          />
          <span className="text-xs text-muted-foreground">{t("income")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS.destructive }}
          />
          <span className="text-xs text-muted-foreground">{t("expenses")}</span>
        </div>
      </div>
    </div>
  );
}
