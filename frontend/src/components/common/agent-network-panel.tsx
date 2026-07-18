"use client";

import { Bot, Radar, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AgentInsight, IntelligenceSourceKind } from "@/utils/intelligence";

interface AgentNetworkPanelProps {
  items: AgentInsight[];
  limit?: number;
}

const sourceKindLabelMap: Record<IntelligenceSourceKind, string> = {
  live: "Live signal",
  derived: "Derived signal",
  demo: "Scenario signal"
};

const sourceKindVariantMap: Record<IntelligenceSourceKind, "success" | "primary" | "warning"> = {
  live: "success",
  derived: "primary",
  demo: "warning"
};

export function AgentNetworkPanel({ items, limit }: AgentNetworkPanelProps) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  if (!visibleItems.length) {
    return (
      <div className="rounded-2xl border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground">
        No specialized AI agents are active in this view yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 min-[1800px]:grid-cols-2">
      {visibleItems.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border/70 bg-background/35 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  {item.status === "escalated" ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : item.status === "watch" ? (
                    <Radar className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.agentName}</p>
                  <p className="text-xs text-muted-foreground">{item.responsibility}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sourceKindVariantMap[item.sourceKind]}>{sourceKindLabelMap[item.sourceKind]}</Badge>
              <Badge variant={item.status === "escalated" ? "critical" : item.status === "watch" ? "warning" : "neutral"}>
                {item.status}
              </Badge>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.summary}</p>

          {item.evidence.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.evidence.map((evidence, index) => (
                <span
                  key={`${item.id}-evidence-${index}`}
                  className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground"
                >
                  {evidence}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Confidence</p>
              <p className="mt-2 text-base font-semibold">{Math.round(item.confidence * 100)}%</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Potential impact</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.impact}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-primary">Recommended action</p>
            <p className="mt-2 text-sm text-muted-foreground">{item.recommendedAction}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
