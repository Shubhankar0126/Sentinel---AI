"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, FileSearch, History, MessageSquareQuote, RefreshCw, ShieldAlert, Sparkles, Wand2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";

import { AgentNetworkPanel } from "@/components/common/agent-network-panel";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { LiveIndicator } from "@/components/common/live-indicator";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SuccessBanner } from "@/components/common/success-banner";
import { VirtualizedList } from "@/components/common/virtualized-list";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProgressiveText } from "@/hooks/use-progressive-text";
import { useSavedState } from "@/hooks/use-saved-state";
import { formatLastUpdated, getLiveRefetchInterval, liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { useNotifications } from "@/providers/notification-provider";
import { copilotService } from "@/services/copilot-service";
import { entitiesService } from "@/services/entities-service";
import { riskService } from "@/services/risk-service";
import type { CopilotCitation } from "@/types/copilot";
import { formatDateTime } from "@/utils/format";
import { buildAgentInsights, buildExecutiveDecisionBrief, buildZoneHotspots } from "@/utils/intelligence";

const copilotSchema = z.object({
  question: z.string().min(3),
  plant_id: z.string().optional()
});

type CopilotValues = z.infer<typeof copilotSchema>;

export function CopilotWorkbench() {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [liveMode, setLiveMode] = useSavedState("sentinel-copilot-live", true);
  const [citationOpen, setCitationOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CopilotCitation | null>(null);

  const historyQuery = useQuery({
    queryKey: queryKeys.copilot.history,
    queryFn: () => copilotService.getHistory(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.copilotHistory)
  });
  const plantsQuery = useQuery({
    queryKey: queryKeys.plants.all,
    queryFn: () => entitiesService.listPlants()
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.all,
    queryFn: () => entitiesService.listZones()
  });
  const risksQuery = useQuery({
    queryKey: queryKeys.risk.live,
    queryFn: () => riskService.getLive(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.copilotHistory)
  });
  const incidentsQuery = useQuery({
    queryKey: queryKeys.incidents.all,
    queryFn: () => entitiesService.listIncidents(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.copilotHistory)
  });
  const permitsQuery = useQuery({
    queryKey: queryKeys.permits.all,
    queryFn: () => entitiesService.listPermits(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.copilotHistory)
  });
  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.all,
    queryFn: () => entitiesService.listMaintenance(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.copilotHistory)
  });
  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.copilotHistory)
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CopilotValues>({
    resolver: zodResolver(copilotSchema),
    defaultValues: {
      question: "",
      plant_id: ""
    }
  });

  const chatMutation = useMutation({
    mutationFn: (payload: CopilotValues) => copilotService.chat(payload),
    onSuccess: async () => {
      reset({ question: "", plant_id: watch("plant_id") ?? "" });
      notify({
        title: "Copilot response ready",
        description: "Copilot returned a cited answer and stored the conversation history.",
        tone: "success"
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.copilot.history });
    },
    onError: (error) => {
      notify({
        title: "Copilot request failed",
        description: error instanceof Error ? error.message : "Copilot could not process the request.",
        tone: "critical"
      });
    }
  });

  const clearMutation = useMutation({
    mutationFn: () => copilotService.clearHistory(),
    onSuccess: async () => {
      setSelectedCitation(null);
      setCitationOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.copilot.history });
      notify({ title: "Copilot history cleared", tone: "success" });
    }
  });

  const hotspots = useMemo(
    () =>
      buildZoneHotspots({
        zones: zonesQuery.data?.items ?? [],
        plants: plantsQuery.data?.items ?? [],
        permits: permitsQuery.data?.items ?? [],
        maintenance: maintenanceQuery.data?.items ?? [],
        equipment: equipmentQuery.data?.items ?? [],
        incidents: incidentsQuery.data?.items ?? []
      }),
    [
      equipmentQuery.data?.items,
      incidentsQuery.data?.items,
      maintenanceQuery.data?.items,
      permitsQuery.data?.items,
      plantsQuery.data?.items,
      zonesQuery.data?.items
    ]
  );

  const liveProjectContext = useMemo(() => {
    const topHotspot = hotspots[0] ?? null;
    const activePermits = (permitsQuery.data?.items ?? []).filter(
      (permit) => permit.status === "open" || permit.status === "approved"
    );
    const overdueMaintenance = (maintenanceQuery.data?.items ?? []).filter(
      (item) => item.status === "running" || item.status === "overdue"
    );
    const unresolvedIncidents = (incidentsQuery.data?.items ?? []).filter((incident) => incident.status !== "closed");
    const liveRisks = risksQuery.data ?? [];

    return {
      topHotspot,
      activePermits,
      overdueMaintenance,
      unresolvedIncidents,
      liveRisks
    };
  }, [hotspots, incidentsQuery.data?.items, maintenanceQuery.data?.items, permitsQuery.data?.items, risksQuery.data]);

  const agentInsights = useMemo(
    () =>
      buildAgentInsights({
        hotspots,
        liveRisks: liveProjectContext.liveRisks,
        permits: permitsQuery.data?.items ?? [],
        maintenance: maintenanceQuery.data?.items ?? [],
        incidents: incidentsQuery.data?.items ?? [],
        plants: plantsQuery.data?.items ?? [],
        zones: zonesQuery.data?.items ?? [],
        equipment: equipmentQuery.data?.items ?? []
      }),
    [
      equipmentQuery.data?.items,
      hotspots,
      incidentsQuery.data?.items,
      liveProjectContext.liveRisks,
      maintenanceQuery.data?.items,
      permitsQuery.data?.items,
      plantsQuery.data?.items,
      zonesQuery.data?.items
    ]
  );

  const executiveBrief = useMemo(() => buildExecutiveDecisionBrief(agentInsights), [agentInsights]);

  const dynamicSuggestedQuestions = useMemo(() => {
    const prompts = [
      liveProjectContext.topHotspot
        ? `Why is ${liveProjectContext.topHotspot.zoneName} critical right now?`
        : "Why is the highest-risk zone critical right now?",
      liveProjectContext.activePermits[0]
        ? `Which permits are unsafe right now, starting with ${liveProjectContext.activePermits[0].permit_number}?`
        : "Which permits are unsafe right now?",
      liveProjectContext.overdueMaintenance[0]
        ? `Which maintenance activities should stop first, especially around ${liveProjectContext.overdueMaintenance[0].equipment_id}?`
        : "Which maintenance activities should stop first?",
      "Which regulation applies to the current operating condition?",
      "Has this happened before and what should happen next?"
    ];

    return [...new Set(prompts)];
  }, [liveProjectContext.activePermits, liveProjectContext.overdueMaintenance, liveProjectContext.topHotspot]);

  const actionShortcuts = useMemo(
    () => [
      "Generate investigation report for the latest incident.",
      "Summarize applicable regulations for site leadership.",
      "Turn the recommended actions into a shift handover checklist.",
      liveProjectContext.topHotspot
        ? `Explain why ${liveProjectContext.topHotspot.zoneName} is the top AI hotspot today.`
        : "Draft an executive summary for today's safety posture."
    ],
    [liveProjectContext.topHotspot]
  );

  const latestResponse = chatMutation.data;
  const streamedNarrative = useProgressiveText(
    latestResponse ? `${latestResponse.summary}\n\n${latestResponse.current_situation}` : "",
    Boolean(latestResponse)
  );

  const followUpPrompts = useMemo(() => {
    if (!latestResponse) {
      return [];
    }

    const prompts = [
      "What evidence most strongly supports this answer?",
      latestResponse.applicable_regulations[0]
        ? `Summarize ${latestResponse.applicable_regulations[0]} for plant leadership.`
        : null,
      latestResponse.recommendations[0]
        ? `Convert "${latestResponse.recommendations[0]}" into a step-by-step action plan.`
        : null,
      liveProjectContext.topHotspot
        ? `What should the next shift do first in ${liveProjectContext.topHotspot.zoneName}?`
        : "What should the next shift do first?"
    ].filter(Boolean);

    return prompts as string[];
  }, [latestResponse, liveProjectContext.topHotspot]);

  useEffect(() => {
    if (latestResponse?.citations.length) {
      setSelectedCitation(latestResponse.citations[0]);
    }
  }, [latestResponse]);

  if (
    historyQuery.isLoading ||
    plantsQuery.isLoading ||
    zonesQuery.isLoading ||
    risksQuery.isLoading ||
    incidentsQuery.isLoading ||
    permitsQuery.isLoading ||
    maintenanceQuery.isLoading ||
    equipmentQuery.isLoading
  ) {
    return <LoadingState rows={4} />;
  }

  if (
    historyQuery.isError ||
    plantsQuery.isError ||
    zonesQuery.isError ||
    risksQuery.isError ||
    incidentsQuery.isError ||
    permitsQuery.isError ||
    maintenanceQuery.isError ||
    equipmentQuery.isError
  ) {
    return (
      <ErrorState
        title="AI Copilot unavailable"
        description="Copilot history or live operating context could not be loaded."
        onRetry={() =>
          void Promise.all([
            historyQuery.refetch(),
            plantsQuery.refetch(),
            zonesQuery.refetch(),
            risksQuery.refetch(),
            incidentsQuery.refetch(),
            permitsQuery.refetch(),
            maintenanceQuery.refetch(),
            equipmentQuery.refetch()
          ])
        }
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Grounded AI"
        title="AI Copilot"
        description="Ground prompts and answers in live risk, permit, maintenance, incident, and hotspot context."
        actions={
          <>
            <LiveIndicator active={liveMode} helper={formatLastUpdated(new Date(historyQuery.dataUpdatedAt))} />
            <Button variant="secondary" onClick={() => setLiveMode((current) => !current)}>
              {liveMode ? "Pause history sync" : "Resume history sync"}
            </Button>
            <Button variant="secondary" onClick={() => void historyQuery.refetch()} disabled={historyQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${historyQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh history
            </Button>
            <Button variant="secondary" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}>
              Clear history
            </Button>
          </>
        }
      />

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <EnterpriseCard title="Ask Copilot" description="Responses include summary, evidence, regulations, recommendations, citations, and confidence.">
          <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <p className="text-sm font-medium text-primary">Live industrial context</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Copilot currently sees {(risksQuery.data ?? []).length} live risks, {liveProjectContext.activePermits.length} active permits, {liveProjectContext.overdueMaintenance.length} maintenance pressure items, and {liveProjectContext.unresolvedIncidents.length} unresolved incidents.
            </p>
            {executiveBrief ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Executive Summary Agent is currently coordinating {executiveBrief.supportingAgents.length} specialized AI lenses so the final answer stays aligned with the live operating picture.
              </p>
            ) : null}
          </div>

          <div className="mb-5 rounded-2xl border border-border/70 bg-background/35 p-4">
            <p className="text-sm font-medium">AI action shortcuts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {actionShortcuts.map((question, index) => (
                <Button
                  key={`copilot-action-shortcut-${question}-${index}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setValue("question", question, { shouldValidate: true })}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {question}
                </Button>
              ))}
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              await chatMutation.mutateAsync(values);
            })}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">Plant context</label>
              <Select {...register("plant_id")} aria-label="Select plant context for copilot">
                <option value="">All plants</option>
                {(plantsQuery.data?.items ?? []).map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Question</label>
              <Textarea
                placeholder="Why is Zone 3 critical? Which permits are unsafe? Has this happened before?"
                {...register("question")}
              />
              {errors.question ? <p className="mt-2 text-sm text-critical">{errors.question.message}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {dynamicSuggestedQuestions.map((question, index) => (
                <Button
                  key={`copilot-suggested-question-${question}-${index}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setValue("question", question, { shouldValidate: true })}
                >
                  {question}
                </Button>
              ))}
            </div>
            <Button type="submit" disabled={chatMutation.isPending}>
              {chatMutation.isPending ? "Consulting Copilot..." : "Submit question"}
            </Button>
          </form>

          <div className="mt-6">
            {chatMutation.isPending ? (
              <LoadingState rows={3} />
            ) : latestResponse ? (
              <div className="space-y-4">
                <SuccessBanner
                  message={`Confidence ${latestResponse.confidence.toFixed(2)} returned by ${latestResponse.provider}.`}
                />
                {executiveBrief ? (
                  <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4">
                    <p className="text-sm font-medium text-primary">Unified AI orchestration</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {executiveBrief.headline} {executiveBrief.narrative}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Copilot is using these same agent perspectives to explain and recommend next steps without recalculating the primary risk score.
                    </p>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">Industrial safety expert response</p>
                        <StatusBadge status={latestResponse.provider} />
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{streamedNarrative}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (latestResponse.citations[0]) {
                              setSelectedCitation(latestResponse.citations[0]);
                              setCitationOpen(true);
                            }
                          }}
                        >
                          <MessageSquareQuote className="mr-2 h-4 w-4" />
                          Open citation drawer
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setValue(
                              "question",
                              liveProjectContext.topHotspot
                                ? `What should operators do in the next 15 minutes for ${liveProjectContext.topHotspot.zoneName}?`
                                : "What should operators do in the next 15 minutes?",
                              { shouldValidate: true }
                            )
                          }
                        >
                          Next 15 minutes
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <EnterpriseCard title="Evidence" contentClassName="pt-5">
                    {latestResponse.evidence.length ? (
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {latestResponse.evidence.map((item, index) => (
                          <li key={`${item}-${index}`}>- {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        icon={FileSearch}
                        title="No evidence returned"
                        description="The current response did not include explicit evidence lines."
                      />
                    )}
                  </EnterpriseCard>
                  <EnterpriseCard title="Applicable regulations" contentClassName="pt-5">
                    {latestResponse.applicable_regulations.length ? (
                      <div className="flex flex-wrap gap-2">
                        {latestResponse.applicable_regulations.map((regulation, index) => (
                          <StatusBadge key={`copilot-regulation-${regulation}-${index}`} status={regulation} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={ShieldAlert}
                        title="No regulations returned"
                        description="The response did not reference any specific regulations."
                      />
                    )}
                  </EnterpriseCard>
                </div>

                <EnterpriseCard title="Recommendations" contentClassName="pt-5">
                  {latestResponse.recommendations.length ? (
                    <div className="space-y-3">
                      {latestResponse.recommendations.map((recommendation, index) => (
                        <div key={`${recommendation}-${index}`} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                          <p className="text-sm text-muted-foreground">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="No recommendations returned"
                      description="The current response did not include any recommended actions."
                    />
                  )}
                </EnterpriseCard>

                <EnterpriseCard title="Follow-up prompts" description="Continue the conversation without leaving the current context.">
                  {followUpPrompts.length ? (
                    <div className="flex flex-wrap gap-2">
                      {followUpPrompts.map((prompt, index) => (
                        <Button
                          key={`copilot-follow-up-${prompt}-${index}`}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setValue("question", prompt, { shouldValidate: true })}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="Ask the first question"
                      description="Follow-up prompts will appear after the first response is generated."
                    />
                  )}
                </EnterpriseCard>

                <EnterpriseCard title="Retrieved sources" contentClassName="pt-5">
                  {latestResponse.retrieved_documents.length ? (
                    <div className="flex flex-wrap gap-2">
                      {latestResponse.retrieved_documents.map((document, index) => (
                        <StatusBadge key={`retrieved-document-${document}-${index}`} status={document} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={FileSearch}
                      title="No retrieved documents listed"
                      description="This response did not include a retrieved document list."
                    />
                  )}
                </EnterpriseCard>
              </div>
            ) : (
              <EmptyState
                icon={Bot}
                title="Ask the AI Copilot"
                description="Submit a question to generate a cited answer grounded in the AI knowledge layer and live operating context."
              />
            )}
          </div>
        </EnterpriseCard>

        <div className="panel-grid">
          <EnterpriseCard
            title="AI agent orchestration"
            description="Specialized agents coordinate to deliver grounded, operational answers."
          >
            {executiveBrief ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-sm font-medium text-primary">Executive coordination</p>
                  <p className="mt-3 text-lg font-semibold">{executiveBrief.headline}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{executiveBrief.narrative}</p>
                </div>
                <AgentNetworkPanel items={agentInsights} />
              </div>
            ) : (
              <EmptyState
                icon={Bot}
                title="No active orchestration context"
                description="Copilot does not yet have enough live operating inputs to activate the specialized agent layer."
              />
            )}
          </EnterpriseCard>

          <EnterpriseCard title="Live operating context" description="Context-aware prompts and live AI focus areas for the current session.">
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm font-medium">Current AI focus</p>
                <p className="mt-3 text-lg font-semibold">
                  {liveProjectContext.topHotspot?.zoneName ?? "No dominant hotspot returned"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {liveProjectContext.topHotspot
                    ? `${liveProjectContext.topHotspot.hotspotScore.toFixed(0)} hotspot score with ${liveProjectContext.topHotspot.activePermitCount} permit overlaps and ${liveProjectContext.topHotspot.maintenancePressureCount} maintenance pressure items.`
                    : "The current operating picture does not show a dominant hotspot."}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Live risks</p>
                  <p className="mt-2 text-2xl font-semibold">{(risksQuery.data ?? []).length}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Unsafe permits to review</p>
                  <p className="mt-2 text-2xl font-semibold">{liveProjectContext.activePermits.length}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Maintenance pressure</p>
                  <p className="mt-2 text-2xl font-semibold">{liveProjectContext.overdueMaintenance.length}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Unresolved incidents</p>
                  <p className="mt-2 text-2xl font-semibold">{liveProjectContext.unresolvedIncidents.length}</p>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Suggested live prompts</p>
                <div className="flex flex-wrap gap-2">
                  {dynamicSuggestedQuestions.slice(0, 4).map((prompt, index) => (
                    <Button
                      key={`copilot-live-prompt-${prompt}-${index}`}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setValue("question", prompt, { shouldValidate: true })}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </EnterpriseCard>

          <EnterpriseCard title="Conversation memory" description="Persisted history with quick reuse of prior prompts.">
            {(historyQuery.data ?? []).length ? (
              <VirtualizedList
                items={historyQuery.data ?? []}
                itemHeight={190}
                height={Math.min((historyQuery.data ?? []).length, 4) * 190}
                renderItem={(item) => (
                  <div key={item.id} className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-4">
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-primary">
                        <History className="h-3.5 w-3.5" />
                        User question
                      </div>
                      <p className="text-sm text-foreground">{item.question}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        <Bot className="h-3.5 w-3.5" />
                        Assistant response
                      </div>
                      <p className="line-clamp-4 text-sm text-muted-foreground">{item.response}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(item.timestamp)} | {Array.isArray(item.citations) ? item.citations.length : 0} citations stored
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setValue("question", item.question, { shouldValidate: true })}
                      >
                        Reuse prompt
                      </Button>
                    </div>
                  </div>
                )}
              />
            ) : (
              <EmptyState
                icon={History}
                title="No conversation history"
                description="No chat history is currently stored for this user."
              />
            )}
          </EnterpriseCard>
        </div>
      </div>

      <Drawer
        open={citationOpen}
        onClose={() => setCitationOpen(false)}
        title={selectedCitation?.document_name ?? "Citation detail"}
        description="Inspect the retrieved source, section, metadata, and evidence snippet supporting this answer."
      >
        {selectedCitation ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedCitation.section || "section"} />
                <StatusBadge status={selectedCitation.source} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Page {selectedCitation.page ?? "n/a"} | similarity {selectedCitation.score.toFixed(2)}
              </p>
            </div>
            <EnterpriseCard title="Snippet" contentClassName="pt-5">
              <p className="text-sm text-muted-foreground">{selectedCitation.snippet}</p>
            </EnterpriseCard>
            <EnterpriseCard title="Metadata" contentClassName="pt-5">
              <pre className="overflow-x-auto rounded-2xl bg-background/60 p-4 text-xs text-muted-foreground">
                {JSON.stringify(selectedCitation.metadata, null, 2)}
              </pre>
            </EnterpriseCard>
            <div className="flex flex-wrap gap-2">
              {(latestResponse?.citations ?? []).map((citation, index) => (
                <Button
                  key={`${citation.document_name}-${citation.page ?? "na"}-${citation.section ?? "section"}-${index}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCitation(citation)}
                >
                  {citation.document_name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
