export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse border-b">
      <div className="h-4 w-20 rounded bg-muted" />
      <div className="h-4 flex-1 rounded bg-muted" />
      <div className="h-5 w-16 rounded-full bg-muted" />
      <div className="h-4 w-24 rounded bg-muted" />
    </div>
  );
}

export function TransactionTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <TransactionRowSkeleton key={i} />
      ))}
    </div>
  );
}
