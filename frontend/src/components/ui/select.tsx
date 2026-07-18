import * as React from "react";

import { cn } from "@/utils/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "focus-ring flex h-10 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = "Select";

