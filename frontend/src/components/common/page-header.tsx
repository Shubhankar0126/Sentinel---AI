import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end", className)}>
      <div>
        {eyebrow ? <p className="text-xs uppercase tracking-[0.18em] text-accent">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

