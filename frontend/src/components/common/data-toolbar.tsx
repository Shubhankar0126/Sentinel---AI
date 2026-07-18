import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/utils/cn";

interface DataToolbarProps extends PropsWithChildren {
  summary?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DataToolbar({ summary, actions, className, children }: DataToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/35 p-4 lg:flex-row lg:items-start lg:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {children}
        {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
