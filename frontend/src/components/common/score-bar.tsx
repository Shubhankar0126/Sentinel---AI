import { cn } from "@/utils/cn";
import { formatPercent } from "@/utils/format";

interface ScoreBarProps {
  label: string;
  value: number;
  helper?: string;
  tone?: "primary" | "success" | "warning" | "critical";
  className?: string;
}

const toneStyles = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-critical"
};

export function ScoreBar({ label, value, helper, tone = "primary", className }: ScoreBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("min-w-0 space-y-3 rounded-2xl border border-border/70 bg-background/40 p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {helper ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
        </div>
        <p className="shrink-0 text-lg font-semibold">{formatPercent(safeValue / 100)}</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted/70">
        <div
          className={cn("h-full rounded-full transition-all duration-500", toneStyles[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
