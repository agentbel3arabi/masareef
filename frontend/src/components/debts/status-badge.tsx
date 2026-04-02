"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "completed" | "overdue" | "settled" | "defaulted" | "pending";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps): JSX.Element {
  const statusDisplayNames: Record<StatusBadgeProps["status"], string> = {
    active: "Active",
    completed: "Completed",
    overdue: "Overdue",
    settled: "Settled",
    defaulted: "Defaulted",
    pending: "Pending",
  };

  const statusColorClasses: Record<StatusBadgeProps["status"], string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    settled: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    defaulted: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
        statusColorClasses[status],
        className
      )}
    >
      {statusDisplayNames[status]}
    </span>
  );
}
