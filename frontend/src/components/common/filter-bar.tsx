import type { PropsWithChildren } from "react";

import { cn } from "@/utils/cn";

export function FilterBar({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

