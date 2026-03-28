export function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-4 animate-pulse">
      <div className="h-9 flex-1 max-w-xs rounded-md bg-muted" />
      <div className="h-9 w-28 rounded-md bg-muted" />
      <div className="h-9 w-28 rounded-md bg-muted" />
    </div>
  );
}
