"use client";

import { TrendingUp, ShoppingCart, HandCoins, Clock } from "lucide-react";
import { StatCardPlaceholder } from "@/components/dashboard/stat-card-placeholder";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-6 text-sm">Charts and insights coming in Phase 4.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCardPlaceholder label="Net Worth" icon={TrendingUp} comingSoon="Coming in Phase 4" />
        <StatCardPlaceholder label="Monthly Spending" icon={ShoppingCart} comingSoon="Coming in Phase 4" />
        <StatCardPlaceholder label="Active Debts" icon={HandCoins} comingSoon="Coming in Phase 4" />
        <StatCardPlaceholder label="Upcoming (30d)" icon={Clock} comingSoon="Coming in Phase 4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-muted/30 flex items-center justify-center h-56 text-muted-foreground text-sm"
          >
            Charts coming soon
          </div>
        ))}
      </div>
    </div>
  );
}
