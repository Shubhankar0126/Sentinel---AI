"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCheck, SearchX } from "lucide-react";

import { DataToolbar } from "@/components/common/data-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { LiveIndicator } from "@/components/common/live-indicator";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { VirtualizedList } from "@/components/common/virtualized-list";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { useNotifications } from "@/providers/notification-provider";
import { notificationService } from "@/services/notification-service";
import { formatDateTime } from "@/utils/format";

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const notificationsQuery = useQuery({
    queryKey: [...queryKeys.notifications.all, "drawer"],
    queryFn: () => notificationService.list({ skip: 0, limit: 10 }),
    enabled: open,
    refetchInterval: open ? liveIntervals.notificationDrawer : false
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.update(notificationId, { read: true }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      ]);
    },
    onError: (error) => {
      notify({
        title: "Notification update failed",
        description: error instanceof Error ? error.message : "The notification could not be updated.",
        tone: "critical"
      });
    }
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const filteredNotifications = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesFilter = filter === "all" || (filter === "unread" ? !item.read : item.type === filter);
      const haystack = [item.title, item.message, item.type, item.priority].join(" ").toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [filter, notifications, search]);

  const handleMarkAllRead = async () => {
    const unreadNotifications = filteredNotifications.filter((item) => !item.read);
    await Promise.all(unreadNotifications.map((item) => markReadMutation.mutateAsync(item.id)));
    notify({
      title: "Notifications synchronized",
      description: `${unreadNotifications.length} notifications marked as read.`,
      tone: "success"
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Notification center"
      description="Monitor unread alerts, operational escalations, and workflow updates."
    >
      <div className="space-y-3">
        <DataToolbar
          summary={`${filteredNotifications.length} notifications match the current drawer filters.`}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleMarkAllRead()}
              disabled={!filteredNotifications.some((item) => !item.read) || markReadMutation.isPending}
            >
              Mark all read
            </Button>
          }
        >
          <LiveIndicator active={open} helper="Live drawer refresh enabled while open." />
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search alerts"
              aria-label="Search notifications in drawer"
            />
            <Select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter drawer notifications">
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
        </DataToolbar>
        {filteredNotifications.length ? (
          <VirtualizedList
            items={filteredNotifications}
            itemHeight={128}
            height={Math.min(filteredNotifications.length, 4) * 128}
            renderItem={(item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <StatusBadge status={item.type} />
                      <StatusBadge status={item.priority} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                  </div>
                  {!item.read ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markReadMutation.mutate(item.id)}
                      disabled={markReadMutation.isPending}
                    >
                      <CheckCheck className="h-4 w-4" />
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          />
        ) : (
          <EmptyState
            icon={search || filter !== "all" ? SearchX : BellRing}
            title={search || filter !== "all" ? "No matching notifications" : "No notifications"}
            description={
              search || filter !== "all"
                ? "Try clearing the search or broadening the filter."
                : "Unread alerts and workflow events will appear here as they are raised across live operations."
            }
          />
        )}
      </div>
    </Drawer>
  );
}
