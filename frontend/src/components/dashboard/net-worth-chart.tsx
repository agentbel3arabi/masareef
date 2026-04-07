"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { ChartSkeleton } from "./chart-skeleton";
import { baseLayout, baseConfig, CHART_COLORS, minorToMajor } from "./chart-config";
import type { NetWorthTrendPoint } from "@/lib/types/dashboard";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <ChartSkeleton variant="area" />,
});

interface NetWorthChartProps {
  data: NetWorthTrendPoint[];
  baseCurrency: string;
}

export function NetWorthChart({ data, baseCurrency }: NetWorthChartProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-sm font-bold text-foreground">{t("startTrackingNetWorth")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("addAccountsAndRecord")}</p>
      </div>
    );
  }

  const monthLabels = data.map((d) => {
    const date = new Date(d.month + "-01");
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { month: "short" });
  });

  const netWorthValues = data.map((d) => minorToMajor(d.net_worth_minor, baseCurrency));
  const debtValues = data.map((d) => minorToMajor(d.debts_minor, baseCurrency));

  const traces: Plotly.Data[] = [
    {
      x: monthLabels,
      y: netWorthValues,
      type: "scatter",
      fill: "tozeroy",
      fillcolor: CHART_COLORS.skyBlueFill,
      line: {
        color: CHART_COLORS.skyBlue,
        width: 3,
        shape: "spline",
      },
      name: t("netWorth"),
      hovertemplate: `<b>%{x}</b><br>${t("netWorth")}: %{y:,.0f} ${baseCurrency}<extra></extra>`,
    },
    {
      x: monthLabels,
      y: debtValues,
      type: "scatter",
      line: {
        color: CHART_COLORS.destructive,
        width: 2,
        dash: "dash",
      },
      name: t("activeDebts"),
      hovertemplate: `<b>%{x}</b><br>${t("activeDebts")}: %{y:,.0f} ${baseCurrency}<extra></extra>`,
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout,
    xaxis: {
      showgrid: false,
    },
    yaxis: {
      gridcolor: CHART_COLORS.gridLine,
      nticks: 4,
    },
  };

  return (
    <div role="img" aria-label={t("netWorthTrend")}>
      <Plot
        data={traces}
        layout={layout}
        config={baseConfig}
        useResizeHandler
        style={{ width: "100%", height: "256px" }}
      />
    </div>
  );
}
