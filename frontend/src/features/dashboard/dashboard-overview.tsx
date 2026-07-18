"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Bot, RefreshCw, ShieldCheck, Sparkles, Users, Wrench } from "lucide-react";

import { StatusDonutChart } from "@/components/charts/status-donut-chart";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { ActivityFeed } from "@/components/common/activity-feed";
import { AgentNetworkPanel } from "@/components/common/agent-network-panel";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { IntelligenceContributors } from "@/components/common/intelligence-contributors";
import { LiveIndicator } from "@/components/common/live-indicator";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { RiskBadge } from "@/components/common/risk-badge";
import { ScoreBar } from "@/components/common/score-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useSavedState } from "@/hooks/use-saved-state";
import { formatLastUpdated, getLiveRefetchInterval, liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { dashboardService } from "@/services/dashboard-service";
import { entitiesService } from "@/services/entities-service";
import { formatDateTime, titleCase } from "@/utils/format";
import {
  buildAgentInsights,
  buildExecutiveDecisionBrief,
  getPredictionHorizon,
  type IntelligenceContributor
} from "@/utils/intelligence";

export function DashboardOverview() {
  const [liveMode, setLiveMode] = useSavedState("sentinel-dashboard-live", true);

  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => dashboardService.getSummary(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.dashboard)
  });
  const permitsQuery = useQuery({
    queryKey: queryKeys.permits.all,
    queryFn: () => entitiesService.listPermits(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.dashboard)
  });
  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.all,
    queryFn: () => entitiesService.listMaintenance(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.dashboard)
  });

  const riskTrendData = useMemo(
    () =>
      (summaryQuery.data?.live_risks ?? []).slice(0, 8).map((risk, index) => ({
        label: `R${index + 1}`,
        value: Number(risk.risk_score.toFixed(1))
      })),
    [summaryQuery.data?.live_risks]
  );

  const recommendationMix = useMemo(() => {
    const counts = (summaryQuery.data?.recent_recommendations ?? []).reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.status] = (accumulator[item.status] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts).map(([label, value]) => ({ label: titleCase(label), value }));
  }, [summaryQuery.data?.recent_recommendations]);

  const commandBriefing = useMemo(() => {
    if (!summaryQuery.data) {
      return null;
    }

    const liveRisks = summaryQuery.data.live_risks;
    const topRisk = liveRisks[0] ?? null;
    const permits = permitsQuery.data?.items ?? [];
    const maintenanceItems = maintenanceQuery.data?.items ?? [];
    const activePermits = permits.filter((permit) => permit.status === "open" || permit.status === "approved");
    const hotWorkPermits = activePermits.filter((permit) => permit.permit_type === "hot_work");
    const maintenancePressure = maintenanceItems.filter(
      (item) => item.status === "running" || item.status === "overdue" || item.status === "scheduled"
    );
    const unresolvedIncidents = summaryQuery.data.recent_incidents.filter((incident) => incident.status !== "closed");

    const contributors: IntelligenceContributor[] = [];

    if (topRisk) {
      contributors.push({
        label: `${titleCase(topRisk.risk_category)} is the dominant live threat`,
        detail: topRisk.reason
      });
    }

    if (hotWorkPermits.length > 0) {
      contributors.push({
        label: `${hotWorkPermits.length} hot-work permits are still active`,
        detail: "Concurrent hot work raises the likelihood that a process upset becomes a recordable event."
      });
    }

    if (maintenancePressure.length > 0) {
      contributors.push({
        label: `${maintenancePressure.length} maintenance tasks are adding operational pressure`,
        detail: "Running, scheduled, or overdue maintenance can narrow the available safety buffer."
      });
    }

    if (unresolvedIncidents.length > 0) {
      contributors.push({
        label: `${unresolvedIncidents.length} unresolved incidents remain in the operating picture`,
        detail: "Open or investigating incidents indicate controls that still need closure and verification."
      });
    }

    const narrative = topRisk
      ? `AI is correlating live risk signals with ${activePermits.length} active permits, ${maintenancePressure.length} maintenance pressure items, and ${unresolvedIncidents.length} unresolved incidents.`
      : `AI is monitoring permits, maintenance, incidents, and notifications to keep the command center aligned with the current operating picture.`;

    return {
      topRisk,
      contributors,
      narrative,
      activePermits: activePermits.length,
      maintenancePressure: maintenancePressure.length
    };
  }, [maintenanceQuery.data?.items, permitsQuery.data?.items, summaryQuery.data]);

  const agentInsights = useMemo(
    () =>
      buildAgentInsights({
        hotspots: [],
        liveRisks: summaryQuery.data?.live_risks ?? [],
        permits: permitsQuery.data?.items ?? [],
        maintenance: maintenanceQuery.data?.items ?? [],
        incidents: summaryQuery.data?.recent_incidents ?? []
      }),
    [maintenanceQuery.data?.items, permitsQuery.data?.items, summaryQuery.data?.live_risks, summaryQuery.data?.recent_incidents]
  );

  const executiveBrief = useMemo(() => buildExecutiveDecisionBrief(agentInsights), [agentInsights]);

  if (summaryQuery.isLoading || permitsQuery.isLoading || maintenanceQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (summaryQuery.isError || !summaryQuery.data || permitsQuery.isError || maintenanceQuery.isError) {
    return (
      <ErrorState
        title="Dashboard unavailable"
        description="Sentinel could not load the mission control summary."
        onRetry={() =>
          void Promise.all([summaryQuery.refetch(), permitsQuery.refetch(), maintenanceQuery.refetch()])
        }
      />
    );
  }

  const summary = summaryQuery.data;

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Mission Control"
        title="Operational safety overview"
        description="Track how live risks, permits, maintenance, incidents, and recommended actions are correlating across operations right now."
        actions={
          <>
            <LiveIndicator active={liveMode} helper={formatLastUpdated(new Date(summaryQuery.dataUpdatedAt))} />
            <Button variant="secondary" onClick={() => setLiveMode((current) => !current)}>
              {liveMode ? "Pause live sync" : "Resume live sync"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void Promise.all([summaryQuery.refetch(), permitsQuery.refetch(), maintenanceQuery.refetch()])}
              disabled={summaryQuery.isFetching || permitsQuery.isFetching || maintenanceQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  summaryQuery.isFetching || permitsQuery.isFetching || maintenanceQuery.isFetching ? "animate-spin" : ""
                }`}
              />
              Refresh now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard title="Plant health" value={summary.plant_health} icon={ShieldCheck} tone="success" format="percent" />
        <MetricCard title="Active incidents" value={summary.active_incidents} icon={AlertTriangle} tone="critical" />
        <MetricCard title="Critical risks" value={summary.critical_risks} icon={Activity} tone="critical" />
        <MetricCard title="Open permits" value={summary.open_permits} icon={Wrench} tone="warning" />
        <MetricCard title="Workers present" value={summary.workers_present} icon={Users} tone="primary" />
        <MetricCard
          title="AI confidence"
          value={summary.ai_confidence_average}
          icon={Bot}
          tone="primary"
          format="percent"
        />
      </div>

      <EnterpriseCard
        title="AI command briefing"
        description="Understand the compound-risk story first: what the model is seeing, why it matters, and what safety leadership should do next."
      >
        {commandBriefing ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status="ai correlated" />
                      {commandBriefing.topRisk ? <RiskBadge severity={commandBriefing.topRisk.severity} /> : null}
                    </div>
                    <p className="mt-4 text-lg font-semibold text-foreground">
                      {commandBriefing.topRisk
                        ? `${titleCase(commandBriefing.topRisk.risk_category)} is leading the current operating picture.`
                        : "No dominant live risk is currently leading the command snapshot."}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{commandBriefing.narrative}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-background/70 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Prediction horizon</p>
                    <p className="mt-2 text-lg font-semibold">
                      {commandBriefing.topRisk
                        ? getPredictionHorizon(commandBriefing.topRisk.severity, commandBriefing.topRisk.risk_score)
                        : "Monitoring"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-3 text-sm font-medium text-foreground">Why AI is concerned</p>
                <IntelligenceContributors
                  items={commandBriefing.contributors}
                  emptyDescription="The dashboard currently has no standout AI contributors to display."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <ScoreBar
                label="Permit pressure"
                value={Math.min(100, commandBriefing.activePermits * 9)}
                helper={`${commandBriefing.activePermits} active permits are currently in the operating picture.`}
                tone={commandBriefing.activePermits >= 5 ? "critical" : commandBriefing.activePermits >= 3 ? "warning" : "primary"}
              />
              <ScoreBar
                label="Maintenance pressure"
                value={Math.min(100, commandBriefing.maintenancePressure * 12)}
                helper={`${commandBriefing.maintenancePressure} maintenance tasks are influencing the current safety posture.`}
                tone={
                  commandBriefing.maintenancePressure >= 5
                    ? "critical"
                    : commandBriefing.maintenancePressure >= 3
                      ? "warning"
                      : "primary"
                }
              />
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <p className="font-medium">Recommended next action</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {commandBriefing.topRisk?.recommendation ??
                    "Review the Risk Center to confirm whether permits, maintenance, or incident response should be slowed or escalated."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Bot}
            title="No AI command briefing available"
            description="The current mission-control view does not yet contain enough live context to build the AI command briefing."
          />
        )}
      </EnterpriseCard>

      <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <EnterpriseCard
          title="AI agent network"
          description="See how specialized AI reasoning components coordinate across the current operating picture."
        >
          {executiveBrief ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="text-sm font-medium text-primary">Executive AI summary</p>
                    <p className="mt-3 text-lg font-semibold">{executiveBrief.headline}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{executiveBrief.narrative}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-background/70 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Next action</p>
                    <p className="mt-2 max-w-[16rem] text-sm font-medium">{executiveBrief.nextAction}</p>
                  </div>
                </div>
              </div>
              <AgentNetworkPanel items={agentInsights} />
            </div>
          ) : (
            <EmptyState
              icon={Bot}
              title="No active AI agents"
              description="The current operating context does not yet provide enough live inputs to activate the specialized AI agent layer."
            />
          )}
        </EnterpriseCard>

        <EnterpriseCard
          title="Operational response chain"
          description="See how signals escalate into coordinated action across detection, analysis, and response."
        >
          <div className="grid gap-3">
            {[
              {
                title: "Operational signals",
                detail: `${summary.live_risks.length} live risks, ${summary.open_permits} permits, and ${summary.active_incidents} incidents are already flowing into the command layer.`
              },
              {
                title: "AI agent correlation",
                detail: `${agentInsights.filter((agent) => agent.status !== "monitoring").length || 1} specialized AI lenses are actively reviewing risk, permits, maintenance, incidents, compliance, and response posture.`
              },
              {
                title: "Compound risk decision",
                detail: commandBriefing?.topRisk
                  ? `${titleCase(commandBriefing.topRisk.risk_category)} is currently the dominant decision trigger.`
                  : "The platform is monitoring for the next dominant compound-risk trigger."
              },
              {
                title: "Operator action",
                detail:
                  commandBriefing?.topRisk?.recommendation ??
                  executiveBrief?.nextAction ??
                  "Review the Risk Center and confirm whether active work should slow or stop."
              },
              {
                title: "Workflow activation",
                detail: `${summary.alerts.length} alerts, ${summary.recent_recommendations.length} recommendations, and ${summary.recent_incidents.length} recent incidents can be carried into notifications, investigation, and executive review.`
              }
            ].map((step, index) => (
              <div key={`dashboard-workflow-step-${index}`} className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    Step {index + 1}
                  </div>
                  <p className="font-medium">{step.title}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </EnterpriseCard>
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        <EnterpriseCard title="Live risk score trend" description="Recent live risk scores surfaced by the compound risk engine.">
          {riskTrendData.length ? (
            <TrendLineChart data={riskTrendData} />
          ) : (
            <EmptyState
              icon={Activity}
              title="No live risk events"
              description="No live risk events are available for the current dashboard view."
            />
          )}
        </EnterpriseCard>

        <EnterpriseCard title="Recommendation pipeline" description="Status distribution of recent AI-backed operational recommendations.">
          {recommendationMix.length ? (
            <StatusDonutChart data={recommendationMix} />
          ) : (
            <EmptyState
              icon={Wrench}
              title="No recommendations available"
              description="No recent recommendation records are available in the current mission-control view."
            />
          )}
        </EnterpriseCard>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <EnterpriseCard
          title="Live risk feed"
          description="Recent risk events scored by the compound risk engine, with score, reason, and recommendation visible to the operator."
        >
          {summary.live_risks.length ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Severity</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Why it exists</TableHeaderCell>
                    <TableHeaderCell>Confidence</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.live_risks.map((risk) => (
                    <TableRow key={risk.id}>
                      <TableCell>
                        <RiskBadge severity={risk.severity} />
                      </TableCell>
                      <TableCell>{risk.risk_category}</TableCell>
                      <TableCell className="max-w-md text-muted-foreground">{risk.reason}</TableCell>
                      <TableCell>{risk.confidence.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <EmptyState
              icon={Activity}
              title="Risk feed is currently empty"
              description="No live risks are currently available for this environment."
            />
          )}
        </EnterpriseCard>

        <EnterpriseCard
          title="Alert stream"
          description="Unread or recent notifications raised for the current operator."
        >
          {summary.alerts.length ? (
            <ActivityFeed
              items={summary.alerts.map((alert) => ({
                id: alert.id,
                title: alert.title,
                detail: alert.message,
                timestamp: alert.created_at
              }))}
            />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No active alerts"
              description="The alert stream is currently clear for the authenticated operator."
            />
          )}
        </EnterpriseCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <EnterpriseCard
          title="Recent recommendations"
          description="Action center items created by Sentinel AI operational services."
        >
          {summary.recent_recommendations.length ? (
            <div className="space-y-3">
              {summary.recent_recommendations.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.action}</p>
                      <p className="mt-2 text-sm text-muted-foreground">Assigned to {item.assigned_to ?? "Unassigned"}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={item.priority} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Wrench}
              title="No recent recommendations"
              description="The current dashboard summary does not include any recommendation records."
            />
          )}
        </EnterpriseCard>

        <EnterpriseCard
          title="Recent incidents"
          description="Latest recorded incidents from the current operating dataset."
        >
          {summary.recent_incidents.length ? (
            <div className="space-y-3">
              {summary.recent_incidents.map((incident) => (
                <div key={incident.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{incident.title}</p>
                        <RiskBadge severity={incident.severity} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {incident.ai_summary ?? incident.description}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(incident.reported_at)}</p>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="No recent incidents"
              description="No recent incident records are available in the current dashboard view."
            />
          )}
        </EnterpriseCard>
      </div>
    </div>
  );
}
