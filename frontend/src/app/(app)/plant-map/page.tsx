"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Factory, Layers3, MapPinned, Radar, RefreshCw, SearchX, Sparkles, TriangleAlert } from "lucide-react";

import { DataToolbar } from "@/components/common/data-toolbar";
import { AgentNetworkPanel } from "@/components/common/agent-network-panel";
import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { IntelligenceContributors } from "@/components/common/intelligence-contributors";
import { LiveIndicator } from "@/components/common/live-indicator";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { PlantMapView } from "@/components/common/plant-map-view";
import { RiskBadge } from "@/components/common/risk-badge";
import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useSavedState } from "@/hooks/use-saved-state";
import { formatLastUpdated, getLiveRefetchInterval, liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { entitiesService } from "@/services/entities-service";
import { formatNumber } from "@/utils/format";
import { buildAgentInsights, buildExecutiveDecisionBrief, buildZoneHotspots } from "@/utils/intelligence";

export default function PlantMapPage() {
  const [liveMode, setLiveMode] = useSavedState("sentinel-map-live", true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showPlants, setShowPlants] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const plantsQuery = useQuery({
    queryKey: queryKeys.plants.all,
    queryFn: () => entitiesService.listPlants(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.map)
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.all,
    queryFn: () => entitiesService.listZones(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.map)
  });
  const equipmentQuery = useQuery({
    queryKey: queryKeys.equipment.all,
    queryFn: () => entitiesService.listEquipment(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.map)
  });
  const permitsQuery = useQuery({
    queryKey: queryKeys.permits.all,
    queryFn: () => entitiesService.listPermits(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.map)
  });
  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.all,
    queryFn: () => entitiesService.listMaintenance(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.map)
  });
  const incidentsQuery = useQuery({
    queryKey: queryKeys.incidents.all,
    queryFn: () => entitiesService.listIncidents(),
    refetchInterval: getLiveRefetchInterval(liveMode, liveIntervals.map)
  });

  const plants = plantsQuery.data?.items ?? [];
  const zones = zonesQuery.data?.items ?? [];
  const equipment = equipmentQuery.data?.items ?? [];
  const permits = permitsQuery.data?.items ?? [];
  const maintenanceItems = maintenanceQuery.data?.items ?? [];
  const incidents = incidentsQuery.data?.items ?? [];

  const visiblePlants = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return plants.filter((plant) => {
      const haystack = [plant.name, plant.location, plant.industry].join(" ").toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [plants, search]);

  const visibleZones = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return zones.filter((zone) => {
      const matchesRisk = riskFilter === "all" || zone.risk_level === riskFilter;
      const haystack = [zone.zone_name, zone.description, zone.risk_level].filter(Boolean).join(" ").toLowerCase();
      return matchesRisk && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [riskFilter, search, zones]);

  const hotspots = useMemo(
    () =>
      buildZoneHotspots({
        zones,
        plants,
        permits,
        maintenance: maintenanceItems,
        equipment,
        incidents
      }),
    [equipment, incidents, maintenanceItems, permits, plants, zones]
  );

  const visibleHotspots = useMemo(
    () => hotspots.filter((hotspot) => visibleZones.some((zone) => zone.id === hotspot.zoneId)),
    [hotspots, visibleZones]
  );

  const mapAgentInsights = useMemo(
    () =>
      buildAgentInsights({
        hotspots: visibleHotspots,
        liveRisks: [],
        permits,
        maintenance: maintenanceItems,
        incidents,
        plants,
        zones,
        equipment
      }),
    [equipment, incidents, maintenanceItems, permits, plants, visibleHotspots, zones]
  );

  const mapExecutiveBrief = useMemo(() => buildExecutiveDecisionBrief(mapAgentInsights), [mapAgentInsights]);

  const selectedPlant = plants.find((plant) => plant.id === selectedPlantId) ?? null;
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const selectedHotspot = visibleHotspots.find((hotspot) => hotspot.zoneId === selectedZoneId) ?? null;
  const mappedPlants = plants.filter((plant) => plant.latitude && plant.longitude).length;
  const mappedZones = zones.filter((zone) => zone.latitude && zone.longitude).length;
  const hotspotCount = visibleHotspots.filter((hotspot) => hotspot.hotspotScore >= 75).length;
  const overlappingPermits = visibleHotspots.reduce((sum, hotspot) => sum + hotspot.activePermitCount, 0);

  if (
    plantsQuery.isLoading ||
    zonesQuery.isLoading ||
    equipmentQuery.isLoading ||
    permitsQuery.isLoading ||
    maintenanceQuery.isLoading ||
    incidentsQuery.isLoading
  ) {
    return <LoadingState rows={3} />;
  }

  if (
    plantsQuery.isError ||
    zonesQuery.isError ||
    equipmentQuery.isError ||
    permitsQuery.isError ||
    maintenanceQuery.isError ||
    incidentsQuery.isError
  ) {
    return (
      <ErrorState
        title="Plant map unavailable"
        description="Plant, zone, or correlated operating context could not be loaded."
        onRetry={() => {
          void Promise.all([
            plantsQuery.refetch(),
            zonesQuery.refetch(),
            equipmentQuery.refetch(),
            permitsQuery.refetch(),
            maintenanceQuery.refetch(),
            incidentsQuery.refetch()
          ]);
        }}
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Spatial Awareness"
        title="Plant map"
        description="See risk hotspots, permit overlap, maintenance pressure, equipment degradation, and zone-level recommended actions in one spatial view."
        actions={
          <>
            <LiveIndicator
              active={liveMode}
              helper={formatLastUpdated(
                new Date(
                  Math.max(
                    plantsQuery.dataUpdatedAt,
                    zonesQuery.dataUpdatedAt,
                    equipmentQuery.dataUpdatedAt,
                    permitsQuery.dataUpdatedAt,
                    maintenanceQuery.dataUpdatedAt,
                    incidentsQuery.dataUpdatedAt
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
                  plantsQuery.refetch(),
                  zonesQuery.refetch(),
                  equipmentQuery.refetch(),
                  permitsQuery.refetch(),
                  maintenanceQuery.refetch(),
                  incidentsQuery.refetch()
                ])
              }
              disabled={
                plantsQuery.isFetching ||
                zonesQuery.isFetching ||
                equipmentQuery.isFetching ||
                permitsQuery.isFetching ||
                maintenanceQuery.isFetching ||
                incidentsQuery.isFetching
              }
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  plantsQuery.isFetching ||
                  zonesQuery.isFetching ||
                  equipmentQuery.isFetching ||
                  permitsQuery.isFetching ||
                  maintenanceQuery.isFetching ||
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
        <MetricCard title="Mapped plants" value={mappedPlants} icon={Factory} />
        <MetricCard title="Mapped zones" value={mappedZones} icon={MapPinned} tone="primary" />
        <MetricCard title="AI hotspots" value={hotspotCount} icon={TriangleAlert} tone="critical" />
        <MetricCard title="Permit overlaps" value={overlappingPermits} icon={Radar} tone="warning" />
      </div>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <EnterpriseCard
          title="Operational map"
          description="Blue markers represent plants. Zone markers are color-coded by risk severity while the side panel explains the AI hotspot logic behind the spatial view."
        >
          <DataToolbar
            summary={`${formatNumber(visiblePlants.length)} plants and ${formatNumber(visibleZones.length)} zones currently match the active map filters.`}
          >
            <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto]">
              <SearchBar
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search plants, zones, locations, or industries"
                aria-label="Search map entities"
              />
              <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} aria-label="Filter zones by risk">
                <option value="all">All zone risks</option>
                <option value="safe">Safe</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
              <Button variant={showPlants ? "primary" : "secondary"} onClick={() => setShowPlants((current) => !current)}>
                {showPlants ? "Hide plants" : "Show plants"}
              </Button>
              <Button variant={showZones ? "primary" : "secondary"} onClick={() => setShowZones((current) => !current)}>
                {showZones ? "Hide zones" : "Show zones"}
              </Button>
            </FilterBar>
          </DataToolbar>

          <div className="mt-5">
            <PlantMapView
              plants={visiblePlants}
              zones={visibleZones}
              showPlants={showPlants}
              showZones={showZones}
              selectedPlantId={selectedPlantId}
              selectedZoneId={selectedZoneId}
              onPlantSelect={(plantId) => {
                setSelectedPlantId(plantId);
                setSelectedZoneId(null);
              }}
              onZoneSelect={(zoneId) => {
                setSelectedZoneId(zoneId);
                setSelectedPlantId(null);
              }}
            />
          </div>
        </EnterpriseCard>

        <EnterpriseCard title="Map focus panel" description="Selected context, AI hotspot reasoning, and quick access to mappable plants and zones.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-medium">Geospatial AI signals</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {mapExecutiveBrief?.narrative ??
                  "Spatial AI signals are monitoring permits, maintenance, incident context, and zone severity."}
              </p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Worker exposure on this map is inferred from permit assignments and incident links in the current operating dataset rather than live badge telemetry.
              </p>
            </div>

            <AgentNetworkPanel
              items={mapAgentInsights.filter((agent) =>
                [
                  "risk-intelligence-agent",
                  "permit-intelligence-agent",
                  "maintenance-intelligence-agent",
                  "emergency-response-agent"
                ].includes(agent.id)
              )}
              limit={4}
            />

            {selectedPlant ? (
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{selectedPlant.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedPlant.location}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedPlant.industry}</p>
                  </div>
                  <StatusBadge status={selectedPlant.status} />
                </div>
              </div>
            ) : null}

            {selectedZone ? (
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{selectedZone.zone_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedZone.description ?? "No description available."}</p>
                  </div>
                  <RiskBadge severity={selectedZone.risk_level} />
                </div>
                {selectedHotspot ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                        <p className="text-sm text-muted-foreground">Hotspot score</p>
                        <p className="mt-2 text-2xl font-semibold">{selectedHotspot.hotspotScore.toFixed(0)}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                        <p className="text-sm text-muted-foreground">Prediction horizon</p>
                        <p className="mt-2 text-base font-semibold">{selectedHotspot.predictionHorizon}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="font-medium text-primary">AI recommended action</p>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{selectedHotspot.recommendedAction}</p>
                    </div>
                    <IntelligenceContributors
                      items={selectedHotspot.contributors}
                      emptyDescription="No additional AI contributors were derived for this selected zone."
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <p className="font-medium">AI hotspot overlay</p>
              </div>
              <div className="space-y-3">
                {visibleHotspots.slice(0, 5).length ? (
                  visibleHotspots.slice(0, 5).map((hotspot) => (
                    <button
                      key={hotspot.zoneId}
                      type="button"
                      className="focus-ring flex w-full items-start justify-between rounded-2xl border border-border/70 bg-background/50 p-4 text-left"
                      onClick={() => {
                        setSelectedZoneId(hotspot.zoneId);
                        setSelectedPlantId(null);
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{hotspot.zoneName}</p>
                          <RiskBadge severity={hotspot.severity} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{hotspot.contributors[0]?.detail ?? hotspot.recommendedAction}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1">
                            {hotspot.activePermitCount} permit overlap
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1">
                            {hotspot.degradedEquipmentCount} equipment alerts
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1">
                            {hotspot.openIncidentCount} incident signals
                          </span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-right">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Score</p>
                        <p className="mt-1 text-lg font-semibold">{hotspot.hotspotScore.toFixed(0)}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyState
                    icon={Sparkles}
                    title="No hotspots match the current filters"
                    description="Broaden the map filters to surface AI-generated hotspots again."
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" />
                <p className="font-medium">Visible plants</p>
              </div>
              <div className="space-y-2">
                {visiblePlants.length ? (
                  visiblePlants.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      className="focus-ring flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-left"
                      onClick={() => {
                        setSelectedPlantId(plant.id);
                        setSelectedZoneId(null);
                      }}
                    >
                      <span className="text-sm font-medium">{plant.name}</span>
                      <StatusBadge status={plant.status} />
                    </button>
                  ))
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title="No plants visible"
                    description="The current search filters have hidden all plant markers."
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-accent" />
                <p className="font-medium">Visible zones</p>
              </div>
              <div className="space-y-2">
                {visibleZones.length ? (
                  visibleZones.slice(0, 8).map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      className="focus-ring flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-left"
                      onClick={() => {
                        setSelectedZoneId(zone.id);
                        setSelectedPlantId(null);
                      }}
                    >
                      <span className="text-sm font-medium">{zone.zone_name}</span>
                      <RiskBadge severity={zone.risk_level} />
                    </button>
                  ))
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title="No zones visible"
                    description="The current search and risk filters have hidden all zone markers."
                  />
                )}
              </div>
            </div>
          </div>
        </EnterpriseCard>
      </div>
    </div>
  );
}
