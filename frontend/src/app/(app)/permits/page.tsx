"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileCheck2, Flame, SearchX, ShieldAlert } from "lucide-react";

import { DataToolbar } from "@/components/common/data-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { RiskBadge } from "@/components/common/risk-badge";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { entitiesService } from "@/services/entities-service";
import { paginateItems } from "@/utils/collections";
import { formatDateTime, formatNumber, titleCase } from "@/utils/format";

const PAGE_SIZE = 8;

export default function PermitsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const permitsQuery = useQuery({
    queryKey: queryKeys.permits.all,
    queryFn: () => entitiesService.listPermits()
  });
  const conflictsQuery = useQuery({
    queryKey: selectedId ? queryKeys.permits.conflicts(selectedId) : [...queryKeys.permits.all, "conflicts"],
    queryFn: () => entitiesService.getPermitConflicts(selectedId as string),
    enabled: Boolean(selectedId)
  });

  const permits = permitsQuery.data?.items ?? [];
  const permitTypes = useMemo(
    () => [...new Set(permits.map((permit) => permit.permit_type))].sort((left, right) => left.localeCompare(right)),
    [permits]
  );

  const filteredPermits = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return permits.filter((permit) => {
      const matchesType = typeFilter === "all" || permit.permit_type === typeFilter;
      const matchesStatus = statusFilter === "all" || permit.status === statusFilter;
      const haystack = [permit.permit_number, permit.permit_type, permit.status, permit.approved_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesType && matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [debouncedSearch, permits, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  const paginatedPermits = paginateItems(filteredPermits, page, PAGE_SIZE);
  const openPermits = permits.filter((permit) => ["open", "approved"].includes(permit.status)).length;
  const hotWorkPermits = permits.filter((permit) => permit.permit_type === "hot_work").length;
  const expiringSoon = permits.filter((permit) => {
    const remainingHours = (new Date(permit.end_time).getTime() - Date.now()) / (1000 * 60 * 60);
    return remainingHours >= 0 && remainingHours <= 12;
  }).length;

  if (permitsQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (permitsQuery.isError) {
    return (
      <ErrorState
        title="Permit view unavailable"
        description="Permit data could not be loaded."
        onRetry={() => void permitsQuery.refetch()}
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Permit-to-Work"
        title="Permits"
        description="Manage operational permit visibility, isolate higher-risk work types, and inspect conflict signals across active work."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Permits" value={permits.length} icon={FileCheck2} />
        <MetricCard title="Open or approved" value={openPermits} icon={ShieldAlert} tone="success" />
        <MetricCard title="Hot work" value={hotWorkPermits} icon={Flame} tone="warning" />
        <MetricCard title="Ending in 12h" value={expiringSoon} icon={AlertTriangle} tone="critical" />
      </div>

      <EnterpriseCard title="Permit register" description="Search, filter, and inspect permit conflict posture across the current operating set.">
        <DataToolbar
          summary={`${formatNumber(filteredPermits.length)} permits match the active permit-to-work filters.`}
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
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
              placeholder="Search permit number, type, status, or approver"
              aria-label="Search permits"
            />
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter permits by type">
              <option value="all">All permit types</option>
              {permitTypes.map((permitType) => (
                <option key={permitType} value={permitType}>
                  {titleCase(permitType)}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter permits by status">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
              <option value="closed">Closed</option>
            </Select>
          </FilterBar>
        </DataToolbar>

        <div className="mt-5">
          {paginatedPermits.items.length ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Permit</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Window</TableHeaderCell>
                      <TableHeaderCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedPermits.items.map((permit) => (
                      <TableRow key={permit.id}>
                        <TableCell>
                          <p className="font-medium">{permit.permit_number}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Approved by {permit.approved_by ?? "Pending approval"}
                          </p>
                        </TableCell>
                        <TableCell>{titleCase(permit.permit_type)}</TableCell>
                        <TableCell>
                          <StatusBadge status={permit.status} />
                        </TableCell>
                        <TableCell>
                          {formatDateTime(permit.start_time)} to {formatDateTime(permit.end_time)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedId(permit.id)}>
                            View conflicts
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Pagination
                pagination={{
                  total: filteredPermits.length,
                  skip: (paginatedPermits.page - 1) * PAGE_SIZE,
                  limit: PAGE_SIZE
                }}
                onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage) => currentPage + 1)}
              />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No permits match the current controls"
              description="Reset the permit search or widen the selected type and status filters to restore the register."
            />
          )}
        </div>
      </EnterpriseCard>

      <Drawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title="Permit conflicts"
        description="Risk events related to the selected permit."
      >
        {conflictsQuery.isLoading ? <LoadingState rows={3} /> : null}
        {conflictsQuery.isError ? (
          <ErrorState
            title="Conflict analysis unavailable"
            description="The selected permit conflict view could not be loaded."
            onRetry={() => void conflictsQuery.refetch()}
          />
        ) : null}
        {conflictsQuery.data?.length ? (
          <div className="space-y-3">
            {conflictsQuery.data.map((risk) => (
              <div key={risk.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{risk.risk_category}</p>
                  <RiskBadge severity={risk.severity} />
                  <StatusBadge status={risk.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{risk.reason}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Recommendation: {risk.recommendation}
                </p>
              </div>
            ))}
          </div>
        ) : conflictsQuery.data ? (
          <EmptyState
            icon={ShieldAlert}
            title="No conflicts detected"
            description="The selected permit is not currently linked to any related risk events."
          />
        ) : null}
      </Drawer>
    </div>
  );
}
