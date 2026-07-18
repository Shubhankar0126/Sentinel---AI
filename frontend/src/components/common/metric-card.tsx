"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercent } from "@/utils/format";
import { cn } from "@/utils/cn";

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "critical";
  trend?: string;
  format?: "number" | "percent";
}

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-critical/10 text-critical"
};

export function MetricCard({
  title,
  value,
  suffix,
  icon: Icon,
  tone = "primary",
  trend,
  format = "number"
}: MetricCardProps) {
  const displayValue = format === "percent" ? formatPercent(value / 100) : `${formatNumber(value)}${suffix ?? ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-tile min-w-0"
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 text-muted-foreground">{title}</p>
          <p className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{displayValue}</p>
          {trend ? <Badge className="mt-3 inline-flex max-w-full" variant="neutral">{trend}</Badge> : null}
        </div>
        <div className={cn("shrink-0 rounded-2xl p-3", toneClasses[tone])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}
