import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

export function LoadingState({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("panel-grid", className)} role="status" aria-live="polite" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`loading-state-row-${index}`}
          className="surface-panel overflow-hidden border-border/70 bg-background/35 p-5"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-4/5 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
