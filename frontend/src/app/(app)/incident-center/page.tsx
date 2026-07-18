"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, RefreshCw, SearchX, Siren, TimerReset, UploadCloud, Users } from "lucide-react";

import { DataToolbar } from "@/components/common/data-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { IntelligenceContributors } from "@/components/common/intelligence-contributors";
import { LiveIndicator } from "@/components/common/live-indicator";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { RiskBadge } from "@/components/common/risk-badge";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Timeline } from "@/components/common/timeline";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSavedState } from "@/hooks/use-saved-state";
import { formatLastUpdated, getLiveRefetchInterval, liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { useNotifications } from "@/providers/notification-provider";
import { actionService } from "@/services/action-service";
import { complianceService } from "@/services/compliance-service";
import { entitiesService } from "@/services/entities-service";
import { riskService } from "@/services/risk-service";
import type { IncidentRead } from "@/types/domain";
import { paginateItems } from "@/utils/collections";
import { formatDateTime, formatNumber, titleCase } from "@/utils/format";
import { buildIncidentIntelligence } from "@/utils/intelligence";

const PAGE_SIZE = 8;

type IncidentListResult = Awaited<ReturnType<typeof entitiesService.listIncidents>>;
type IncidentStatusUpdate = "open" | "investigating" | "closed";

function readString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function appendEvidenceEntry(incident: IncidentRead, entry: Record<string, unknown>) {
  return [...(incident.evidence ?? []), entry];
}

export default function IncidentCenterPage() {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useSavedState("sentinel-incidents-search", "");
  const [severityFilter, setSeverityFilter] = useSavedState("sentinel-incidents-severity", "all");
  const [statusFilter, setStatusFilter] = useSavedState("sentinel-incidents-status", "all");
  const [typeFilter, setTypeFilter] = useSavedState("sentinel-incidents-type", "all");
  const [liveMode, setLiveMode] = useSavedState("sentinel-incidents-live", true);
  const [page, setPage] = useState(1);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Operations Desk");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentNote, setAttachmentNote] = useState("");
  const [assignmentOwner, setAssignmentOwner] = useState("");
  const [assignmentPriority, setAssignmentPriority] = useState("high");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [escalationOwner, setEscalationOwner] = useState("");
  const [escalationNote, setEscalationNote] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const incidentsQuery = useQuery({
    queryKey: queryKeys.incidents.all,
    queryFn: () => entitiesService.listIncidents(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.incidents)
  });
  const workersQuery = useQuery({
    queryKey: queryKeys.workers.all,
    queryFn: () => entitiesService.listWorkers()
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.all,
    queryFn: () => entitiesService.listZones()
  });
  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment()
  });
  const permitsQuery = useQuery({
    queryKey: queryKeys.permits.all,
    queryFn: () => entitiesService.listPermits()
  });
  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.all,
    queryFn: () => entitiesService.listMaintenance()
  });
  const complianceQuery = useQuery({
    queryKey: queryKeys.compliance.all,
    queryFn: () => complianceService.list()
  });
  const riskHistoryQuery = useQuery({
    queryKey: queryKeys.risk.history,
    queryFn: () => riskService.getHistory(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.incidents)
  });
  const actionsQuery = useQuery({
    queryKey: queryKeys.actions.all,
    queryFn: () => actionService.list({ skip: 0, limit: 100 }),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.incidents)
  });
  const incidentQuery = useQuery({
    queryKey: selectedIncidentId ? [...queryKeys.incidents.all, selectedIncidentId, "detail"] : [...queryKeys.incidents.all, "detail"],
    queryFn: () => entitiesService.getIncident(selectedIncidentId as string),
    enabled: Boolean(selectedIncidentId),
    refetchInterval: getLiveRefetchInterval(liveMode && Boolean(selectedIncidentId), liveIntervals.incidents)
  });
  const reportQuery = useQuery({
    queryKey: selectedIncidentId ? queryKeys.incidents.report(selectedIncidentId) : [...queryKeys.incidents.all, "report"],
    queryFn: () => entitiesService.getIncidentReport(selectedIncidentId as string),
    enabled: Boolean(selectedIncidentId),
    refetchInterval: getLiveRefetchInterval(liveMode && Boolean(selectedIncidentId), liveIntervals.incidents)
  });

  const invalidateIncidentQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    ]);
  };

  const incidentUpdateMutation = useMutation({
    mutationFn: ({ incidentId, payload }: { incidentId: string; payload: Partial<IncidentRead> }) =>
      entitiesService.updateIncident(incidentId, payload),
    onSuccess: async () => {
      await invalidateIncidentQueries();
    },
    onError: (error) => {
      notify({
        title: "Incident update failed",
        description: error instanceof Error ? error.message : "The incident could not be updated.",
        tone: "critical"
      });
    }
  });

  const actionMutation = useMutation({
    mutationFn: actionService.create,
    onSuccess: async () => {
      await invalidateIncidentQueries();
    },
    onError: (error) => {
      notify({
        title: "Workflow action failed",
        description: error instanceof Error ? error.message : "The workflow action could not be saved.",
        tone: "critical"
      });
    }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({
      incidentIds,
      status
    }: {
      incidentIds: string[];
      status: IncidentStatusUpdate;
    }) => {
      const closedAt = status === "closed" ? new Date().toISOString() : null;

      await Promise.all(
        incidentIds.map((incidentId) =>
          entitiesService.updateIncident(incidentId, {
            status,
            closed_at: closedAt
          })
        )
      );
    },
    onSuccess: async (_data, variables) => {
      setSelectedIds([]);
      notify({
        title: "Incidents updated",
        description: `${variables.incidentIds.length} incidents moved to ${variables.status}.`,
        tone: "success"
      });
      await invalidateIncidentQueries();
    },
    onError: (error) => {
      notify({
        title: "Bulk update failed",
        description: error instanceof Error ? error.message : "The selected incidents could not be updated.",
        tone: "critical"
      });
    }
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async ({
      incidentIds,
      assignedTo
    }: {
      incidentIds: string[];
      assignedTo: string;
    }) => {
      const incidents = (incidentsQuery.data?.items ?? []).filter((item) => incidentIds.includes(item.id));

      await Promise.all(
        incidents.map(async (incident) => {
          await actionService.create({
            action: `[INCIDENT:${incident.id}] Investigate incident ${incident.title}`,
            assigned_to: assignedTo,
            priority: incident.severity === "critical" ? "critical" : "high",
            status: "open"
          });

          await entitiesService.updateIncident(incident.id, {
            status: "investigating",
            evidence: appendEvidenceEntry(incident, {
              type: "assignment",
              assigned_to: assignedTo,
              note: "Assigned from the Incident Center bulk workflow.",
              created_at: new Date().toISOString()
            })
          });
        })
      );
    },
    onSuccess: async (_data, variables) => {
      setSelectedIds([]);
      notify({
        title: "Assignments created",
        description: `${variables.incidentIds.length} incidents were assigned to ${variables.assignedTo}.`,
        tone: "success"
      });
      await invalidateIncidentQueries();
    },
    onError: (error) => {
      notify({
        title: "Bulk assignment failed",
        description: error instanceof Error ? error.message : "The assignment workflow could not be completed.",
        tone: "critical"
      });
    }
  });

  const incidents = incidentsQuery.data?.items ?? [];
  const workers = workersQuery.data?.items ?? [];
  const zones = zonesQuery.data?.items ?? [];
  const equipment = equipmentQuery.data?.items ?? [];
  const permits = permitsQuery.data?.items ?? [];
  const maintenanceItems = maintenanceQuery.data?.items ?? [];
  const complianceReports = complianceQuery.data ?? [];
  const riskHistory = riskHistoryQuery.data ?? [];
  const allActions = actionsQuery.data?.items ?? [];
  const selectedIncident = incidentQuery.data ?? incidents.find((incident) => incident.id === selectedIncidentId) ?? null;
  const zoneMap = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const equipmentMap = useMemo(() => new Map(equipment.map((item) => [item.id, item])), [equipment]);
  const incidentTypes = useMemo(
    () => [...new Set(incidents.map((incident) => incident.incident_type))].sort((left, right) => left.localeCompare(right)),
    [incidents]
  );

  const filteredIncidents = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return [...incidents]
      .filter((incident) => {
        const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
        const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
        const matchesType = typeFilter === "all" || incident.incident_type === typeFilter;
        const haystack = [incident.title, incident.description, incident.incident_type, incident.root_cause, incident.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesSeverity && matchesStatus && matchesType && (!normalizedQuery || haystack.includes(normalizedQuery));
      })
      .sort((left, right) => new Date(right.reported_at).getTime() - new Date(left.reported_at).getTime());
  }, [debouncedSearch, incidents, severityFilter, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, severityFilter, statusFilter, typeFilter]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((item) => filteredIncidents.some((incident) => incident.id === item)));
  }, [filteredIncidents]);

  useEffect(() => {
    setCommentDraft("");
    setAttachmentName("");
    setAttachmentNote("");
    setAssignmentOwner("");
    setAssignmentNote("");
    setEscalationOwner("");
    setEscalationNote("");
  }, [selectedIncidentId]);

  const paginatedIncidents = paginateItems(filteredIncidents, page, PAGE_SIZE);
  const openIncidents = incidents.filter((incident) => incident.status === "open").length;
  const investigatingIncidents = incidents.filter((incident) => incident.status === "investigating").length;
  const criticalIncidents = incidents.filter((incident) => incident.severity === "critical").length;
  const incidentActionBacklog = allActions
    .filter((action) => action.action.includes("[INCIDENT:") && action.status !== "completed")
    .slice(0, 6);
  const selectedUnreadPageIds = paginatedIncidents.items.map((incident) => incident.id);
  const allVisibleSelected =
    selectedUnreadPageIds.length > 0 && selectedUnreadPageIds.every((incidentId) => selectedIds.includes(incidentId));

  const incidentActions = useMemo(() => {
    if (!selectedIncidentId) {
      return [];
    }

    return allActions
      .filter((action) => action.action.includes(`[INCIDENT:${selectedIncidentId}]`))
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  }, [allActions, selectedIncidentId]);

  const evidenceEntries = selectedIncident?.evidence ?? [];
  const selectedIncidentIntelligence = useMemo(() => {
    if (!selectedIncident) {
      return null;
    }

    const zone = selectedIncident.zone_id ? zoneMap.get(selectedIncident.zone_id) ?? null : null;
    const asset = selectedIncident.equipment_id ? equipmentMap.get(selectedIncident.equipment_id) ?? null : null;
    const relatedRisks = riskHistory.filter(
      (risk) =>
        (selectedIncident.zone_id && risk.zone_id === selectedIncident.zone_id) ||
        risk.risk_category.toLowerCase().includes(selectedIncident.incident_type.replaceAll("_", " "))
    );
    const plantId = zone?.plant_id ?? null;

    return buildIncidentIntelligence({
      incident: selectedIncident,
      zone,
      equipment: asset,
      permits,
      maintenance: maintenanceItems,
      relatedRisks,
      complianceReports: plantId ? complianceReports.filter((report) => report.plant_id === plantId) : []
    });
  }, [complianceReports, equipmentMap, maintenanceItems, permits, riskHistory, selectedIncident, zoneMap]);
  const commentEntries = useMemo(
    () =>
      evidenceEntries
        .filter((entry) => readString(entry as Record<string, unknown>, "type") === "comment")
        .map((entry, index) => ({
          id: `comment-${index}`,
          author: readString(entry as Record<string, unknown>, "author") ?? "Operator",
          message: readString(entry as Record<string, unknown>, "message") ?? "No message provided.",
          created_at: readString(entry as Record<string, unknown>, "created_at")
        })),
    [evidenceEntries]
  );
  const attachmentEntries = useMemo(
    () =>
      evidenceEntries
        .filter((entry) => readString(entry as Record<string, unknown>, "type") === "attachment")
        .map((entry, index) => ({
          id: `attachment-${index}`,
          name: readString(entry as Record<string, unknown>, "name") ?? "Attachment",
          note: readString(entry as Record<string, unknown>, "note") ?? "No note provided.",
          created_at: readString(entry as Record<string, unknown>, "created_at")
        })),
    [evidenceEntries]
  );
  const escalationEntries = useMemo(
    () =>
      evidenceEntries
        .filter((entry) => readString(entry as Record<string, unknown>, "type") === "escalation")
        .map((entry, index) => ({
          id: `escalation-${index}`,
          escalated_to: readString(entry as Record<string, unknown>, "escalated_to") ?? "Duty lead",
          note: readString(entry as Record<string, unknown>, "note") ?? "No escalation note provided.",
          created_at: readString(entry as Record<string, unknown>, "created_at")
        })),
    [evidenceEntries]
  );
  const timelineItems = useMemo(() => {
    const reportItems = (reportQuery.data?.timeline ?? []).map((entry, index) => ({
      title: entry.event ?? entry.title ?? `Report event ${index + 1}`,
      timestamp: entry.timestamp,
      description: entry.detail ?? entry.description
    }));
    const commentItems = commentEntries.map((entry) => ({
      title: `Comment from ${entry.author}`,
      timestamp: entry.created_at,
      description: entry.message
    }));
    const attachmentItems = attachmentEntries.map((entry) => ({
      title: `Attachment added: ${entry.name}`,
      timestamp: entry.created_at,
      description: entry.note
    }));
    const escalationItems = escalationEntries.map((entry) => ({
      title: `Escalated to ${entry.escalated_to}`,
      timestamp: entry.created_at,
      description: entry.note
    }));
    const assignmentItems = incidentActions.map((entry) => ({
      title: entry.action.replace(`[INCIDENT:${selectedIncidentId}] `, ""),
      timestamp: entry.created_at,
      description: entry.assigned_to ? `Assigned to ${entry.assigned_to}` : entry.status
    }));

    return [...reportItems, ...commentItems, ...attachmentItems, ...escalationItems, ...assignmentItems].sort(
      (left, right) =>
        new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime()
    );
  }, [attachmentEntries, commentEntries, escalationEntries, incidentActions, reportQuery.data?.timeline, selectedIncidentId]);

  if (
    incidentsQuery.isLoading ||
    workersQuery.isLoading ||
    zonesQuery.isLoading ||
    equipmentQuery.isLoading ||
    permitsQuery.isLoading ||
    maintenanceQuery.isLoading ||
    complianceQuery.isLoading ||
    riskHistoryQuery.isLoading ||
    actionsQuery.isLoading
  ) {
    return <LoadingState rows={4} />;
  }

  if (
    incidentsQuery.isError ||
    workersQuery.isError ||
    zonesQuery.isError ||
    equipmentQuery.isError ||
    permitsQuery.isError ||
    maintenanceQuery.isError ||
    complianceQuery.isError ||
    riskHistoryQuery.isError ||
    actionsQuery.isError
  ) {
    return (
      <ErrorState
        title="Incident center unavailable"
        description="The incident workflows or AI investigation context could not be loaded."
        onRetry={() =>
          void Promise.all([
            incidentsQuery.refetch(),
            workersQuery.refetch(),
            zonesQuery.refetch(),
            equipmentQuery.refetch(),
            permitsQuery.refetch(),
            maintenanceQuery.refetch(),
            complianceQuery.refetch(),
            riskHistoryQuery.refetch(),
            actionsQuery.refetch()
          ])
        }
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Incident Investigation"
        title="Incident center"
        description="Run live investigation workflows with AI summaries, root-cause context, affected assets, likely consequences, and recommended response actions in one place."
        actions={
          <>
            <LiveIndicator active={liveMode} helper={formatLastUpdated(new Date(incidentsQuery.dataUpdatedAt))} />
            <Button variant="secondary" onClick={() => setLiveMode((current) => !current)}>
              {liveMode ? "Pause live sync" : "Resume live sync"}
            </Button>
            <Button variant="secondary" onClick={() => void incidentsQuery.refetch()} disabled={incidentsQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${incidentsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Recorded incidents" value={incidents.length} icon={ClipboardList} />
        <MetricCard title="Open incidents" value={openIncidents} icon={Siren} tone="critical" />
        <MetricCard title="Investigating" value={investigatingIncidents} icon={TimerReset} tone="warning" />
        <MetricCard title="Critical severity" value={criticalIncidents} icon={AlertTriangle} tone="critical" />
      </div>

      <EnterpriseCard title="Incident register" description="Advanced filtering, bulk assignment, and status workflows backed by the existing incidents and actions APIs.">
        <DataToolbar
          summary={`${formatNumber(filteredIncidents.length)} incidents match the active filters. ${formatNumber(selectedIds.length)} incidents are selected for command actions.`}
          actions={
            <>
              <Select value={bulkAssignee} onChange={(event) => setBulkAssignee(event.target.value)} aria-label="Choose bulk assignee">
                <option value="">Assign selected to...</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.name}>
                    {worker.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                onClick={() => bulkAssignMutation.mutate({ incidentIds: selectedIds, assignedTo: bulkAssignee })}
                disabled={!selectedIds.length || !bulkAssignee || bulkAssignMutation.isPending}
              >
                Assign selected
              </Button>
              <Button
                variant="secondary"
                onClick={() => bulkStatusMutation.mutate({ incidentIds: selectedIds, status: "investigating" })}
                disabled={!selectedIds.length || bulkStatusMutation.isPending}
              >
                Start selected
              </Button>
              <Button
                onClick={() => bulkStatusMutation.mutate({ incidentIds: selectedIds, status: "closed" })}
                disabled={!selectedIds.length || bulkStatusMutation.isPending}
              >
                Close selected
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSeverityFilter("critical");
                setStatusFilter("open");
                setTypeFilter("all");
              }}
            >
              Critical triage
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSeverityFilter("all");
                setStatusFilter("investigating");
                setTypeFilter("all");
              }}
            >
              Investigations only
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setSeverityFilter("all");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
            >
              Reset view
            </Button>
          </div>

          <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, description, root cause, or incident type"
              aria-label="Search incidents"
            />
            <Select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} aria-label="Filter incidents by severity">
              <option value="all">All severities</option>
              <option value="safe">Safe</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter incidents by status">
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="closed">Closed</option>
            </Select>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter incidents by type">
              <option value="all">All incident types</option>
              {incidentTypes.map((incidentType) => (
                <option key={incidentType} value={incidentType}>
                  {titleCase(incidentType)}
                </option>
              ))}
            </Select>
          </FilterBar>
        </DataToolbar>

        <div className="mt-5">
          {paginatedIncidents.items.length ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="w-12">
                        <Checkbox
                          checked={allVisibleSelected}
                          onChange={(event) => {
                            setSelectedIds((current) => {
                              if (event.target.checked) {
                                return [...new Set([...current, ...selectedUnreadPageIds])];
                              }

                              return current.filter((item) => !selectedUnreadPageIds.includes(item));
                            });
                          }}
                          aria-label="Select all visible incidents"
                        />
                      </TableHeaderCell>
                      <TableHeaderCell>Incident</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Severity</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Reported</TableHeaderCell>
                      <TableHeaderCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedIncidents.items.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(incident.id)}
                            onChange={(event) => {
                              setSelectedIds((current) =>
                                event.target.checked
                                  ? [...current, incident.id]
                                  : current.filter((incidentId) => incidentId !== incident.id)
                              );
                            }}
                            aria-label={`Select incident ${incident.title}`}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{incident.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {incident.ai_summary ?? incident.description}
                          </p>
                        </TableCell>
                        <TableCell>{titleCase(incident.incident_type)}</TableCell>
                        <TableCell>
                          <RiskBadge severity={incident.severity} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={incident.status} />
                        </TableCell>
                        <TableCell>{formatDateTime(incident.reported_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedIncidentId(incident.id)}>
                            Open workflow
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Pagination
                pagination={{
                  total: filteredIncidents.length,
                  skip: (paginatedIncidents.page - 1) * PAGE_SIZE,
                  limit: PAGE_SIZE
                }}
                onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage) => currentPage + 1)}
              />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No incidents match the active filters"
              description="Adjust the investigation filters or clear the current search to restore incident visibility."
            />
          )}
        </div>
      </EnterpriseCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <EnterpriseCard title="Assignment backlog" description="Open incident actions currently in the action center.">
          {incidentActionBacklog.length ? (
            <div className="space-y-3">
              {incidentActionBacklog.map((action) => (
                <div key={action.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{action.action.replace(/\[INCIDENT:[^\]]+\]\s*/, "")}</p>
                      <p className="mt-2 text-sm text-muted-foreground">Assigned to {action.assigned_to ?? "Unassigned"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(action.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={action.priority} />
                      <StatusBadge status={action.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No assignment backlog"
              description="There are currently no open incident workflow actions."
            />
          )}
        </EnterpriseCard>

        <EnterpriseCard title="Escalation watch" description="Critical and open incidents that should stay in the operator spotlight.">
          {incidents.filter((incident) => incident.severity === "critical" || incident.status !== "closed").slice(0, 6).length ? (
            <div className="space-y-3">
              {incidents
                .filter((incident) => incident.severity === "critical" || incident.status !== "closed")
                .slice(0, 6)
                .map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    className="focus-ring flex w-full items-center justify-between rounded-2xl border border-border/70 bg-background/40 p-4 text-left"
                    onClick={() => setSelectedIncidentId(incident.id)}
                  >
                    <div>
                      <p className="font-medium">{incident.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{incident.root_cause ?? incident.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <RiskBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                  </button>
                ))}
            </div>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="No escalation watch items"
              description="No open or critical incidents require additional escalation attention right now."
            />
          )}
        </EnterpriseCard>
      </div>

      <Drawer
        open={Boolean(selectedIncidentId)}
        onClose={() => setSelectedIncidentId(null)}
        title={selectedIncident?.title ?? "Incident workflow"}
        description="Timeline, assignments, comments, attachments, and escalation controls persisted through the existing incident and action APIs."
      >
        {incidentQuery.isLoading || reportQuery.isLoading ? <LoadingState rows={4} /> : null}
        {incidentQuery.isError || reportQuery.isError ? (
          <ErrorState
            title="Incident workflow unavailable"
            description="The selected incident details could not be loaded."
            onRetry={() => void Promise.all([incidentQuery.refetch(), reportQuery.refetch()])}
          />
        ) : null}
        {selectedIncident ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge severity={selectedIncident.severity} />
                    <StatusBadge status={selectedIncident.status} />
                    <StatusBadge status={titleCase(selectedIncident.incident_type)} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{selectedIncident.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      incidentUpdateMutation.mutate({
                        incidentId: selectedIncident.id,
                        payload: {
                          status: "investigating"
                        }
                      })
                    }
                    disabled={incidentUpdateMutation.isPending}
                  >
                    Start investigation
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      incidentUpdateMutation.mutate({
                        incidentId: selectedIncident.id,
                        payload: {
                          status: "closed",
                          closed_at: new Date().toISOString()
                        }
                      })
                    }
                    disabled={incidentUpdateMutation.isPending}
                  >
                    Close incident
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">Reported</p>
                  <p className="mt-2 font-medium">{formatDateTime(selectedIncident.reported_at)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">Root cause</p>
                  <p className="mt-2 font-medium">{selectedIncident.root_cause ?? "Pending investigation"}</p>
                </div>
              </div>
            </div>

            {selectedIncidentIntelligence ? (
              <EnterpriseCard
                title="AI investigation brief"
                description="Explain the incident in safety-officer language using live related risks, permits, maintenance, and compliance posture."
              >
                <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                  <p className="text-sm font-medium text-primary">AI summary</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedIncidentIntelligence.summary}</p>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <p className="text-sm font-medium">Affected assets</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedIncidentIntelligence.affectedAssets.length ? (
                        selectedIncidentIntelligence.affectedAssets.map((asset, index) => (
                          <StatusBadge key={`${asset}-${index}`} status={asset} />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No affected assets were derived for this incident.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <p className="text-sm font-medium">Regulatory references</p>
                    <div className="mt-3 space-y-2">
                      {selectedIncidentIntelligence.regulatoryContext.length ? (
                        selectedIncidentIntelligence.regulatoryContext.map((item, index) => (
                          <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                            {item}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No regulatory context was available from the linked compliance reports.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <EnterpriseCard title="Risk contributors" contentClassName="pt-5">
                    <IntelligenceContributors
                      items={selectedIncidentIntelligence.contributors}
                      emptyDescription="No AI contributors were derived for this incident."
                    />
                  </EnterpriseCard>
                  <EnterpriseCard title="Likely consequences" contentClassName="pt-5">
                    {selectedIncidentIntelligence.likelyConsequences.length ? (
                      <div className="space-y-2">
                        {selectedIncidentIntelligence.likelyConsequences.map((item, index) => (
                          <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No likely consequence narrative was derived for this incident.</p>
                    )}
                  </EnterpriseCard>
                </div>

                <EnterpriseCard title="Evidence used" contentClassName="pt-5">
                  {selectedIncidentIntelligence.evidenceUsed.length ? (
                    <div className="space-y-2">
                      {selectedIncidentIntelligence.evidenceUsed.map((item, index) => (
                        <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No explicit evidence lines were derived for this incident.</p>
                  )}
                </EnterpriseCard>

                <EnterpriseCard title="Recommended response" contentClassName="pt-5">
                  {selectedIncidentIntelligence.recommendedResponse.length ? (
                    <div className="space-y-2">
                      {selectedIncidentIntelligence.recommendedResponse.map((item, index) => (
                        <div key={`${item}-${index}`} className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recommended response actions were derived for this incident.</p>
                  )}
                </EnterpriseCard>
              </EnterpriseCard>
            ) : null}

            <EnterpriseCard title="Investigation timeline">
              {timelineItems.length ? (
                <Timeline items={timelineItems} />
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="No workflow timeline"
                  description="This incident does not yet have timeline events, comments, or actions."
                />
              )}
            </EnterpriseCard>

            <EnterpriseCard title="Assignment workflow" description="Create or review investigation tasks in the action center.">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Select value={assignmentOwner} onChange={(event) => setAssignmentOwner(event.target.value)} aria-label="Select incident assignee">
                  <option value="">Assign to worker...</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.name}>
                      {worker.name}
                    </option>
                  ))}
                </Select>
                <Select value={assignmentPriority} onChange={(event) => setAssignmentPriority(event.target.value)} aria-label="Select assignment priority">
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                  <option value="critical">Critical priority</option>
                </Select>
              </div>
              <Textarea
                className="mt-3"
                value={assignmentNote}
                onChange={(event) => setAssignmentNote(event.target.value)}
                placeholder="Add assignment context for the investigator"
              />
              <div className="mt-3">
                <Button
                  onClick={async () => {
                    if (!assignmentOwner) {
                      notify({
                        title: "Select an assignee",
                        description: "Choose a worker before creating an assignment.",
                        tone: "warning"
                      });
                      return;
                    }

                    await actionMutation.mutateAsync({
                      action: `[INCIDENT:${selectedIncident.id}] Investigate incident ${selectedIncident.title}${assignmentNote ? ` - ${assignmentNote}` : ""}`,
                      assigned_to: assignmentOwner,
                      priority: assignmentPriority as "low" | "medium" | "high" | "critical",
                      status: "open"
                    });

                    await incidentUpdateMutation.mutateAsync({
                      incidentId: selectedIncident.id,
                      payload: {
                        status: "investigating",
                        evidence: appendEvidenceEntry(selectedIncident, {
                          type: "assignment",
                          assigned_to: assignmentOwner,
                          note: assignmentNote || "Assignment created from the incident workflow.",
                          created_at: new Date().toISOString()
                        })
                      }
                    });

                    setAssignmentNote("");
                    notify({
                      title: "Assignment created",
                      description: `${assignmentOwner} has been assigned to investigate this incident.`,
                      tone: "success"
                    });
                  }}
                  disabled={actionMutation.isPending || incidentUpdateMutation.isPending}
                >
                  Create assignment
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                {incidentActions.length ? (
                  incidentActions.map((action) => (
                    <div key={action.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{action.action.replace(/\[INCIDENT:[^\]]+\]\s*/, "")}</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Assigned to {action.assigned_to ?? "Unassigned"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(action.created_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <StatusBadge status={action.priority} />
                          <StatusBadge status={action.status} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No assignments yet"
                    description="Create an assignment to start the investigation workflow."
                  />
                )}
              </div>
            </EnterpriseCard>

            <div className="grid gap-5 xl:grid-cols-2">
              <EnterpriseCard title="Comments" description="Add structured investigation notes to the incident evidence trail.">
                <Input
                  value={commentAuthor}
                  onChange={(event) => setCommentAuthor(event.target.value)}
                  placeholder="Comment author"
                />
                <Textarea
                  className="mt-3"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="Add an investigation update, field note, or responder comment"
                />
                <div className="mt-3">
                  <Button
                    onClick={async () => {
                      if (!commentDraft.trim()) {
                        return;
                      }

                      await incidentUpdateMutation.mutateAsync({
                        incidentId: selectedIncident.id,
                        payload: {
                          evidence: appendEvidenceEntry(selectedIncident, {
                            type: "comment",
                            author: commentAuthor || "Operations Desk",
                            message: commentDraft.trim(),
                            created_at: new Date().toISOString()
                          })
                        }
                      });

                      setCommentDraft("");
                      notify({
                        title: "Comment saved",
                        description: "The investigation note was added to the incident evidence trail.",
                        tone: "success"
                      });
                    }}
                    disabled={incidentUpdateMutation.isPending}
                  >
                    Add comment
                  </Button>
                </div>
                <div className="mt-5 space-y-3">
                  {commentEntries.length ? (
                    commentEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{entry.author}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{entry.message}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={ClipboardList}
                      title="No comments yet"
                      description="Add investigation notes to preserve operator context."
                    />
                  )}
                </div>
              </EnterpriseCard>

              <EnterpriseCard title="Attachments" description="Track file handoffs or evidence package references inside the investigation trail.">
                <Input
                  value={attachmentName}
                  onChange={(event) => setAttachmentName(event.target.value)}
                  placeholder="Attachment name or reference"
                />
                <Textarea
                  className="mt-3"
                  value={attachmentNote}
                  onChange={(event) => setAttachmentNote(event.target.value)}
                  placeholder="Describe the attachment or evidence package"
                />
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!attachmentName.trim()) {
                        return;
                      }

                      await incidentUpdateMutation.mutateAsync({
                        incidentId: selectedIncident.id,
                        payload: {
                          evidence: appendEvidenceEntry(selectedIncident, {
                            type: "attachment",
                            name: attachmentName.trim(),
                            note: attachmentNote.trim() || "Evidence reference added from the incident workflow.",
                            created_at: new Date().toISOString()
                          })
                        }
                      });

                      setAttachmentName("");
                      setAttachmentNote("");
                      notify({
                        title: "Attachment reference saved",
                        description: "The incident evidence reference was appended successfully.",
                        tone: "success"
                      });
                    }}
                    disabled={incidentUpdateMutation.isPending}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Add attachment reference
                  </Button>
                </div>
                <div className="mt-5 space-y-3">
                  {attachmentEntries.length ? (
                    attachmentEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={UploadCloud}
                      title="No attachment references"
                      description="Use attachment references to keep the investigation evidence trail complete."
                    />
                  )}
                </div>
              </EnterpriseCard>
            </div>

            <EnterpriseCard title="Escalation workflow" description="Record and assign escalations while keeping the incident and action streams synchronized.">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Select value={escalationOwner} onChange={(event) => setEscalationOwner(event.target.value)} aria-label="Select escalation owner">
                  <option value="">Escalate to...</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.name}>
                      {worker.name}
                    </option>
                  ))}
                </Select>
                <Textarea
                  value={escalationNote}
                  onChange={(event) => setEscalationNote(event.target.value)}
                  placeholder="Why does this incident need escalation?"
                />
              </div>
              <div className="mt-3">
                <Button
                  onClick={async () => {
                    if (!escalationOwner) {
                      notify({
                        title: "Select an escalation owner",
                        description: "Choose who should receive the escalation.",
                        tone: "warning"
                      });
                      return;
                    }

                    const now = new Date().toISOString();

                    await actionMutation.mutateAsync({
                      action: `[INCIDENT:${selectedIncident.id}] Escalate incident ${selectedIncident.title}${escalationNote ? ` - ${escalationNote}` : ""}`,
                      assigned_to: escalationOwner,
                      priority: "critical",
                      status: "open"
                    });

                    await incidentUpdateMutation.mutateAsync({
                      incidentId: selectedIncident.id,
                      payload: {
                        status: "investigating",
                        evidence: appendEvidenceEntry(selectedIncident, {
                          type: "escalation",
                          escalated_to: escalationOwner,
                          note: escalationNote || "Escalation triggered from the incident workflow.",
                          created_at: now
                        })
                      }
                    });

                    setEscalationNote("");
                    notify({
                      title: "Escalation created",
                      description: `The incident was escalated to ${escalationOwner}.`,
                      tone: "success"
                    });
                  }}
                  disabled={actionMutation.isPending || incidentUpdateMutation.isPending}
                >
                  Escalate incident
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                {escalationEntries.length ? (
                  escalationEntries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{entry.escalated_to}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Siren}
                    title="No escalations yet"
                    description="Escalate the incident when response ownership needs to widen."
                  />
                )}
              </div>
            </EnterpriseCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
