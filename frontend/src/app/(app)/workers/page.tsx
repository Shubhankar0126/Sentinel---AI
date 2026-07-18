"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, MapPin, RefreshCw, SearchX, ShieldCheck, Users } from "lucide-react";

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

export default function WorkersPage() {
  const [liveMode, setLiveMode] = useSavedState("sentinel-workers-live", true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const workersQuery = useQuery({
    queryKey: queryKeys.workers.all,
    queryFn: () => entitiesService.listWorkers(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.assets)
  });
  const safetyQuery = useQuery({
    queryKey: selectedId ? queryKeys.workers.safety(selectedId) : [...queryKeys.workers.all, "safety"],
    queryFn: () => entitiesService.getWorkerSafety(selectedId as string),
    enabled: Boolean(selectedId),
    refetchInterval: getLiveRefetchInterval(liveMode && Boolean(selectedId), liveIntervals.assets)
  });

  const workers = workersQuery.data?.items ?? [];

  const departments = useMemo(
    () => [...new Set(workers.map((worker) => worker.department).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [workers]
  );

  const filteredWorkers = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return workers.filter((worker) => {
      const matchesDepartment = departmentFilter === "all" || worker.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || worker.status === statusFilter;
      const haystack = [worker.name, worker.department, worker.designation, worker.worker_code]
        .join(" ")
        .toLowerCase();

      return matchesDepartment && matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [debouncedSearch, departmentFilter, statusFilter, workers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentFilter, statusFilter]);

  const paginatedWorkers = paginateItems(filteredWorkers, page, PAGE_SIZE);
  const activeWorkers = workers.filter((worker) => worker.status === "active").length;

  if (workersQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (workersQuery.isError) {
    return (
      <ErrorState
        title="Worker view unavailable"
        description="Worker data could not be loaded."
        onRetry={() => void workersQuery.refetch()}
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Workforce Safety"
        title="Workers"
        description="Review the current workforce, isolate crews by department, and drill into worker safety posture for operational context."
        actions={
          <>
            <LiveIndicator active={liveMode} helper={formatLastUpdated(new Date(workersQuery.dataUpdatedAt))} />
            <Button variant="secondary" onClick={() => setLiveMode((current) => !current)}>
              {liveMode ? "Pause live sync" : "Resume live sync"}
            </Button>
            <Button variant="secondary" onClick={() => void workersQuery.refetch()} disabled={workersQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${workersQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Workers" value={workers.length} icon={Users} />
        <MetricCard title="Active on roster" value={activeWorkers} icon={ShieldCheck} tone="success" />
        <MetricCard title="Departments" value={departments.length} icon={BriefcaseBusiness} tone="primary" />
        <MetricCard title="Filtered results" value={filteredWorkers.length} icon={MapPin} tone="warning" />
      </div>

      <EnterpriseCard title="Workforce roster" description="Search, filter, and inspect worker safety posture across the live workforce record.">
        <DataToolbar
          summary={`${formatNumber(filteredWorkers.length)} workers match the current controls.`}
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setDepartmentFilter("all");
                setStatusFilter("all");
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
              placeholder="Search worker, department, designation, or worker code"
              aria-label="Search workers"
            />
            <Select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label="Filter workers by department">
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter workers by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </Select>
          </FilterBar>
        </DataToolbar>

        <div className="mt-5">
          {paginatedWorkers.items.length ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Worker</TableHeaderCell>
                      <TableHeaderCell>Department</TableHeaderCell>
                      <TableHeaderCell>Designation</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedWorkers.items.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell>
                          <p className="font-medium">{worker.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{worker.worker_code}</p>
                        </TableCell>
                        <TableCell>{worker.department}</TableCell>
                        <TableCell>{worker.designation}</TableCell>
                        <TableCell>
                          <StatusBadge status={worker.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedId(worker.id)}>
                            View safety
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Pagination
                pagination={{
                  total: filteredWorkers.length,
                  skip: (paginatedWorkers.page - 1) * PAGE_SIZE,
                  limit: PAGE_SIZE
                }}
                onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage) => currentPage + 1)}
              />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No workers match the active filters"
              description="Clear the search or broaden the department and status filters to restore the workforce list."
            />
          )}
        </div>
      </EnterpriseCard>

      <Drawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title="Worker safety posture"
        description="Safety snapshot for the selected worker."
      >
        {safetyQuery.isLoading ? <LoadingState rows={3} /> : null}
        {safetyQuery.isError ? (
          <ErrorState
            title="Safety snapshot unavailable"
            description="The selected worker safety view could not be loaded."
            onRetry={() => void safetyQuery.refetch()}
          />
        ) : null}
        {safetyQuery.data ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Worker</p>
              <p className="mt-2 text-xl font-semibold">{safetyQuery.data.worker_name}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">Current zone</p>
                <p className="mt-2 text-lg font-semibold">{safetyQuery.data.current_zone_id ?? "Unavailable"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">Active permits</p>
                <p className="mt-2 text-lg font-semibold">{safetyQuery.data.active_permits}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Safety status</p>
              <p className="mt-2 text-lg font-semibold">{safetyQuery.data.safety_status}</p>
              {safetyQuery.data.current_location_timestamp ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Last location update: {formatDateTime(safetyQuery.data.current_location_timestamp)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
