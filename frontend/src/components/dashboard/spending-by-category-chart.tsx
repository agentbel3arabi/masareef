"use client";

import { useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChartSkeleton } from "./chart-skeleton";
import { baseLayout, baseConfig, CHART_COLORS, minorToMajor } from "./chart-config";
import { formatAmount, formatAmountAr } from "@/lib/money";
import type { SpendingByCategory } from "@/lib/types/dashboard";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <ChartSkeleton variant="donut" />,
});

interface SpendingByCategoryChartProps {
  data: SpendingByCategory[];
  baseCurrency: string;
}

export function SpendingByCategoryChart({ data, baseCurrency }: SpendingByCategoryChartProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const onPlotlyClick = useCallback(
    (event: Readonly<Plotly.PlotMouseEvent>) => {
      const point = event.points[0];
      const categoryId = point.customdata as number | null;
      if (categoryId != null) {
        router.push(`/transactions?category=${categoryId}&period=month`);
      }
    },
    [router]
  );

  const onHover = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = "pointer";
    }
  }, []);

  const onUnhover = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = "default";
    }
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-sm font-bold text-foreground">{t("noSpendingThisMonth")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("categorizedWillAppear")}</p>
      </div>
    );
  }

  const totalMinor = data.reduce((sum, d) => sum + d.amount_minor, 0);
  const fmtTotal =
    locale === "ar"
      ? formatAmountAr(totalMinor, baseCurrency)
      : formatAmount(totalMinor, baseCurrency);

  const labels = data.map((d) =>
    locale === "ar" ? d.category_name_ar || d.category_name : d.category_name
  );

  const values = data.map((d) => minorToMajor(d.amount_minor, baseCurrency));

  const colors = data.map((d, i) => {
    if (d.category_id === null) return CHART_COLORS.mutedHalf;
    if (d.category_color) return d.category_color;
    return CHART_COLORS.chartPalette[i % CHART_COLORS.chartPalette.length];
  });

  const customdata = data.map((d) => d.category_id);

  const traces: Plotly.Data[] = [
    {
      labels,
      values,
      customdata,
      type: "pie",
      hole: 0.6,
      marker: { colors },
      pull: 0.03,
      textinfo: "none",
      hovertemplate: `<b>%{label}</b><br>%{value:,.0f} ${baseCurrency} (%{percent})<extra></extra>`,
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout,
    annotations: [
      {
        text: `<b>${fmtTotal}</b><br><span style="font-size:11px">${t("total")}</span>`,
        showarrow: false,
        x: 0.5,
        y: 0.5,
        font: { size: 16 },
      },
    ],
  };

  return (
    <div role="img" aria-label={t("spendingByCategory")}>
      <div ref={containerRef}>
        <Plot
          data={traces}
          layout={layout}
          config={baseConfig}
          useResizeHandler
          style={{ width: "100%", height: "256px" }}
          onClick={onPlotlyClick}
          onHover={onHover}
          onUnhover={onUnhover}
        />
      </div>
      {/* Custom HTML legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
        {data.map((item, i) => (
          <div key={item.category_id ?? "other"} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[i] }}
            />
            <span className="text-sm truncate">
              {locale === "ar" ? item.category_name_ar || item.category_name : item.category_name}
            </span>
            <span className="text-xs text-muted-foreground ms-auto">
              {item.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
