"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, SearchX, Wrench, WrenchIcon } from "lucide-react";

import { DataToolbar } from "@/components/common/data-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { entitiesService } from "@/services/entities-service";
import { paginateItems } from "@/utils/collections";
import { formatDateTime, formatNumber, titleCase } from "@/utils/format";

const PAGE_SIZE = 8;

export default function MaintenancePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.all,
    queryFn: () => entitiesService.listMaintenance()
  });
  const overdueQuery = useQuery({
    queryKey: queryKeys.maintenance.overdue,
    queryFn: () => entitiesService.listOverdueMaintenance()
  });
  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment()
  });

  const maintenanceItems = maintenanceQuery.data?.items ?? [];
  const overdueItems = overdueQuery.data ?? [];
  const equipmentMap = useMemo(
    () =>
      new Map((equipmentQuery.data?.items ?? []).map((equipment) => [equipment.id, equipment.equipment_name])),
    [equipmentQuery.data?.items]
  );

  const maintenanceTypes = useMemo(
    () =>
      [...new Set(maintenanceItems.map((item) => item.maintenance_type))]
        .sort((left, right) => left.localeCompare(right)),
    [maintenanceItems]
  );

  const filteredMaintenance = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return maintenanceItems.filter((item) => {
      const equipmentName = equipmentMap.get(item.equipment_id) ?? item.equipment_id;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesType = typeFilter === "all" || item.maintenance_type === typeFilter;
      const haystack = [equipmentName, item.assigned_to, item.maintenance_type, item.status, item.remarks]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && matchesType && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [debouncedSearch, equipmentMap, maintenanceItems, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  const paginatedMaintenance = paginateItems(filteredMaintenance, page, PAGE_SIZE);
  const runningCount = maintenanceItems.filter((item) => item.status === "running").length;
  const completedCount = maintenanceItems.filter((item) => item.status === "completed").length;

  if (maintenanceQuery.isLoading || overdueQuery.isLoading || equipmentQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (maintenanceQuery.isError || overdueQuery.isError || equipmentQuery.isError) {
    return (
      <ErrorState
        title="Maintenance view unavailable"
        description="Maintenance or reference equipment data could not be loaded."
        onRetry={() =>
          void Promise.all([maintenanceQuery.refetch(), overdueQuery.refetch(), equipmentQuery.refetch()])
        }
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Maintenance Operations"
        title="Maintenance"
        description="Coordinate maintenance execution with searchable work orders, overdue visibility, and equipment context across the operating fleet."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Work orders" value={maintenanceItems.length} icon={Wrench} />
        <MetricCard title="Running now" value={runningCount} icon={WrenchIcon} tone="warning" />
        <MetricCard title="Overdue" value={overdueItems.length} icon={AlertTriangle} tone="critical" />
        <MetricCard title="Completed" value={completedCount} icon={CalendarClock} tone="success" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.3fr_0.7fr]">
        <EnterpriseCard title="Maintenance register" description="Search, filter, and review maintenance execution across the current work order set.">
          <DataToolbar
            summary={`${formatNumber(filteredMaintenance.length)} maintenance records match the current filters.`}
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
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
                placeholder="Search equipment, assignee, maintenance type, or remarks"
                aria-label="Search maintenance records"
              />
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter maintenance by status">
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter maintenance by type">
                <option value="all">All types</option>
                {maintenanceTypes.map((maintenanceType) => (
                  <option key={maintenanceType} value={maintenanceType}>
                    {titleCase(maintenanceType)}
                  </option>
                ))}
              </Select>
            </FilterBar>
          </DataToolbar>

          <div className="mt-5">
            {paginatedMaintenance.items.length ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Equipment</TableHeaderCell>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Assigned</TableHeaderCell>
                        <TableHeaderCell>Scheduled</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedMaintenance.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">{equipmentMap.get(item.equipment_id) ?? item.equipment_id}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.equipment_id}</p>
                          </TableCell>
                          <TableCell>{titleCase(item.maintenance_type)}</TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell>{item.assigned_to ?? "Unassigned"}</TableCell>
                          <TableCell>{formatDateTime(item.scheduled_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Pagination
                  pagination={{
                    total: filteredMaintenance.length,
                    skip: (paginatedMaintenance.page - 1) * PAGE_SIZE,
                    limit: PAGE_SIZE
                  }}
                  onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  onNext={() => setPage((currentPage) => currentPage + 1)}
                />
              </>
            ) : (
              <EmptyState
                icon={SearchX}
                title="No maintenance records match the active controls"
                description="Clear the search or widen the maintenance filters to restore the work order list."
              />
            )}
          </div>
        </EnterpriseCard>

        <EnterpriseCard title="Overdue tasks" description="Maintenance items currently flagged as overdue.">
          {overdueItems.length ? (
            <div className="space-y-3">
              {overdueItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-critical/30 bg-critical/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{equipmentMap.get(item.equipment_id) ?? item.equipment_id}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {titleCase(item.maintenance_type)} assigned to {item.assigned_to ?? "Unassigned"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Scheduled for {formatDateTime(item.scheduled_date)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="No overdue maintenance tasks"
              description="There are no outstanding overdue work orders right now."
            />
          )}
        </EnterpriseCard>
      </div>
    </div>
  );
}
