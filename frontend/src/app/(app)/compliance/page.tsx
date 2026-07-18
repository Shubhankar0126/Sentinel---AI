"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Factory, FileBadge2, SearchX, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataToolbar } from "@/components/common/data-toolbar";
import { AgentNetworkPanel } from "@/components/common/agent-network-panel";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { ScoreBar } from "@/components/common/score-bar";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { SuccessBanner } from "@/components/common/success-banner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";
import { useNotifications } from "@/providers/notification-provider";
import { complianceService } from "@/services/compliance-service";
import { entitiesService } from "@/services/entities-service";
import { formatDateTime, formatNumber, titleCase } from "@/utils/format";
import {
  buildAgentInsights,
  buildComplianceWatchlist,
  buildExecutiveDecisionBrief,
  extractInsightList
} from "@/utils/intelligence";

const complianceSchema = z.object({
  plant_id: z.string().min(1),
  framework: z.enum(["osha", "iso_45001", "factory_act", "oisd"])
});

type ComplianceValues = z.infer<typeof complianceSchema>;

export default function CompliancePage() {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [search, setSearch] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("all");

  const reportsQuery = useQuery({
    queryKey: queryKeys.compliance.all,
    queryFn: () => complianceService.list()
  });
  const plantsQuery = useQuery({
    queryKey: queryKeys.plants.all,
    queryFn: () => entitiesService.listPlants()
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ComplianceValues>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      framework: "osha"
    }
  });

  const plants = plantsQuery.data?.items ?? [];
  const reports = reportsQuery.data ?? [];
  const zones = zonesQuery.data?.items ?? [];
  const permits = permitsQuery.data?.items ?? [];
  const maintenanceItems = maintenanceQuery.data?.items ?? [];
  const equipment = equipmentQuery.data?.items ?? [];
  const incidents = incidentsQuery.data?.items ?? [];

  const plantMap = useMemo(() => new Map(plants.map((plant) => [plant.id, plant.name])), [plants]);

  const filteredReports = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return [...reports]
      .filter((report) => {
        const plantName = plantMap.get(report.plant_id) ?? report.plant_id;
        const matchesFramework = frameworkFilter === "all" || report.framework === frameworkFilter;
        const haystack = [plantName, report.framework].join(" ").toLowerCase();

        return matchesFramework && (!normalizedQuery || haystack.includes(normalizedQuery));
      })
      .sort((left, right) => right.generated_at.localeCompare(left.generated_at));
  }, [frameworkFilter, plantMap, reports, search]);

  const averageScore = reports.length
    ? reports.reduce((sum, report) => sum + report.score, 0) / reports.length
    : 0;
  const lowScoreCount = reports.filter((report) => report.score < 75).length;
  const frameworksCovered = new Set(reports.map((report) => report.framework)).size;
  const complianceWatchlist = useMemo(
    () =>
      buildComplianceWatchlist({
        plants,
        zones,
        reports,
        permits,
        maintenance: maintenanceItems,
        equipment,
        incidents
      }),
    [equipment, incidents, maintenanceItems, permits, plants, reports, zones]
  );

  const agentInsights = useMemo(
    () =>
      buildAgentInsights({
        hotspots: [],
        liveRisks: [],
        permits,
        maintenance: maintenanceItems,
        incidents,
        plants,
        zones,
        equipment,
        complianceReports: reports
      }),
    [equipment, incidents, maintenanceItems, permits, plants, reports, zones]
  );

  const executiveBrief = useMemo(() => buildExecutiveDecisionBrief(agentInsights), [agentInsights]);

  const generateMutation = useMutation({
    mutationFn: (payload: ComplianceValues) => complianceService.generate(payload),
    onSuccess: async (report) => {
      notify({
        title: "Compliance report generated",
        description: `${titleCase(report.framework)} report generated successfully.`,
        tone: "success"
      });
      reset({ plant_id: "", framework: report.framework });
      await queryClient.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
    onError: (error) => {
      notify({
        title: "Compliance report failed",
        description: error instanceof Error ? error.message : "The compliance report could not be generated.",
        tone: "critical"
      });
    }
  });

  const generatedViolations = extractInsightList(generateMutation.data?.violations, 3);
  const generatedRecommendations = extractInsightList(generateMutation.data?.recommendations, 3);

  if (
    reportsQuery.isLoading ||
    plantsQuery.isLoading ||
    zonesQuery.isLoading ||
    permitsQuery.isLoading ||
    maintenanceQuery.isLoading ||
    equipmentQuery.isLoading ||
    incidentsQuery.isLoading
  ) {
    return <LoadingState rows={4} />;
  }

  if (
    reportsQuery.isError ||
    plantsQuery.isError ||
    zonesQuery.isError ||
    permitsQuery.isError ||
    maintenanceQuery.isError ||
    equipmentQuery.isError ||
    incidentsQuery.isError
  ) {
    return (
      <ErrorState
        title="Compliance view unavailable"
        description="Compliance reports or live plant context could not be loaded."
        onRetry={() =>
          void Promise.all([
            reportsQuery.refetch(),
            plantsQuery.refetch(),
            zonesQuery.refetch(),
            permitsQuery.refetch(),
            maintenanceQuery.refetch(),
            equipmentQuery.refetch(),
            incidentsQuery.refetch()
          ])
        }
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Regulatory Assurance"
        title="Compliance"
        description="See which violations, inspection gaps, permit conflicts, and corrective actions deserve immediate regulatory attention."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Reports" value={reports.length} icon={ClipboardCheck} />
        <MetricCard title="Plants covered" value={new Set(reports.map((report) => report.plant_id)).size} icon={Factory} tone="primary" />
        <MetricCard title="Average score" value={averageScore} icon={ShieldCheck} tone="success" format="percent" />
        <MetricCard title="Below 75%" value={lowScoreCount} icon={FileBadge2} tone="warning" />
      </div>

      <EnterpriseCard
        title="AI compliance watchlist"
        description="Cross-check compliance posture against live permits, maintenance pressure, asset condition, and unresolved incidents."
      >
        {complianceWatchlist.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {complianceWatchlist.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No immediate compliance watch items"
            description="The current live operational context is not surfacing any standout AI compliance escalations."
          />
        )}
      </EnterpriseCard>

      <EnterpriseCard
        title="Regulatory intelligence posture"
        description="Review which guidance is active in this environment and which follow-ups still require additional source content."
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
            <p className="text-sm font-medium text-primary">Guidance coverage</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Sentinel is currently reasoning over stored compliance reports for OSHA, ISO 45001, Factory Act, and OISD when those records are available.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              DGMS-specific source documents are not indexed in this environment today, so this page does not claim DGMS-specific citations until those sources are added to the regulatory knowledge library.
            </p>
          </div>
          {executiveBrief ? (
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm font-medium">Executive compliance summary</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{executiveBrief.narrative}</p>
              <p className="mt-3 text-sm text-muted-foreground">Next action: {executiveBrief.nextAction}</p>
            </div>
          ) : null}
          <AgentNetworkPanel
            items={agentInsights.filter((agent) =>
              [
                "compliance-intelligence-agent",
                "permit-intelligence-agent",
                "maintenance-intelligence-agent",
                "executive-summary-agent"
              ].includes(agent.id)
            )}
            limit={4}
          />
        </div>
      </EnterpriseCard>

      <div className="grid gap-6 2xl:grid-cols-[0.85fr_1.15fr]">
        <EnterpriseCard title="Generate report" description="Generate a compliance report for the selected plant and immediately review surfaced findings.">
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              await generateMutation.mutateAsync(values);
            })}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">Plant</label>
              <Select {...register("plant_id")} aria-label="Select plant for compliance report">
                <option value="">Select plant</option>
                {plants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name}
                  </option>
                ))}
              </Select>
              {errors.plant_id ? <p className="mt-2 text-sm text-critical">{errors.plant_id.message}</p> : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Framework</label>
              <Select {...register("framework")} aria-label="Select compliance framework">
                <option value="osha">OSHA</option>
                <option value="iso_45001">ISO 45001</option>
                <option value="factory_act">Factory Act</option>
                <option value="oisd">OISD</option>
              </Select>
            </div>
            <Button type="submit" disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generating..." : "Generate compliance report"}
            </Button>
          </form>
          {generateMutation.data ? (
            <SuccessBanner
              className="mt-6"
              message={`Generated ${titleCase(generateMutation.data.framework)} report with score ${generateMutation.data.score.toFixed(1)}%.`}
            />
          ) : null}

          <div className="mt-6 space-y-3">
            <ScoreBar
              label="Average compliance score"
              value={averageScore}
              helper={`${formatNumber(frameworksCovered)} frameworks currently represented in stored reports.`}
              tone={averageScore >= 85 ? "success" : averageScore >= 70 ? "warning" : "critical"}
            />
          </div>

          {generateMutation.data ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm font-medium">AI surfaced violations</p>
                <div className="mt-3 space-y-2">
                  {generatedViolations.length ? (
                    generatedViolations.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No explicit violation lines were returned in this report.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm font-medium">Recommended corrective actions</p>
                <div className="mt-3 space-y-2">
                  {generatedRecommendations.length ? (
                    generatedRecommendations.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No corrective actions were returned in this report.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </EnterpriseCard>

        <EnterpriseCard title="Compliance reports" description="Stored reports expanded with likely violations and corrective actions.">
          <DataToolbar
            summary={`${formatNumber(filteredReports.length)} reports match the current compliance filters.`}
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setFrameworkFilter("all");
                }}
              >
                Reset filters
              </Button>
            }
          >
            <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <SearchBar
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by plant or framework"
                aria-label="Search compliance reports"
              />
              <Select value={frameworkFilter} onChange={(event) => setFrameworkFilter(event.target.value)} aria-label="Filter compliance reports by framework">
                <option value="all">All frameworks</option>
                <option value="osha">OSHA</option>
                <option value="iso_45001">ISO 45001</option>
                <option value="factory_act">Factory Act</option>
                <option value="oisd">OISD</option>
              </Select>
            </FilterBar>
          </DataToolbar>

          <div className="mt-5 space-y-3">
            {filteredReports.length ? (
              filteredReports.map((report) => {
                const violations = extractInsightList(report.violations, 2);
                const recommendations = extractInsightList(report.recommendations, 2);

                return (
                  <div key={report.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{titleCase(report.framework)}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Plant: {plantMap.get(report.plant_id) ?? report.plant_id}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Generated {formatDateTime(report.generated_at)}
                        </p>
                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Possible violations</p>
                            <div className="mt-2 space-y-2">
                              {violations.length ? (
                                violations.map((item, index) => (
                                  <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                                    {item}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No violation details returned.</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Corrective actions</p>
                            <div className="mt-2 space-y-2">
                              {recommendations.length ? (
                                recommendations.map((item, index) => (
                                  <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                                    {item}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No corrective actions returned.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-[220px]">
                        <ScoreBar
                          label="Compliance score"
                          value={report.score}
                          tone={report.score >= 85 ? "success" : report.score >= 70 ? "warning" : "critical"}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={SearchX}
                title="No compliance reports match the current filters"
                description="Reset the report search or broaden the framework filter to restore stored compliance reports."
              />
            )}
          </div>
        </EnterpriseCard>
      </div>
    </div>
  );
}
