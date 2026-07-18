import * as React from "react";

import { cn } from "@/utils/cn";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "focus-ring h-4 w-4 rounded border-border bg-background text-primary accent-primary",
      className
    )}
    {...props}
  />
));

Checkbox.displayName = "Checkbox";

