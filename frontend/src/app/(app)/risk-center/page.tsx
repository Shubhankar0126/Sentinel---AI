"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Activity, AlertTriangle, ClipboardList, SearchX, Siren, Sparkles } from "lucide-react";

import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DataToolbar } from "@/components/common/data-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { IntelligenceContributors } from "@/components/common/intelligence-contributors";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { RiskBadge } from "@/components/common/risk-badge";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { SuccessBanner } from "@/components/common/success-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { queryKeys } from "@/lib/query-keys";
import { useNotifications } from "@/providers/notification-provider";
import { entitiesService } from "@/services/entities-service";
import { riskService } from "@/services/risk-service";
import { simulationService } from "@/services/simulation-service";
import { formatDateTime, formatNumber, titleCase } from "@/utils/format";
import {
  buildZoneHotspots,
  getPredictionHorizon,
  summarizeHistoricalSimilarity,
  type IntelligenceContributor
} from "@/utils/intelligence";

const riskSchema = z.object({
  zone_id: z.string().optional(),
  gas_level: z.coerce.number().min(0).max(1000),
  temperature: z.coerce.number().min(-50).max(500),
  equipment_health: z.coerce.number().min(0).max(100),
  worker_count: z.coerce.number().min(0).max(1000),
  worker_present: z.boolean().default(true),
  maintenance_running: z.boolean().default(false),
  maintenance_overdue: z.boolean().default(false),
  weather_condition: z.string().min(2),
  shift: z.string().min(1),
  time_of_day: z.string().min(1),
  persist_result: z.boolean().default(true)
});

type RiskFormValues = z.infer<typeof riskSchema>;

function buildExplainabilityContributors(
  factors: string[],
  hotspotContributors: IntelligenceContributor[],
  historicalSummary?: string | null
) {
  const factorContributors = factors.map<IntelligenceContributor>((factor) => ({
    label: factor,
    detail: "Returned by the explainability layer for this analysis."
  }));

  const merged = [...factorContributors, ...hotspotContributors];
  const unique = merged.filter(
    (item, index, list) => list.findIndex((candidate) => candidate.label === item.label) === index
  );

  if (historicalSummary) {
    unique.push({
      label: "Historical similarity found",
      detail: historicalSummary
    });
  }

  return unique;
}

