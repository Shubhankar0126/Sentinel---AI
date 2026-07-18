"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Factory, MapPinned, Network, SearchX, Sparkles, TriangleAlert, Users } from "lucide-react";

import { StatusDonutChart } from "@/components/charts/status-donut-chart";
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
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { entitiesService } from "@/services/entities-service";
import { paginateItems } from "@/utils/collections";
import { formatNumber } from "@/utils/format";

const PAGE_SIZE = 8;

export default function PlantOverviewPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const plantsQuery = useQuery({
    queryKey: queryKeys.plants.all,
    queryFn: () => entitiesService.listPlants()
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.all,
    queryFn: () => entitiesService.listZones()
  });
  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment()
  });
  const workersQuery = useQuery({
    queryKey: queryKeys.workers.all,
    queryFn: () => entitiesService.listWorkers()
  });

  const plants = plantsQuery.data?.items ?? [];
  const zones = zonesQuery.data?.items ?? [];
  const equipment = equipmentQuery.data?.items ?? [];
  const workers = workersQuery.data?.items ?? [];

  const plantSummaries = useMemo(
    () =>
      plants.map((plant) => {
        const relatedZones = zones.filter((zone) => zone.plant_id === plant.id);
        const relatedEquipment = equipment.filter((item) => item.plant_id === plant.id);

        return {
          ...plant,
          zoneCount: relatedZones.length,
          equipmentCount: relatedEquipment.length,
          criticalZoneCount: relatedZones.filter((zone) => zone.risk_level === "critical").length,
          healthyEquipmentCount: relatedEquipment.filter((item) => item.status === "healthy").length
        };
      }),
    [equipment, plants, zones]
  );

  const filteredZones = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return zones.filter((zone) => {
      const plantName = plants.find((plant) => plant.id === zone.plant_id)?.name ?? "Unknown plant";
      const matchesRisk = riskFilter === "all" || zone.risk_level === riskFilter;
      const haystack = [zone.zone_name, zone.description, plantName, zone.risk_level]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesRisk && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [debouncedSearch, plants, riskFilter, zones]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, riskFilter]);

  const paginatedZones = paginateItems(filteredZones, page, PAGE_SIZE);
  const riskDistribution = useMemo(() => {
    const counts = zones.reduce<Record<string, number>>((accumulator, zone) => {
      accumulator[zone.risk_level] = (accumulator[zone.risk_level] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [zones]);
  const priorityPlants = useMemo(
    () =>
      [...plantSummaries]
        .filter((plant) => plant.criticalZoneCount > 0 || plant.healthyEquipmentCount < plant.equipmentCount)
        .sort((left, right) => {
          const leftScore = left.criticalZoneCount * 3 + (left.equipmentCount - left.healthyEquipmentCount);
          const rightScore = right.criticalZoneCount * 3 + (right.equipmentCount - right.healthyEquipmentCount);
          return rightScore - leftScore;
        })
        .slice(0, 4),
    [plantSummaries]
  );

  const isLoading = plantsQuery.isLoading || zonesQuery.isLoading || equipmentQuery.isLoading || workersQuery.isLoading;

  if (isLoading) {
    return <LoadingState rows={4} />;
  }

  if (plantsQuery.isError || zonesQuery.isError || equipmentQuery.isError || workersQuery.isError) {
    return (
      <ErrorState
        title="Plant overview unavailable"
        description="One or more plant data services did not respond successfully."
        onRetry={() => {
          void Promise.all([
            plantsQuery.refetch(),
            zonesQuery.refetch(),
            equipmentQuery.refetch(),
            workersQuery.refetch()
          ]);
        }}
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Plant Visibility"
        title="Plant and zone footprint"
        description="Review plant coverage, zone risk posture, and supporting asset density while surfacing the plants that AI would prioritize first for deeper investigation."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Plants" value={plants.length} icon={Factory} />
        <MetricCard title="Zones" value={zones.length} icon={MapPinned} tone="primary" />
        <MetricCard title="Equipment" value={equipment.length} icon={Network} tone="warning" />
        <MetricCard title="Workers" value={workers.length} icon={Users} tone="success" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <EnterpriseCard title="Plant coverage" description="Operational footprint and asset density by plant.">
          <div className="grid gap-4 xl:grid-cols-2">
            {plantSummaries.map((plant) => (
              <div key={plant.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{plant.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plant.location} | {plant.industry}
                    </p>
                  </div>
                  <StatusBadge status={plant.status} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">Zones</p>
                    <p className="mt-2 text-2xl font-semibold">{plant.zoneCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">Equipment</p>
                    <p className="mt-2 text-2xl font-semibold">{plant.equipmentCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">Critical zones</p>
                    <p className="mt-2 text-2xl font-semibold">{plant.criticalZoneCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">Healthy assets</p>
                    <p className="mt-2 text-2xl font-semibold">{plant.healthyEquipmentCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </EnterpriseCard>

        <div className="panel-grid">
          <EnterpriseCard title="Zone risk distribution" description="Current risk-level mix across the configured zone inventory.">
            {riskDistribution.length ? (
              <StatusDonutChart data={riskDistribution} />
            ) : (
              <EmptyState
                icon={TriangleAlert}
                title="No zone risk data available"
                description="The zone registry is empty, so no risk distribution can be rendered yet."
              />
            )}
          </EnterpriseCard>

          <EnterpriseCard
            title="AI footprint priorities"
            description="Plants ranked for safety review based on critical zones and degraded asset concentration."
          >
            {priorityPlants.length ? (
              <div className="space-y-3">
                {priorityPlants.map((plant) => (
                  <div key={plant.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-accent" />
                          <p className="font-medium">{plant.name}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {plant.criticalZoneCount > 0
                            ? `${plant.criticalZoneCount} critical zones are elevating the plant risk posture.`
                            : "Asset health deterioration is creating the primary review signal."}
                        </p>
                      </div>
                      <StatusBadge status={plant.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1">
                        {plant.zoneCount} zones
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1">
                        {plant.criticalZoneCount} critical zones
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1">
                        {plant.equipmentCount - plant.healthyEquipmentCount} assets need attention
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No elevated footprint priorities"
                description="Current plant coverage does not show any standout AI escalation priority."
              />
            )}
          </EnterpriseCard>
        </div>
      </div>

      <EnterpriseCard title="Zone registry" description="Search, filter, and review zone posture by plant with an AI-ready view of where deeper investigation should start.">
        <DataToolbar
          summary={`${formatNumber(filteredZones.length)} zones match the current plant overview filters.`}
        >
          <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search zone, plant, description, or risk"
              aria-label="Search zones"
            />
            <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} aria-label="Filter zones by risk level">
              <option value="all">All risk levels</option>
              <option value="safe">Safe</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </FilterBar>
        </DataToolbar>

        <div className="mt-5">
          {paginatedZones.items.length ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Zone</TableHeaderCell>
                      <TableHeaderCell>Plant</TableHeaderCell>
                      <TableHeaderCell>Risk</TableHeaderCell>
                      <TableHeaderCell>Description</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedZones.items.map((zone) => {
                      const plantName = plants.find((plant) => plant.id === zone.plant_id)?.name ?? "Unknown plant";
                      return (
                        <TableRow key={zone.id}>
                          <TableCell>{zone.zone_name}</TableCell>
                          <TableCell>{plantName}</TableCell>
                          <TableCell>
                            <RiskBadge severity={zone.risk_level} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{zone.description ?? "No description"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Pagination
                pagination={{
                  total: filteredZones.length,
                  skip: (paginatedZones.page - 1) * PAGE_SIZE,
                  limit: PAGE_SIZE
                }}
                onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage) => currentPage + 1)}
              />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No zones match the current filters"
              description="Broaden the search or select a different risk level to restore the zone registry."
            />
          )}
        </div>
      </EnterpriseCard>
    </div>
  );
}
