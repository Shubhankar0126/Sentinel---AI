import * as React from "react";

import { cn } from "@/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "focus-ring min-h-[120px] w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