export default function RiskCenterPage() {
  const { notify } = useNotifications();
  const [feedSearch, setFeedSearch] = useState("");
  const [feedFilter, setFeedFilter] = useState("all");

  const liveQuery = useQuery({
    queryKey: queryKeys.risk.live,
    queryFn: () => riskService.getLive()
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.risk.history,
    queryFn: () => riskService.getHistory()
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.all,
    queryFn: () => entitiesService.listZones()
  });
  const permitsQuery = useQuery({
    queryKey: queryKeys.permits.all,
    queryFn: () => entitiesService.listPermits()
  });
  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.all,
    queryFn: () => entitiesService.listMaintenance()
  });
  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment()
  });
  const incidentsQuery = useQuery({
    queryKey: queryKeys.incidents.all,
    queryFn: () => entitiesService.listIncidents()
  });
  const scenariosQuery = useQuery({
    queryKey: queryKeys.simulation.scenarios,
    queryFn: () => simulationService.scenarios()
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue
  } = useForm<RiskFormValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
      gas_level: 42,
      temperature: 38,
      equipment_health: 81,
      worker_count: 3,
      worker_present: true,
      maintenance_running: false,
      maintenance_overdue: false,
      weather_condition: "humid",
      shift: "day",
      time_of_day: "afternoon",
      persist_result: true
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: (payload: RiskFormValues) => riskService.analyze(payload),
    onSuccess: () => {
      notify({
        title: "Risk analysis completed",
        description: "The compound risk engine returned an explainable assessment.",
        tone: "success"
      });
      void Promise.all([liveQuery.refetch(), historyQuery.refetch()]);
    },
    onError: (error) => {
      notify({
        title: "Risk analysis failed",
        description: error instanceof Error ? error.message : "Risk analysis could not be completed.",
        tone: "critical"
      });
    }
  });

  const liveRisks = liveQuery.data ?? [];
  const historyRisks = historyQuery.data ?? [];
  const zones = zonesQuery.data?.items ?? [];
  const permits = permitsQuery.data?.items ?? [];
  const maintenanceItems = maintenanceQuery.data?.items ?? [];
  const equipment = equipmentQuery.data?.items ?? [];
  const incidents = incidentsQuery.data?.items ?? [];

  const hotspots = useMemo(
    () =>
      buildZoneHotspots({
        zones,
        plants: [],
        permits,
        maintenance: maintenanceItems,
        equipment,
        incidents
      }),
    [equipment, incidents, maintenanceItems, permits, zones]
  );

  const filteredFeed = useMemo(() => {
    const normalizedQuery = feedSearch.trim().toLowerCase();

    return [...historyRisks]
      .filter((risk) => {
        const matchesSeverity = feedFilter === "all" || risk.severity === feedFilter;
        const haystack = [risk.risk_category, risk.reason, risk.status, risk.recommendation].join(" ").toLowerCase();
        return matchesSeverity && (!normalizedQuery || haystack.includes(normalizedQuery));
      })
      .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
  }, [feedFilter, feedSearch, historyRisks]);

  const liveTrendData = useMemo(
    () =>
      liveRisks.slice(0, 8).map((risk, index) => ({
        label: `L${index + 1}`,
        value: Number(risk.risk_score.toFixed(1))
      })),
    [liveRisks]
  );

  const currentThreat = useMemo(() => {
    const rankedRisks = [...liveRisks].sort((left, right) => right.risk_score - left.risk_score);
    const topRisk = rankedRisks[0] ?? null;

    if (!topRisk) {
      return null;
    }

    const hotspot = hotspots.find((item) => item.zoneId === topRisk.zone_id) ?? hotspots[0] ?? null;
    return { topRisk, hotspot };
  }, [hotspots, liveRisks]);

  if (
    liveQuery.isLoading ||
    historyQuery.isLoading ||
    zonesQuery.isLoading ||
    scenariosQuery.isLoading ||
    permitsQuery.isLoading ||
    maintenanceQuery.isLoading ||
    equipmentQuery.isLoading ||
    incidentsQuery.isLoading
  ) {
    return <LoadingState rows={4} />;
  }

  if (
    liveQuery.isError ||
    historyQuery.isError ||
    zonesQuery.isError ||
    scenariosQuery.isError ||
    permitsQuery.isError ||
    maintenanceQuery.isError ||
    equipmentQuery.isError ||
    incidentsQuery.isError
  ) {
    return (
      <ErrorState
        title="Risk center unavailable"
        description="Risk, zone, or operating context data could not be loaded."
        onRetry={() => {
          void Promise.all([
            liveQuery.refetch(),
            historyQuery.refetch(),
            zonesQuery.refetch(),
            scenariosQuery.refetch(),
            permitsQuery.refetch(),
            maintenanceQuery.refetch(),
            equipmentQuery.refetch(),
            incidentsQuery.refetch()
          ]);
        }}
      />
    );
  }

  const result = analyzeMutation.data;
  const resultHotspot =
    (result?.risk_event?.zone_id ? hotspots.find((hotspot) => hotspot.zoneId === result.risk_event?.zone_id) : null) ?? null;
  const historicalSummary = result ? summarizeHistoricalSimilarity(result.historical_similarity) : null;
  const resultContributors = result
    ? buildExplainabilityContributors(
        result.explainability.contributing_factors,
        resultHotspot?.contributors ?? [],
        historicalSummary
      )
    : [];

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Compound Risk Engine"
        title="Risk center"
        description="Understand why risk exists, which live conditions are contributing to it, how confident the engine is, and what action a safety officer should take next."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Live risks" value={liveRisks.length} icon={Siren} tone="critical" />
        <MetricCard title="Historical risks" value={historyRisks.length} icon={ClipboardList} tone="warning" />
        <MetricCard title="Critical live risks" value={liveRisks.filter((risk) => risk.severity === "critical").length} icon={AlertTriangle} tone="critical" />
        <MetricCard title="AI hotspots" value={hotspots.filter((hotspot) => hotspot.hotspotScore >= 75).length} icon={Sparkles} tone="primary" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <EnterpriseCard
          title="Run risk analysis"
          description="Run the risk analyzer with representative operating inputs and inspect explainable compound-risk reasoning."
        >
          <div className="mb-5 flex flex-wrap gap-2">
            {(scenariosQuery.data ?? []).map((scenario, index) => (
              <Button
                key={`risk-scenario-${scenario}-${index}`}
                variant="secondary"
                size="sm"
                onClick={() => {
                  const normalizedScenario = scenario.toLowerCase();
                  if (normalizedScenario.includes("gas")) {
                    setValue("gas_level", 78);
                  }
                  if (normalizedScenario.includes("fire") || normalizedScenario.includes("temperature")) {
                    setValue("temperature", 82);
                  }
                  if (normalizedScenario.includes("maintenance")) {
                    setValue("maintenance_running", true);
                  }
                  if (normalizedScenario.includes("worker")) {
                    setValue("worker_count", 6);
                  }
                }}
              >
                {titleCase(scenario)}
              </Button>
            ))}
          </div>

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmit(async (values) => {
              await analyzeMutation.mutateAsync(values);
            })}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">Zone</label>
              <Select {...register("zone_id")} aria-label="Select zone for risk analysis">
                <option value="">Select zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.zone_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Gas level</label>
              <Input type="number" step="0.1" {...register("gas_level")} />
              {errors.gas_level ? <p className="mt-2 text-sm text-critical">{errors.gas_level.message}</p> : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Temperature</label>
              <Input type="number" step="0.1" {...register("temperature")} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Equipment health</label>
              <Input type="number" step="1" {...register("equipment_health")} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Worker count</label>
              <Input type="number" step="1" {...register("worker_count")} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Weather condition</label>
              <Input {...register("weather_condition")} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Shift</label>
              <Input {...register("shift")} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Time of day</label>
              <Input {...register("time_of_day")} />
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-sm">
              <Checkbox {...register("worker_present")} />
              Worker present in the zone
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-sm">
              <Checkbox {...register("maintenance_running")} />
              Maintenance currently running
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-sm">
              <Checkbox {...register("maintenance_overdue")} />
              Maintenance overdue
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-sm">
              <Checkbox {...register("persist_result")} />
              Persist result to history
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting || analyzeMutation.isPending}>
                {analyzeMutation.isPending ? "Analyzing..." : "Run explainable risk analysis"}
              </Button>
            </div>
          </form>

          {result ? (
            <div className="mt-6 space-y-4">
              <SuccessBanner
                message={`AI risk score ${result.risk_score.toFixed(2)} generated with ${Math.round(result.confidence * 100)}% confidence.`}
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">AI risk score</p>
                  <p className="mt-3 text-2xl font-semibold">{result.risk_score.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <div className="mt-3">
                    <RiskBadge severity={result.severity} />
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="mt-3 text-2xl font-semibold">{result.confidence.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Prediction horizon</p>
                  <p className="mt-3 text-lg font-semibold">{getPredictionHorizon(result.severity, result.risk_score)}</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <EnterpriseCard title="AI explanation" contentClassName="pt-5">
                  <p className="text-sm leading-6 text-muted-foreground">{result.explainability.why}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="mt-2 font-medium">{result.risk_category}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      <p className="text-sm text-muted-foreground">Potential impact</p>
                      <p className="mt-2 font-medium">{result.expected_consequence}</p>
                    </div>
                  </div>
                </EnterpriseCard>

                <EnterpriseCard title="Recommended action" contentClassName="pt-5">
                  <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                    <p className="text-sm font-medium text-primary">Immediate recommendation</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {result.recommended_actions[0]?.action
                        ? `${result.recommended_actions[0].action}: ${result.recommended_actions[0].rationale}`
                        : result.recommendation}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.regulations.length ? (
                      result.regulations.map((regulation, index) => (
                        <StatusBadge key={`risk-regulation-${regulation}-${index}`} status={regulation} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No regulations returned for this run.</p>
                    )}
                  </div>
                </EnterpriseCard>
              </div>

              <EnterpriseCard
                title="Risk contributors"
                description="Explain the critical overlap of sensor, permit, maintenance, worker, and historical signals."
              >
                <IntelligenceContributors
                  items={resultContributors}
                  emptyDescription="This run did not include any explicit contributing factors."
                />
              </EnterpriseCard>

              <div className="grid gap-4 xl:grid-cols-2">
                <EnterpriseCard title="Triggered rules" contentClassName="pt-5">
                  {result.applicable_rules.length ? (
                    <div className="space-y-3">
                      {result.applicable_rules.map((rule) => (
                        <div key={rule.rule_id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{rule.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <RiskBadge severity={rule.severity} />
                              <StatusBadge status={`+${rule.score_delta.toFixed(0)}`} />
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">{rule.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="No triggered rules"
                      description="No configurable rules were returned for this analysis."
                    />
                  )}
                </EnterpriseCard>

                <EnterpriseCard title="Evidence" contentClassName="pt-5">
                  <pre className="overflow-x-auto rounded-2xl bg-background/60 p-3 text-xs text-muted-foreground">
                    {JSON.stringify(result.evidence, null, 2)}
                  </pre>
                </EnterpriseCard>
              </div>

              <EnterpriseCard title="Recommended actions" contentClassName="pt-5">
                <div className="space-y-3">
                  {result.recommended_actions.length ? (
                    result.recommended_actions.map((action, index) => (
                      <div key={`${action.action}-${index}`} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{action.action}</p>
                          <StatusBadge status={action.priority} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{action.rationale}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="No recommended actions returned"
                      description="The current analysis did not generate any recommendation actions."
                    />
                  )}
                </div>
              </EnterpriseCard>

              <EnterpriseCard title="Historical similarity" contentClassName="pt-5">
                <div className="space-y-3">
                  {result.historical_similarity.length ? (
                    result.historical_similarity.map((match, index) => (
                      <div key={`${match.reference_id}-${index}`} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{match.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{match.source}</p>
                          </div>
                          <p className="text-lg font-semibold">{match.similarity_score.toFixed(2)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{match.summary}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={SearchX}
                      title="No similar events returned"
                      description="This analysis did not surface any historical similarity matches."
                    />
                  )}
                </div>
              </EnterpriseCard>
            </div>
          ) : null}
        </EnterpriseCard>

        <div className="panel-grid">
          <EnterpriseCard
            title="Current AI threat picture"
            description="Surface the dominant compound-risk story from live signals before the operator opens a specific historical event."
          >
            {currentThreat ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge severity={currentThreat.topRisk.severity} />
                        <StatusBadge status={currentThreat.topRisk.risk_category} />
                      </div>
                      <p className="mt-4 break-words text-lg font-semibold">
                        {currentThreat.topRisk.reason}
                      </p>
                      <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">
                        {currentThreat.topRisk.recommendation}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-background/70 px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Horizon</p>
                      <p className="mt-2 text-lg font-semibold">
                        {getPredictionHorizon(currentThreat.topRisk.severity, currentThreat.topRisk.risk_score)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">AI score</p>
                      <p className="mt-2 text-lg font-semibold">{currentThreat.topRisk.risk_score.toFixed(1)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Confidence</p>
                      <p className="mt-2 text-lg font-semibold">{Math.round(currentThreat.topRisk.confidence * 100)}%</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Potential impact</p>
                      <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                        {currentThreat.topRisk.expected_consequence ?? "Compound operational disruption if the overlap persists."}
                      </p>
                    </div>
                  </div>
                </div>
                <IntelligenceContributors
                  items={currentThreat.hotspot?.contributors ?? []}
                  emptyDescription="The live threat does not yet have any derived cross-domain contributors."
                />
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No dominant live threat"
                description="The live risk feed is not currently returning any compound-risk events."
              />
            )}
          </EnterpriseCard>

          <EnterpriseCard title="Live risk signal" description="Recent live risk scores from the live operations feed.">
            {liveTrendData.length ? (
              <TrendLineChart data={liveTrendData} />
            ) : (
              <EmptyState
                icon={Activity}
                title="No live risk signal"
                description="The live risk endpoint is currently returning no records."
              />
            )}
          </EnterpriseCard>

          <EnterpriseCard title="Risk event feed" description="Searchable history of explainable risk events created by Sentinel AI workflows.">
            <DataToolbar summary={`${formatNumber(filteredFeed.length)} historical risk events match the current feed filters.`}>
              <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <SearchBar
                  value={feedSearch}
                  onChange={(event) => setFeedSearch(event.target.value)}
                  placeholder="Search category, reason, status, or recommendation"
                  aria-label="Search risk history"
                />
                <Select value={feedFilter} onChange={(event) => setFeedFilter(event.target.value)} aria-label="Filter risk history by severity">
                  <option value="all">All severities</option>
                  <option value="safe">Safe</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </FilterBar>
            </DataToolbar>

            <div className="mt-5">
              {filteredFeed.length ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Severity</TableHeaderCell>
                        <TableHeaderCell>Category</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Why AI flagged it</TableHeaderCell>
                        <TableHeaderCell>Updated</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredFeed.slice(0, 8).map((risk) => (
                        <TableRow key={risk.id}>
                          <TableCell>
                            <RiskBadge severity={risk.severity} />
                          </TableCell>
                          <TableCell>{risk.risk_category}</TableCell>
                          <TableCell>
                            <StatusBadge status={risk.status} />
                          </TableCell>
                          <TableCell className="max-w-sm text-muted-foreground">{risk.reason}</TableCell>
                          <TableCell>{formatDateTime(risk.updated_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="No risk events match the current filters"
                  description="Broaden the feed search or select a different severity filter to restore risk history results."
                />
              )}
            </div>
          </EnterpriseCard>
        </div>
      </div>
    </div>
  );
}
