import type { SeverityLevel } from "@/types/domain";

import { Badge } from "@/components/ui/badge";

const severityToVariant: Record<SeverityLevel, "success" | "warning" | "critical" | "neutral"> = {
  safe: "success",
  low: "neutral",
  moderate: "warning",
  high: "warning",
  critical: "critical"
};

export function RiskBadge({ severity }: { severity: SeverityLevel }) {
  return <Badge variant={severityToVariant[severity]}>{severity}</Badge>;
}

