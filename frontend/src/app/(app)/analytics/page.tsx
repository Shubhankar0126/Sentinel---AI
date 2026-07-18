"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ClipboardCheck, Download, RefreshCw, ShieldCheck, Sparkles, Users, Wrench } from "lucide-react";

import { SeverityBarChart } from "@/components/charts/severity-bar-chart";
import { StatusDonutChart } from "@/components/charts/status-donut-chart";
import { AgentNetworkPanel } from "@/components/common/agent-network-panel";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { LiveIndicator } from "@/components/common/live-indicator";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { ScoreBar } from "@/components/common/score-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useSavedState } from "@/hooks/use-saved-state";
import { formatLastUpdated, getLiveRefetchInterval, liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { analyticsService } from "@/services/analytics-service";
import { entitiesService } from "@/services/entities-service";
import { riskService } from "@/services/risk-service";
import { downloadCsv, downloadPdfReport } from "@/utils/export";
import { formatDateTime, titleCase } from "@/utils/format";
import { buildAgentInsights, buildExecutiveDecisionBrief, buildZoneHotspots } from "@/utils/intelligence";

const RANGE_LABELS = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  all: "All time"
} as const;

type AnalyticsRange = keyof typeof RANGE_LABELS;
type DrilldownKind = "incidents" | "risks" | "equipment" | "permits" | "maintenance" | "workers";

interface DrilldownState {
  kind: DrilldownKind;
  field?: "severity" | "status" | "department";
  value?: string;
}

interface DrilldownRow {
  title: string;
  subtitle: string;
  status: string;
  timestamp?: string | null;
}

const toChartData = (record: Record<string, number>) =>
  Object.entries(record).map(([label, value]) => ({
    label,
    value
  }));

function isWithinRange(value: string | null | undefined, range: AnalyticsRange) {
  if (!value || range === "all") {
    return true;
  }

  const now = Date.now();
  const timestamp = new Date(value).getTime();
  const rangeMs =
    range === "24h"
      ? 24 * 60 * 60 * 1000
      : range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

  return now - timestamp <= rangeMs;
}

function matchesDrilldown(rowValue: string | undefined, selectedValue: string | undefined) {
  if (!selectedValue) {
    return true;
  }

  return rowValue?.toLowerCase() === selectedValue.toLowerCase();
}

