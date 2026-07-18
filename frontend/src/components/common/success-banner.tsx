import { CheckCircle2 } from "lucide-react";

import { cn } from "@/utils/cn";

export function SuccessBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-4 py-3", className)}>
      <CheckCircle2 className="h-5 w-5 text-success" />
      <p className="text-sm text-foreground">{message}</p>
    </div>
  );
}

