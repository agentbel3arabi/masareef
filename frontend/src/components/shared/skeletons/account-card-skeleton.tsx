import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AccountCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted mt-1" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-32 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export function AccountGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <AccountCardSkeleton key={i} />
      ))}
    </div>
  );
}
