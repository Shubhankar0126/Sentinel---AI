"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Cpu, RefreshCw, SearchX, Wrench } from "lucide-react";

import { DataToolbar } from "@/components/common/data-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { LiveIndicator } from "@/components/common/live-indicator";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { ScoreBar } from "@/components/common/score-bar";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSavedState } from "@/hooks/use-saved-state";
import { formatLastUpdated, getLiveRefetchInterval, liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { entitiesService } from "@/services/entities-service";
import { paginateItems } from "@/utils/collections";
import { formatDateTime, formatNumber } from "@/utils/format";

const PAGE_SIZE = 8;

export default function EquipmentPage() {
  const [liveMode, setLiveMode] = useSavedState("sentinel-equipment-live", true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("health-asc");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.assets)
  });
  const healthQuery = useQuery({
    queryKey: selectedId ? queryKeys.equipment.health(selectedId) : [...queryKeys.equipment.all, "health"],
    queryFn: () => entitiesService.getEquipmentHealth(selectedId as string),
    enabled: Boolean(selectedId),
    refetchInterval: getLiveRefetchInterval(liveMode && Boolean(selectedId), liveIntervals.assets)
  });

  const equipment = equipmentQuery.data?.items ?? [];

  const filteredEquipment = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();
    const baseItems = equipment.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const haystack = [
        item.equipment_name,
        item.equipment_type,
        item.manufacturer,
        item.external_id,
        item.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });

    return [...baseItems].sort((left, right) => {
      switch (sortBy) {
        case "health-desc":
          return right.health_score - left.health_score;
        case "name-asc":
          return left.equipment_name.localeCompare(right.equipment_name);
        case "name-desc":
          return right.equipment_name.localeCompare(left.equipment_name);
        case "maintenance":
          return (left.next_maintenance ?? "").localeCompare(right.next_maintenance ?? "");
        case "health-asc":
        default:
          return left.health_score - right.health_score;
      }
    });
  }, [debouncedSearch, equipment, sortBy, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, statusFilter]);

  const paginatedEquipment = paginateItems(filteredEquipment, page, PAGE_SIZE);

  const averageHealth = equipment.length
    ? equipment.reduce((sum, item) => sum + item.health_score, 0) / equipment.length
    : 0;
  const criticalAssets = equipment.filter((item) => item.status === "critical" || item.health_score < 50).length;
  const offlineAssets = equipment.filter((item) => item.status === "offline").length;
  const maintenanceDueSoon = equipment.filter((item) => {
    if (!item.next_maintenance) {
      return false;
    }

    const daysUntilMaintenance =
      (new Date(item.next_maintenance).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilMaintenance >= 0 && daysUntilMaintenance <= 14;
  }).length;

  if (equipmentQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (equipmentQuery.isError) {
    return (
      <ErrorState
        title="Equipment view unavailable"
        description="Equipment data could not be loaded."
        onRetry={() => void equipmentQuery.refetch()}
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Asset Reliability"
        title="Equipment"
        description="Monitor asset health, filter the fleet by operating condition, and drill into reliability projections for each asset."
        actions={
          <>
            <LiveIndicator active={liveMode} helper={formatLastUpdated(new Date(equipmentQuery.dataUpdatedAt))} />
            <Button variant="secondary" onClick={() => setLiveMode((current) => !current)}>
              {liveMode ? "Pause live sync" : "Resume live sync"}
            </Button>
            <Button variant="secondary" onClick={() => void equipmentQuery.refetch()} disabled={equipmentQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${equipmentQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Connected assets" value={equipment.length} icon={Cpu} />
        <MetricCard
          title="Average health"
          value={averageHealth}
          icon={Activity}
          tone="success"
          format="percent"
        />
        <MetricCard title="Critical assets" value={criticalAssets} icon={AlertTriangle} tone="critical" />
        <MetricCard title="Due in 14 days" value={maintenanceDueSoon} icon={Wrench} tone="warning" />
      </div>

      <EnterpriseCard
        title="Equipment register"
        description="Search, sort, and review the live equipment inventory."
      >
        <DataToolbar
          summary={`${formatNumber(filteredEquipment.length)} assets shown across ${formatNumber(equipment.length)} connected records.`}
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setSortBy("health-asc");
              }}
            >
              Reset filters
            </Button>
          }
        >
          <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search equipment, type, manufacturer, or external ID"
              aria-label="Search equipment"
            />
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter equipment by status">
              <option value="all">All statuses</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </Select>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort equipment">
              <option value="health-asc">Health low to high</option>
              <option value="health-desc">Health high to low</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="maintenance">Next maintenance</option>
            </Select>
          </FilterBar>
        </DataToolbar>

        <div className="mt-5">
          {paginatedEquipment.items.length ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Equipment</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Health</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Next maintenance</TableHeaderCell>
                      <TableHeaderCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedEquipment.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.equipment_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.manufacturer ?? "Unknown manufacturer"}
                          </p>
                        </TableCell>
                        <TableCell>{item.equipment_type}</TableCell>
                        <TableCell>{item.health_score.toFixed(1)}%</TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                        <TableCell>{formatDateTime(item.next_maintenance)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedId(item.id)}>
                            View health
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Pagination
                pagination={{
                  total: filteredEquipment.length,
                  skip: (paginatedEquipment.page - 1) * PAGE_SIZE,
                  limit: PAGE_SIZE
                }}
                onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage) => currentPage + 1)}
              />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No equipment matches the current filters"
              description="Try clearing the search or selecting a broader status filter to restore the equipment register."
            />
          )}
        </div>
      </EnterpriseCard>

      <Drawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title="Equipment health view"
        description="Reliability detail for the selected asset."
      >
        {healthQuery.isLoading ? <LoadingState rows={3} /> : null}
        {healthQuery.isError ? (
          <ErrorState
            title="Equipment detail unavailable"
            description="The selected asset health view could not be loaded."
            onRetry={() => void healthQuery.refetch()}
          />
        ) : null}
        {healthQuery.data ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Equipment</p>
              <p className="mt-2 text-xl font-semibold">{healthQuery.data.equipment_name}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Last maintenance: {formatDateTime(healthQuery.data.last_maintenance)}
              </p>
            </div>
            <ScoreBar
              label="Health score"
              value={healthQuery.data.health_score}
              helper="Current operating readiness based on the live health projection."
              tone={healthQuery.data.health_score >= 80 ? "success" : healthQuery.data.health_score >= 60 ? "warning" : "critical"}
            />
            <ScoreBar
              label="Predicted failure risk"
              value={healthQuery.data.predicted_failure_risk * 100}
              helper="Probability-oriented signal from the reliability model."
              tone={healthQuery.data.predicted_failure_risk >= 0.7 ? "critical" : healthQuery.data.predicted_failure_risk >= 0.4 ? "warning" : "primary"}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-3">
                  <StatusBadge status={healthQuery.data.status} />
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">Next maintenance</p>
                <p className="mt-3 text-sm font-medium">{formatDateTime(healthQuery.data.next_maintenance)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
