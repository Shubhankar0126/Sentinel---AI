"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, RefreshCw, SearchX, Settings2, Siren, Sparkles } from "lucide-react";

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
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSavedState } from "@/hooks/use-saved-state";
import { formatLastUpdated, getLiveRefetchInterval, liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { useNotifications } from "@/providers/notification-provider";
import { entitiesService } from "@/services/entities-service";
import { notificationService } from "@/services/notification-service";
import { riskService } from "@/services/risk-service";
import type { NotificationRead } from "@/types/domain";
import { paginateItems } from "@/utils/collections";
import { formatDateTime, formatNumber } from "@/utils/format";
import { buildNotificationNarrative, buildZoneHotspots } from "@/utils/intelligence";

const PAGE_SIZE = 10;
const NOTIFICATIONS_FETCH_LIMIT = 100;

type NotificationListResult = Awaited<ReturnType<typeof notificationService.list>>;

function markNotificationsReadInList(
  listResult: NotificationListResult | undefined,
  notificationIds: string[]
) {
  if (!listResult) {
    return listResult;
  }

  return {
    ...listResult,
    items: listResult.items.map((item) =>
      notificationIds.includes(item.id)
        ? {
            ...item,
            read: true
          }
        : item
    )
  };
}

function removeUnreadNotifications(unread: NotificationRead[] | undefined, notificationIds: string[]) {
  if (!unread) {
    return unread;
  }

  return unread.filter((item) => !notificationIds.includes(item.id));
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [search, setSearch] = useSavedState("sentinel-notifications-search", "");
  const [typeFilter, setTypeFilter] = useSavedState("sentinel-notifications-type", "all");
  const [stateFilter, setStateFilter] = useSavedState("sentinel-notifications-state", "all");
  const [liveMode, setLiveMode] = useSavedState("sentinel-notifications-live", true);
  const [criticalInboxMode, setCriticalInboxMode] = useSavedState("sentinel-notifications-critical-inbox", false);
  const [compactRows, setCompactRows] = useSavedState("sentinel-notifications-compact", false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationService.list({ skip: 0, limit: NOTIFICATIONS_FETCH_LIMIT }),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.notifications)
  });
  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => notificationService.listUnread(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.notifications)
  });
  const liveRisksQuery = useQuery({
    queryKey: queryKeys.risk.live,
    queryFn: () => riskService.getLive(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.notifications)
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

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.update(notificationId, { read: true }),
    onMutate: async (notificationId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.unread })
      ]);

      const previousList = queryClient.getQueryData<NotificationListResult>(queryKeys.notifications.all);
      const previousUnread = queryClient.getQueryData<NotificationRead[]>(queryKeys.notifications.unread);

      queryClient.setQueryData<NotificationListResult>(
        queryKeys.notifications.all,
        markNotificationsReadInList(previousList, [notificationId])
      );
      queryClient.setQueryData<NotificationRead[]>(
        queryKeys.notifications.unread,
        removeUnreadNotifications(previousUnread, [notificationId])
      );

      return { previousList, previousUnread };
    },
    onSuccess: () => {
      notify({
        title: "Notification updated",
        description: "The selected notification was marked as read.",
        tone: "success"
      });
    },
    onError: (error, _notificationId, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.notifications.all, context.previousList);
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(queryKeys.notifications.unread, context.previousUnread);
      }

      notify({
        title: "Notification update failed",
        description: error instanceof Error ? error.message : "The notification could not be updated.",
        tone: "critical"
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread })
      ]);
    }
  });

  const markManyReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      await Promise.all(notificationIds.map((notificationId) => notificationService.update(notificationId, { read: true })));
      return notificationIds;
    },
    onMutate: async (notificationIds) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.unread })
      ]);

      const previousList = queryClient.getQueryData<NotificationListResult>(queryKeys.notifications.all);
      const previousUnread = queryClient.getQueryData<NotificationRead[]>(queryKeys.notifications.unread);

      queryClient.setQueryData<NotificationListResult>(
        queryKeys.notifications.all,
        markNotificationsReadInList(previousList, notificationIds)
      );
      queryClient.setQueryData<NotificationRead[]>(
        queryKeys.notifications.unread,
        removeUnreadNotifications(previousUnread, notificationIds)
      );

      return { previousList, previousUnread };
    },
    onSuccess: (notificationIds) => {
      setSelectedIds((current) => current.filter((item) => !notificationIds.includes(item)));
      notify({
        title: "Notifications updated",
        description: `${notificationIds.length} notifications were marked as read.`,
        tone: "success"
      });
    },
    onError: (error, _notificationIds, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.notifications.all, context.previousList);
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(queryKeys.notifications.unread, context.previousUnread);
      }

      notify({
        title: "Bulk update failed",
        description: error instanceof Error ? error.message : "The notifications could not be updated.",
        tone: "critical"
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread })
      ]);
    }
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadNotifications = unreadQuery.data ?? [];
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

  const notificationNarratives = useMemo(
    () =>
      new Map(
        notifications.map((item) => [
          item.id,
          buildNotificationNarrative(item, hotspots, liveRisksQuery.data ?? [])
        ])
      ),
    [hotspots, liveRisksQuery.data, notifications]
  );

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesReadState = stateFilter === "all" || (stateFilter === "read" ? item.read : !item.read);
      const narrative = notificationNarratives.get(item.id);
      const haystack = [item.title, item.message, item.type, item.priority, narrative?.summary, narrative?.recommendedAction]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesType && matchesReadState && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [debouncedSearch, notificationNarratives, notifications, stateFilter, typeFilter]);

  const inboxNotifications = useMemo(() => {
    if (!criticalInboxMode) {
      return unreadNotifications;
    }

    return unreadNotifications.filter((item) => item.priority === "critical" || item.priority === "high");
  }, [criticalInboxMode, unreadNotifications]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, typeFilter]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((item) => filteredNotifications.some((notification) => notification.id === item)));
  }, [filteredNotifications]);

  const paginatedNotifications = paginateItems(filteredNotifications, page, PAGE_SIZE);
  const criticalCount = notifications.filter((item) => item.priority === "critical").length;
  const readCount = notifications.filter((item) => item.read).length;
  const selectedUnreadIds = selectedIds.filter((notificationId) => {
    const notification = notifications.find((item) => item.id === notificationId);
    return notification && !notification.read;
  });
  const pageIds = paginatedNotifications.items.map((item) => item.id);
  const allVisibleSelected = pageIds.length > 0 && pageIds.every((item) => selectedIds.includes(item));
  const topNarrative = inboxNotifications[0] ? notificationNarratives.get(inboxNotifications[0].id) ?? null : null;

  if (
    notificationsQuery.isLoading ||
    unreadQuery.isLoading ||
    liveRisksQuery.isLoading ||
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
    notificationsQuery.isError ||
    unreadQuery.isError ||
    liveRisksQuery.isError ||
    plantsQuery.isError ||
    zonesQuery.isError ||
    permitsQuery.isError ||
    maintenanceQuery.isError ||
    equipmentQuery.isError ||
    incidentsQuery.isError
  ) {
    return (
      <ErrorState
        title="Notifications unavailable"
        description="Notification data or its live AI context could not be loaded."
        onRetry={() =>
          void Promise.all([
            notificationsQuery.refetch(),
            unreadQuery.refetch(),
            liveRisksQuery.refetch(),
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
        eyebrow="Alerting"
        title="Notifications"
        description="Turn raw alerts into intelligent compound-risk notifications by correlating the live feed with overlapping permits, maintenance pressure, unresolved incidents, and current hotspot zones."
        actions={
          <>
            <LiveIndicator
              active={liveMode}
              helper={formatLastUpdated(
                new Date(
                  Math.max(
                    notificationsQuery.dataUpdatedAt,
                    unreadQuery.dataUpdatedAt,
                    liveRisksQuery.dataUpdatedAt,
                    permitsQuery.dataUpdatedAt,
                    maintenanceQuery.dataUpdatedAt
                  )
                )
              )}
            />
            <Button variant="secondary" onClick={() => setLiveMode((current) => !current)}>
              {liveMode ? "Pause live sync" : "Resume live sync"}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void Promise.all([
                  notificationsQuery.refetch(),
                  unreadQuery.refetch(),
                  liveRisksQuery.refetch(),
                  plantsQuery.refetch(),
                  zonesQuery.refetch(),
                  permitsQuery.refetch(),
                  maintenanceQuery.refetch(),
                  equipmentQuery.refetch(),
                  incidentsQuery.refetch()
                ])
              }
              disabled={
                notificationsQuery.isFetching ||
                unreadQuery.isFetching ||
                liveRisksQuery.isFetching ||
                plantsQuery.isFetching ||
                zonesQuery.isFetching ||
                permitsQuery.isFetching ||
                maintenanceQuery.isFetching ||
                equipmentQuery.isFetching ||
                incidentsQuery.isFetching
              }
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  notificationsQuery.isFetching ||
                  unreadQuery.isFetching ||
                  liveRisksQuery.isFetching ||
                  plantsQuery.isFetching ||
                  zonesQuery.isFetching ||
                  permitsQuery.isFetching ||
                  maintenanceQuery.isFetching ||
                  equipmentQuery.isFetching ||
                  incidentsQuery.isFetching
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total notifications" value={notifications.length} icon={Bell} />
        <MetricCard title="Unread" value={unreadNotifications.length} icon={BellRing} tone="warning" />
        <MetricCard title="Critical priority" value={criticalCount} icon={Siren} tone="critical" />
        <MetricCard title="Read" value={readCount} icon={CheckCheck} tone="success" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.72fr_1.28fr]">
        <div className="panel-grid">
          <EnterpriseCard title="AI alert synthesis" description="Summarize the strongest compound-risk story driving the current notification queue.">
            {topNarrative ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="font-medium text-primary">AI correlated alert</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{topNarrative.summary}</p>
                  <p className="mt-4 text-sm font-medium text-foreground">Recommended action</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{topNarrative.recommendedAction}</p>
                </div>
                <IntelligenceContributors
                  items={topNarrative.contributors}
                  emptyDescription="The top notification does not yet have additional AI contributors."
                />
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No synthesized alert available"
                description="Unread notifications are currently clear, so there is no AI alert synthesis to display."
              />
            )}
          </EnterpriseCard>

          <EnterpriseCard title="Unread queue" description="Immediate action items still unread for the current operator.">
            {inboxNotifications.length ? (
              <div className="space-y-3">
                {inboxNotifications.slice(0, 6).map((item) => {
                  const narrative = notificationNarratives.get(item.id);

                  return (
                    <div key={item.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.title}</p>
                            {!item.read ? <StatusBadge status="unread" /> : null}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>
                          {narrative ? (
                            <>
                              <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
                                {narrative.summary}
                              </div>
                              <p className="mt-3 text-sm font-medium text-foreground">Recommended action</p>
                              <p className="mt-1 text-sm text-muted-foreground">{narrative.recommendedAction}</p>
                            </>
                          ) : null}
                          <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                        </div>
                        <div className="space-y-2 text-right">
                          <StatusBadge status={item.priority} />
                          <div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => markReadMutation.mutate(item.id)}
                              disabled={markReadMutation.isPending || markManyReadMutation.isPending}
                            >
                              Mark read
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CheckCheck}
                title="No unread notifications"
                description="The unread notification queue is currently clear."
              />
            )}
          </EnterpriseCard>

          <EnterpriseCard title="Operator preferences" description="Local view preferences for this workstation.">
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
                <div>
                  <p className="font-medium">Live updates</p>
                  <p className="text-sm text-muted-foreground">Auto-refresh unread and historical notifications.</p>
                </div>
                <Checkbox checked={liveMode} onChange={(event) => setLiveMode(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
                <div>
                  <p className="font-medium">Priority inbox</p>
                  <p className="text-sm text-muted-foreground">Only show high and critical items in the unread queue.</p>
                </div>
                <Checkbox checked={criticalInboxMode} onChange={(event) => setCriticalInboxMode(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
                <div>
                  <p className="font-medium">Compact rows</p>
                  <p className="text-sm text-muted-foreground">Use a denser row layout for large alert volumes.</p>
                </div>
                <Checkbox checked={compactRows} onChange={(event) => setCompactRows(event.target.checked)} />
              </label>
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                Filters and preferences persist automatically for this signed-in operator on this browser.
              </div>
            </div>
          </EnterpriseCard>
        </div>

        <EnterpriseCard title="Notification history" description="Search, bulk-manage, and monitor the broader notification feed with AI-generated context alongside each alert.">
          <DataToolbar
            summary={`${formatNumber(filteredNotifications.length)} notifications match the active filters. ${formatNumber(selectedUnreadIds.length)} unread rows are selected for bulk action.`}
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                    setStateFilter("all");
                  }}
                >
                  Reset filters
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => markManyReadMutation.mutate(selectedUnreadIds)}
                  disabled={!selectedUnreadIds.length || markManyReadMutation.isPending}
                >
                  Mark selected read
                </Button>
                <Button
                  onClick={() => markManyReadMutation.mutate(unreadNotifications.map((item) => item.id))}
                  disabled={!unreadNotifications.length || markManyReadMutation.isPending}
                >
                  Mark all read
                </Button>
              </>
            }
          >
            <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <SearchBar
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notification title, message, type, or priority"
                aria-label="Search notifications"
              />
              <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter notifications by type">
                <option value="all">All types</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </Select>
              <Select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} aria-label="Filter notifications by read state">
                <option value="all">All states</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </Select>
            </FilterBar>
          </DataToolbar>

          <div className="mt-5">
            {paginatedNotifications.items.length ? (
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
                                  return [...new Set([...current, ...pageIds])];
                                }

                                return current.filter((item) => !pageIds.includes(item));
                              });
                            }}
                            aria-label="Select all visible notifications"
                          />
                        </TableHeaderCell>
                        <TableHeaderCell>Title</TableHeaderCell>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Priority</TableHeaderCell>
                        <TableHeaderCell>Created</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedNotifications.items.map((item) => {
                        const narrative = notificationNarratives.get(item.id);

                        return (
                          <TableRow
                            key={item.id}
                            className={item.read ? "" : "bg-primary/5"}
                          >
                            <TableCell className={compactRows ? "py-2" : undefined}>
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onChange={(event) => {
                                  setSelectedIds((current) =>
                                    event.target.checked
                                      ? [...current, item.id]
                                      : current.filter((notificationId) => notificationId !== item.id)
                                  );
                                }}
                                aria-label={`Select notification ${item.title}`}
                              />
                            </TableCell>
                            <TableCell className={compactRows ? "py-2" : undefined}>
                              <p className="font-medium">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                              {narrative ? (
                                <p className="mt-2 line-clamp-2 text-xs text-primary/85">{narrative.summary}</p>
                              ) : null}
                            </TableCell>
                            <TableCell className={compactRows ? "py-2" : undefined}>
                              <StatusBadge status={item.type} />
                            </TableCell>
                            <TableCell className={compactRows ? "py-2" : undefined}>
                              <StatusBadge status={item.priority} />
                            </TableCell>
                            <TableCell className={compactRows ? "py-2" : undefined}>{formatDateTime(item.created_at)}</TableCell>
                            <TableCell className={compactRows ? "py-2" : undefined}>
                              <StatusBadge status={item.read ? "read" : "unread"} />
                            </TableCell>
                            <TableCell className={`text-right ${compactRows ? "py-2" : ""}`}>
                              {!item.read ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => markReadMutation.mutate(item.id)}
                                  disabled={markReadMutation.isPending || markManyReadMutation.isPending}
                                >
                                  Mark read
                                </Button>
                              ) : (
                                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                                  <Settings2 className="h-3.5 w-3.5" />
                                  Synced
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Pagination
                  pagination={{
                    total: filteredNotifications.length,
                    skip: (paginatedNotifications.page - 1) * PAGE_SIZE,
                    limit: PAGE_SIZE
                  }}
                  onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  onNext={() => setPage((currentPage) => currentPage + 1)}
                />
              </>
            ) : (
              <EmptyState
                icon={SearchX}
                title="No notifications match the active filters"
                description="Clear the notification search or broaden the type and state filters to restore the feed."
              />
            )}
          </div>
        </EnterpriseCard>
      </div>
    </div>
  );
}
