"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  variant?: "area" | "bar" | "donut";
  className?: string;
}

export function ChartSkeleton({ variant = "area", className }: ChartSkeletonProps) {
  return (
    <Card className={cn("p-6", className)}>
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="h-64 flex items-end justify-center gap-2">
        {variant === "bar" && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-1 items-end flex-1">
                <Skeleton className="flex-1" style={{ height: `${40 + i * 10}%` }} />
                <Skeleton className="flex-1" style={{ height: `${30 + i * 8}%` }} />
              </div>
            ))}
          </>
        )}
        {variant === "donut" && (
          <Skeleton className="h-48 w-48 rounded-full" />
        )}
        {variant === "area" && (
          <Skeleton className="h-full w-full rounded-md" />
        )}
      </div>
    </Card>
  );
}
