"use client";

import type { ReactNode } from "react";

interface ChartGridProps {
  children: ReactNode;
}

export function ChartGrid({ children }: ChartGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {children}
    </div>
  );
}