export default function AnalyticsPage() {
  const [liveMode, setLiveMode] = useSavedState("sentinel-analytics-live", true);
  const [range, setRange] = useSavedState<AnalyticsRange>("sentinel-analytics-range", "7d");
  const [drilldown, setDrilldown] = useState<DrilldownState>({
    kind: "incidents"
  });

  const analyticsQuery = useQuery({
    queryKey: queryKeys.analytics.all,
    queryFn: () => analyticsService.getOverview(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const incidentsQuery = useQuery({
    queryKey: queryKeys.incidents.all,
    queryFn: () => entitiesService.listIncidents(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const risksQuery = useQuery({
    queryKey: queryKeys.risk.history,
    queryFn: () => riskService.getHistory(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const permitsQuery = useQuery({
    queryKey: queryKeys.permits.all,
    queryFn: () => entitiesService.listPermits(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.all,
    queryFn: () => entitiesService.listMaintenance(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const workersQuery = useQuery({
    queryKey: queryKeys.workers.all,
    queryFn: () => entitiesService.listWorkers(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.all,
    queryFn: () => entitiesService.listZones(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });
  const plantsQuery = useQuery({
    queryKey: queryKeys.plants.all,
    queryFn: () => entitiesService.listPlants(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.analytics)
  });

  const incidentSeverityData = useMemo(
    () => toChartData(analyticsQuery.data?.incident_severity_breakdown ?? {}),
    [analyticsQuery.data?.incident_severity_breakdown]
  );
  const riskSeverityData = useMemo(
    () => toChartData(analyticsQuery.data?.risk_severity_breakdown ?? {}),
    [analyticsQuery.data?.risk_severity_breakdown]
  );
  const equipmentStatusData = useMemo(
    () => toChartData(analyticsQuery.data?.equipment_status_breakdown ?? {}),
    [analyticsQuery.data?.equipment_status_breakdown]
  );
  const permitStatusData = useMemo(
    () => toChartData(analyticsQuery.data?.permit_status_breakdown ?? {}),
    [analyticsQuery.data?.permit_status_breakdown]
  );
  const maintenanceStatusData = useMemo(
    () => toChartData(analyticsQuery.data?.maintenance_status_breakdown ?? {}),
    [analyticsQuery.data?.maintenance_status_breakdown]
  );
  const departmentScores = useMemo(
    () =>
      Object.entries(analyticsQuery.data?.department_safety_scores ?? {}).sort((left, right) => right[1] - left[1]),
    [analyticsQuery.data?.department_safety_scores]
  );

  const scopedIncidents = useMemo(
    () => (incidentsQuery.data?.items ?? []).filter((item) => isWithinRange(item.reported_at, range)),
    [incidentsQuery.data?.items, range]
  );
  const scopedRisks = useMemo(
    () => (risksQuery.data ?? []).filter((item) => isWithinRange(item.updated_at, range)),
    [range, risksQuery.data]
  );
  const scopedPermits = useMemo(
    () =>
      (permitsQuery.data?.items ?? []).filter(
        (item) => isWithinRange(item.start_time, range) || isWithinRange(item.end_time, range)
      ),
    [permitsQuery.data?.items, range]
  );
  const scopedMaintenance = useMemo(
    () =>
      (maintenanceQuery.data?.items ?? []).filter(
        (item) => isWithinRange(item.scheduled_date, range) || isWithinRange(item.completed_date, range)
      ),
    [maintenanceQuery.data?.items, range]
  );
  const scopedEquipment = equipmentQuery.data?.items ?? [];
  const scopedWorkers = workersQuery.data?.items ?? [];
  const hotspots = useMemo(
    () =>
      buildZoneHotspots({
        zones: zonesQuery.data?.items ?? [],
        plants: plantsQuery.data?.items ?? [],
        permits: scopedPermits,
        maintenance: scopedMaintenance,
        equipment: scopedEquipment,
        incidents: scopedIncidents
      }),
    [
      plantsQuery.data?.items,
      scopedEquipment,
      scopedIncidents,
      scopedMaintenance,
      scopedPermits,
      zonesQuery.data?.items
    ]
  );

  const drilldownRows = useMemo<DrilldownRow[]>(() => {
    switch (drilldown.kind) {
      case "risks":
        return scopedRisks
          .filter((item) => {
            if (drilldown.field === "severity") {
              return matchesDrilldown(item.severity, drilldown.value);
            }

            if (drilldown.field === "status") {
              return matchesDrilldown(item.status, drilldown.value);
            }

            return true;
          })
          .map((item) => ({
            title: item.risk_category,
            subtitle: item.reason,
            status: item.severity,
            timestamp: item.updated_at
          }));
      case "equipment":
        return scopedEquipment
          .filter((item) => (drilldown.field === "status" ? matchesDrilldown(item.status, drilldown.value) : true))
          .map((item) => ({
            title: item.equipment_name,
            subtitle: `${item.equipment_type} | health ${item.health_score.toFixed(1)}%`,
            status: item.status,
            timestamp: item.next_maintenance
          }));
      case "permits":
        return scopedPermits
          .filter((item) => (drilldown.field === "status" ? matchesDrilldown(item.status, drilldown.value) : true))
          .map((item) => ({
            title: item.permit_number,
            subtitle: `${titleCase(item.permit_type)} permit`,
            status: item.status,
            timestamp: item.end_time
          }));
      case "maintenance":
        return scopedMaintenance
          .filter((item) => (drilldown.field === "status" ? matchesDrilldown(item.status, drilldown.value) : true))
          .map((item) => ({
            title: titleCase(item.maintenance_type),
            subtitle: item.remarks ?? `Assigned to ${item.assigned_to ?? "Unassigned"}`,
            status: item.status,
            timestamp: item.scheduled_date
          }));
      case "workers":
        return scopedWorkers
          .filter((item) => (drilldown.field === "department" ? matchesDrilldown(item.department, drilldown.value) : true))
          .map((item) => ({
            title: item.name,
            subtitle: `${item.department} | ${item.designation}`,
            status: item.status,
            timestamp: item.updated_at
          }));
      case "incidents":
      default:
        return scopedIncidents
          .filter((item) => {
            if (drilldown.field === "severity") {
              return matchesDrilldown(item.severity, drilldown.value);
            }

            if (drilldown.field === "status") {
              return matchesDrilldown(item.status, drilldown.value);
            }

            return true;
          })
          .map((item) => ({
            title: item.title,
            subtitle: item.description,
            status: item.severity,
            timestamp: item.reported_at
          }));
    }
  }, [drilldown.field, drilldown.kind, drilldown.value, scopedEquipment, scopedIncidents, scopedMaintenance, scopedPermits, scopedRisks, scopedWorkers]);

  const aiInsights = useMemo(() => {
    const topHotspot = hotspots[0] ?? null;
    const nearMissCount = scopedIncidents.filter((incident) => incident.incident_type === "near_miss").length;
    const openIncidentCount = scopedIncidents.filter((incident) => incident.status !== "closed").length;
    const criticalRiskCount = scopedRisks.filter((risk) => risk.severity === "critical").length;
    const overdueMaintenanceCount = scopedMaintenance.filter((item) => item.status === "overdue").length;
    const activePermitCount = scopedPermits.filter((item) => item.status === "open" || item.status === "approved").length;
    const departmentAverage =
      departmentScores.length > 0
        ? departmentScores.reduce((sum, [, score]) => sum + score, 0) / departmentScores.length
        : 0;
    const incidentProbability = Math.min(
      100,
      18 + criticalRiskCount * 8 + openIncidentCount * 4 + overdueMaintenanceCount * 3 + activePermitCount * 2
    );

    return {
      topHotspot,
      nearMissRate: scopedIncidents.length ? (nearMissCount / scopedIncidents.length) * 100 : 0,
      incidentProbability,
      departmentAverage,
      emergingTrend:
        criticalRiskCount >= 3 || overdueMaintenanceCount >= 3
          ? "Escalating"
          : activePermitCount >= 4
            ? "Watch"
            : "Stable"
      };
  }, [departmentScores, hotspots, scopedIncidents, scopedMaintenance, scopedPermits, scopedRisks]);

  const agentInsights = useMemo(
    () =>
      buildAgentInsights({
        hotspots,
        liveRisks: scopedRisks,
        permits: scopedPermits,
        maintenance: scopedMaintenance,
        incidents: scopedIncidents,
        plants: plantsQuery.data?.items ?? [],
        zones: zonesQuery.data?.items ?? [],
        equipment: scopedEquipment
      }),
    [
      hotspots,
      plantsQuery.data?.items,
      scopedEquipment,
      scopedIncidents,
      scopedMaintenance,
      scopedPermits,
      scopedRisks,
      zonesQuery.data?.items
    ]
  );

  const executiveBrief = useMemo(() => buildExecutiveDecisionBrief(agentInsights), [agentInsights]);

  if (
    analyticsQuery.isLoading ||
    incidentsQuery.isLoading ||
    risksQuery.isLoading ||
    equipmentQuery.isLoading ||
    permitsQuery.isLoading ||
    maintenanceQuery.isLoading ||
    workersQuery.isLoading ||
    zonesQuery.isLoading ||
    plantsQuery.isLoading
  ) {
    return <LoadingState rows={4} />;
  }

  if (
    analyticsQuery.isError ||
    incidentsQuery.isError ||
    risksQuery.isError ||
    equipmentQuery.isError ||
    permitsQuery.isError ||
    maintenanceQuery.isError ||
    workersQuery.isError ||
    zonesQuery.isError ||
    plantsQuery.isError ||
    !analyticsQuery.data
  ) {
    return (
      <ErrorState
        title="Analytics overview unavailable"
        description="The analytics overview could not be loaded."
        onRetry={() =>
          void Promise.all([
            analyticsQuery.refetch(),
            incidentsQuery.refetch(),
            risksQuery.refetch(),
            equipmentQuery.refetch(),
            permitsQuery.refetch(),
            maintenanceQuery.refetch(),
            workersQuery.refetch(),
            zonesQuery.refetch(),
            plantsQuery.refetch()
          ])
        }
      />
    );
  }

  const analytics = analyticsQuery.data;
  const selectedLabel = drilldown.value ? `${titleCase(drilldown.kind)}: ${titleCase(drilldown.value)}` : titleCase(drilldown.kind);

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Safety Analytics"
        title="Analytics"
        description="Track emerging hotspots, near-miss exposure, and forecast incident probability across the selected time window."
        actions={
          <>
            <LiveIndicator active={liveMode} helper={formatLastUpdated(new Date(analyticsQuery.dataUpdatedAt))} />
            <Select value={range} onChange={(event) => setRange(event.target.value as AnalyticsRange)} aria-label="Select analytics time range">
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </Select>
            <Button variant="secondary" onClick={() => setLiveMode((current) => !current)}>
              {liveMode ? "Pause live sync" : "Resume live sync"}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void Promise.all([
                  analyticsQuery.refetch(),
                  incidentsQuery.refetch(),
                  risksQuery.refetch(),
                  equipmentQuery.refetch(),
                  permitsQuery.refetch(),
                  maintenanceQuery.refetch(),
                  workersQuery.refetch(),
                  zonesQuery.refetch(),
                  plantsQuery.refetch()
                ])
              }
              disabled={analyticsQuery.isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${analyticsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <button
          type="button"
          className={`text-left ${drilldown.kind === "incidents" && !drilldown.field ? "rounded-[1.6rem] ring-2 ring-primary/40" : ""}`}
          onClick={() => setDrilldown({ kind: "incidents" })}
        >
          <MetricCard title="Total incidents" value={analytics.total_incidents} icon={AlertTriangle} tone="critical" />
        </button>
        <button
          type="button"
          className={`text-left ${drilldown.kind === "incidents" && drilldown.value === "open" ? "rounded-[1.6rem] ring-2 ring-primary/40" : ""}`}
          onClick={() => setDrilldown({ kind: "incidents", field: "status", value: "open" })}
        >
          <MetricCard title="Open incidents" value={analytics.open_incidents} icon={ClipboardCheck} tone="warning" />
        </button>
        <button
          type="button"
          className={`text-left ${drilldown.kind === "risks" && drilldown.value === "critical" ? "rounded-[1.6rem] ring-2 ring-primary/40" : ""}`}
          onClick={() => setDrilldown({ kind: "risks", field: "severity", value: "critical" })}
        >
          <MetricCard title="Critical risks" value={analytics.critical_risks} icon={Activity} tone="critical" />
        </button>
        <button
          type="button"
          className={`text-left ${drilldown.kind === "permits" && drilldown.value === "open" ? "rounded-[1.6rem] ring-2 ring-primary/40" : ""}`}
          onClick={() => setDrilldown({ kind: "permits", field: "status", value: "open" })}
        >
          <MetricCard title="Open permits" value={analytics.open_permits} icon={ShieldCheck} tone="primary" />
        </button>
        <button
          type="button"
          className={`text-left ${drilldown.kind === "maintenance" && drilldown.value === "overdue" ? "rounded-[1.6rem] ring-2 ring-primary/40" : ""}`}
          onClick={() => setDrilldown({ kind: "maintenance", field: "status", value: "overdue" })}
        >
          <MetricCard title="Overdue maintenance" value={analytics.overdue_maintenance} icon={Wrench} tone="warning" />
        </button>
        <button
          type="button"
          className={`text-left ${drilldown.kind === "equipment" && !drilldown.field ? "rounded-[1.6rem] ring-2 ring-primary/40" : ""}`}
          onClick={() => setDrilldown({ kind: "equipment" })}
        >
          <MetricCard
            title="Equipment health"
            value={analytics.equipment_health_average}
            icon={ShieldCheck}
            tone="success"
            format="percent"
          />
        </button>
      </div>

      <EnterpriseCard
        title="Executive AI summary"
        description={`Executive decision brief for the selected ${RANGE_LABELS[range].toLowerCase()} window.`}
      >
        {executiveBrief ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
              <p className="text-sm font-medium text-primary">Decision support headline</p>
              <p className="mt-3 text-lg font-semibold">{executiveBrief.headline}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{executiveBrief.narrative}</p>
              <p className="mt-3 text-sm text-muted-foreground">Next action: {executiveBrief.nextAction}</p>
            </div>
            <AgentNetworkPanel items={agentInsights} limit={4} />
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No executive AI summary available"
            description="The current analytics window does not yet show enough signal overlap to build an executive AI summary."
          />
        )}
      </EnterpriseCard>

      <EnterpriseCard
        title="AI-driven insight layer"
        description={`Identify the highest-risk zone, emerging trend posture, near-miss pressure, and forecast incident probability for the selected ${RANGE_LABELS[range].toLowerCase()} window.`}
      >
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-medium">Highest risk zone</p>
            </div>
            <p className="text-lg font-semibold">{aiInsights.topHotspot?.zoneName ?? "No hotspot"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {aiInsights.topHotspot
                ? `${aiInsights.topHotspot.hotspotScore.toFixed(0)} hotspot score with ${aiInsights.topHotspot.activePermitCount} permit overlaps and ${aiInsights.topHotspot.maintenancePressureCount} maintenance pressure items.`
                : "The current filters do not surface a dominant hotspot."}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <p className="font-medium">Emerging risk trend</p>
            <p className="mt-3 text-2xl font-semibold">{aiInsights.emergingTrend}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Trend is based on critical risk density, overdue maintenance, and active work posture.
            </p>
          </div>
          <ScoreBar
            label="Near miss prediction pressure"
            value={aiInsights.nearMissRate}
            helper="Near miss share within the selected incident slice."
            tone={aiInsights.nearMissRate >= 35 ? "critical" : aiInsights.nearMissRate >= 20 ? "warning" : "primary"}
          />
          <ScoreBar
            label="Forecast incident probability"
            value={aiInsights.incidentProbability}
            helper="Derived from current critical risk, open incident, maintenance, and permit signals."
            tone={
              aiInsights.incidentProbability >= 75
                ? "critical"
                : aiInsights.incidentProbability >= 55
                  ? "warning"
                  : "primary"
            }
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <p className="font-medium">AI hotspot explanation</p>
            <div className="mt-3 space-y-2">
              {aiInsights.topHotspot?.contributors.length ? (
                aiInsights.topHotspot.contributors.slice(0, 3).map((contributor, index) => (
                  <div key={`${contributor.label}-${index}`} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2">
                    <p className="text-sm font-medium">{contributor.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{contributor.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hotspot explanation is available for the current selection.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <p className="font-medium">Safety score trend context</p>
            <div className="mt-3 space-y-3">
              <ScoreBar
                label="Average department safety score"
                value={aiInsights.departmentAverage}
                helper="Current mean of department-level safety scoring."
                tone={
                  aiInsights.departmentAverage >= 85
                    ? "success"
                    : aiInsights.departmentAverage >= 70
                      ? "warning"
                      : "critical"
                }
              />
              <p className="text-sm text-muted-foreground">
                AI is combining this department score posture with live risk, permit, and maintenance context to determine where operator attention should shift next.
              </p>
            </div>
          </div>
        </div>
      </EnterpriseCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <EnterpriseCard title="Incident severity breakdown" description={`Incident counts by severity for the selected ${RANGE_LABELS[range].toLowerCase()} window.`}>
          {incidentSeverityData.length ? (
            <SeverityBarChart
              data={incidentSeverityData}
              onSelect={(label) => setDrilldown({ kind: "incidents", field: "severity", value: label.toLowerCase() })}
            />
          ) : (
            <EmptyState icon={AlertTriangle} title="No incident analytics" description="Incident severity data is not available in the current analytics view." />
          )}
        </EnterpriseCard>
        <EnterpriseCard title="Risk severity breakdown" description={`Risk events grouped by severity for the selected ${RANGE_LABELS[range].toLowerCase()} window.`}>
          {riskSeverityData.length ? (
            <SeverityBarChart
              data={riskSeverityData}
              onSelect={(label) => setDrilldown({ kind: "risks", field: "severity", value: label.toLowerCase() })}
            />
          ) : (
            <EmptyState icon={Activity} title="No risk analytics" description="Risk severity data is not available in the current analytics view." />
          )}
        </EnterpriseCard>
        <EnterpriseCard title="Equipment status mix" description="Equipment operational status distribution.">
          {equipmentStatusData.length ? (
            <StatusDonutChart
              data={equipmentStatusData}
              onSelect={(label) => setDrilldown({ kind: "equipment", field: "status", value: label.toLowerCase() })}
            />
          ) : (
            <EmptyState icon={ShieldCheck} title="No equipment status data" description="Equipment status analytics are not available in the current analytics view." />
          )}
        </EnterpriseCard>
        <EnterpriseCard title="Permit status mix" description="Permit lifecycle distribution from the analytics service.">
          {permitStatusData.length ? (
            <StatusDonutChart
              data={permitStatusData}
              onSelect={(label) => setDrilldown({ kind: "permits", field: "status", value: label.toLowerCase() })}
            />
          ) : (
            <EmptyState icon={ClipboardCheck} title="No permit status data" description="Permit status analytics are not available in the current analytics view." />
          )}
        </EnterpriseCard>
        <EnterpriseCard title="Maintenance status mix" description="Maintenance execution posture from the analytics service.">
          {maintenanceStatusData.length ? (
            <StatusDonutChart
              data={maintenanceStatusData}
              onSelect={(label) => setDrilldown({ kind: "maintenance", field: "status", value: label.toLowerCase() })}
            />
          ) : (
            <EmptyState icon={Wrench} title="No maintenance status data" description="Maintenance status analytics are not available in the current analytics view." />
          )}
        </EnterpriseCard>
        <EnterpriseCard title="Department safety scores" description="Click a department to drill into the current workforce slice.">
          {departmentScores.length ? (
            <div className="space-y-3">
              {departmentScores.map(([department, score], index) => (
                <button
                  key={`${department}-${index}`}
                  type="button"
                  className="focus-ring block w-full rounded-2xl border border-border/50 p-2 text-left"
                  onClick={() => setDrilldown({ kind: "workers", field: "department", value: department })}
                >
                  <ScoreBar
                    label={department}
                    value={score}
                    tone={score >= 85 ? "success" : score >= 70 ? "warning" : "critical"}
                  />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No department scores available"
              description="Department safety scoring is not yet populated in the current analytics view."
            />
          )}
        </EnterpriseCard>
      </div>

      <EnterpriseCard title="Drill-down view" description={`Detailed ${selectedLabel.toLowerCase()} records for ${RANGE_LABELS[range].toLowerCase()}.`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Active lens</p>
            <p className="mt-2 text-lg font-semibold">{selectedLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{drilldownRows.length} records in view</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  `sentinel-analytics-${drilldown.kind}-${range}.csv`,
                  drilldownRows.map((row) => ({
                    title: row.title,
                    subtitle: row.subtitle,
                    status: row.status,
                    timestamp: row.timestamp ?? ""
                  }))
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
              <Button
                onClick={() =>
                  downloadPdfReport(`sentinel-analytics-${drilldown.kind}-${range}.pdf`, `Sentinel Analytics - ${selectedLabel}`, [
                    {
                      heading: "Summary",
                      body: `Time range: ${RANGE_LABELS[range]}\nRecords: ${drilldownRows.length}\nDrill-down: ${selectedLabel}`
                  },
                  {
                    heading: "Records",
                    body: drilldownRows
                      .map((row) => `${row.title} | ${row.status} | ${row.subtitle} | ${formatDateTime(row.timestamp)}`)
                      .join("\n")
                  }
                ])
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {drilldownRows.length ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Record</TableHeaderCell>
                  <TableHeaderCell>Context</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Timestamp</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drilldownRows.slice(0, 14).map((row) => (
                  <TableRow key={`${row.title}-${row.timestamp ?? row.status}`}>
                    <TableCell>{row.title}</TableCell>
                    <TableCell className="max-w-md text-muted-foreground">{row.subtitle}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(row.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState
            icon={Activity}
            title="No records in the current drill-down"
            description="Change the range or select another KPI or chart segment to populate this detailed view."
          />
        )}
      </EnterpriseCard>
    </div>
  );
}
