import { RadioTower } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

interface LiveIndicatorProps {
  active: boolean;
  label?: string;
  helper?: string;
  className?: string;
}

export function LiveIndicator({
  active,
  label = "Live operations",
  helper,
  className
}: LiveIndicatorProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant={active ? "success" : "neutral"} className="gap-1.5">
        <RadioTower className="h-3 w-3" />
        {active ? label : "Paused"}
      </Badge>
      {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
    </div>
  );
}
