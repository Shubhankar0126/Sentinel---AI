import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="container py-8">
      <div className="panel-grid">
        <div className="surface-panel border-border/70 bg-background/35 p-5">
          <Skeleton className="h-5 w-48 rounded-full" />
          <Skeleton className="mt-4 h-3 w-full rounded-full" />
          <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`global-loading-metric-${index}`} className="surface-panel border-border/70 bg-background/35 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
                <Skeleton className="h-11 w-11 rounded-2xl" />
              </div>
              <Skeleton className="mt-5 h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="surface-panel border-border/70 bg-background/35 p-5">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="mt-4 h-[420px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
