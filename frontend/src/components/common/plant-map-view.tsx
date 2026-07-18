"use client";

import dynamic from "next/dynamic";

import type { PlantRead, ZoneRead } from "@/types/domain";

const LeafletMap = dynamic(() => import("@/components/common/plant-map-view-inner"), {
  ssr: false
});

interface PlantMapViewProps {
  plants: PlantRead[];
  zones: ZoneRead[];
  showPlants?: boolean;
  showZones?: boolean;
  selectedPlantId?: string | null;
  selectedZoneId?: string | null;
  onPlantSelect?: (plantId: string) => void;
  onZoneSelect?: (zoneId: string) => void;
}

export function PlantMapView({
  plants,
  zones,
  showPlants = true,
  showZones = true,
  selectedPlantId,
  selectedZoneId,
  onPlantSelect,
  onZoneSelect
}: PlantMapViewProps) {
  return (
    <LeafletMap
      plants={plants}
      zones={zones}
      showPlants={showPlants}
      showZones={showZones}
      selectedPlantId={selectedPlantId}
      selectedZoneId={selectedZoneId}
      onPlantSelect={onPlantSelect}
      onZoneSelect={onZoneSelect}
    />
  );
}
