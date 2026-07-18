import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, "neutral" | "primary" | "success" | "warning" | "critical"> = {
  active: "success",
  healthy: "success",
  approved: "success",
  completed: "success",
  open: "warning",
  running: "warning",
  scheduled: "primary",
  warning: "warning",
  moderate: "warning",
  high: "warning",
  critical: "critical",
  overdue: "critical",
  offline: "critical",
  investigating: "warning",
  closed: "neutral",
  suspended: "critical",
  expired: "warning",
  inactive: "neutral",
  draft: "primary"
};

export function StatusBadge({ status }: { status: string }) {
  const variant = statusMap[status.toLowerCase()] ?? "neutral";
  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

