import * as React from "react";

import { cn } from "@/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "focus-ring flex h-10 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";

