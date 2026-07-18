"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import type { PlantRead, ZoneRead } from "@/types/domain";

interface PlantMapViewInnerProps {
  plants: PlantRead[];
  zones: ZoneRead[];
  showPlants?: boolean;
  showZones?: boolean;
  selectedPlantId?: string | null;
  selectedZoneId?: string | null;
  onPlantSelect?: (plantId: string) => void;
  onZoneSelect?: (zoneId: string) => void;
}

const zoneColors: Record<string, string> = {
  safe: "#10b981",
  low: "#94a3b8",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444"
};

function FlyToSelection({ position }: { position?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 12, { animate: true, duration: 0.75 });
    }
  }, [map, position]);

  return null;
}

export default function PlantMapViewInner({
  plants,
  zones,
  showPlants = true,
  showZones = true,
  selectedPlantId,
  selectedZoneId,
  onPlantSelect,
  onZoneSelect
}: PlantMapViewInnerProps) {
  const plantMarkers = useMemo(
    () =>
      plants.filter(
        (plant) => showPlants && typeof plant.latitude === "number" && typeof plant.longitude === "number"
      ),
    [plants, showPlants]
  );
  const zoneMarkers = useMemo(
    () =>
      zones.filter((zone) => showZones && typeof zone.latitude === "number" && typeof zone.longitude === "number"),
    [showZones, zones]
  );

  if (!plantMarkers.length && !zoneMarkers.length) {
    return (
      <EmptyState
        icon={MapPin}
        title="No mappable coordinates available"
        description="No visible plant or zone coordinates are available for the current map filters."
      />
    );
  }

  const selectedPlant = plantMarkers.find((plant) => plant.id === selectedPlantId) ?? null;
  const selectedZone = zoneMarkers.find((zone) => zone.id === selectedZoneId) ?? null;
  const focusPosition =
    selectedZone && selectedZone.latitude && selectedZone.longitude
      ? ([selectedZone.latitude, selectedZone.longitude] as [number, number])
      : selectedPlant && selectedPlant.latitude && selectedPlant.longitude
        ? ([selectedPlant.latitude, selectedPlant.longitude] as [number, number])
        : plantMarkers[0]
          ? ([plantMarkers[0].latitude as number, plantMarkers[0].longitude as number] as [number, number])
          : ([zoneMarkers[0].latitude as number, zoneMarkers[0].longitude as number] as [number, number]);

  return (
    <div className="h-[580px] overflow-hidden rounded-2xl border border-border/70">
      <MapContainer center={focusPosition} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToSelection position={focusPosition} />

        {plantMarkers.map((plant) => {
          const isSelected = plant.id === selectedPlantId;
          return (
            <CircleMarker
              key={plant.id}
              center={[plant.latitude as number, plant.longitude as number]}
              radius={isSelected ? 10 : 8}
              pathOptions={{
                color: "#ffffff",
                weight: isSelected ? 3 : 2,
                fillColor: "#2563eb",
                fillOpacity: 0.95
              }}
              eventHandlers={{
                click: () => onPlantSelect?.(plant.id)
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                {plant.name}
              </Tooltip>
              <Popup>
                <strong>{plant.name}</strong>
                <br />
                {plant.location}
                <br />
                {plant.industry}
              </Popup>
            </CircleMarker>
          );
        })}

        {zoneMarkers.map((zone) => {
          const isSelected = zone.id === selectedZoneId;
          return (
            <CircleMarker
              key={zone.id}
              center={[zone.latitude as number, zone.longitude as number]}
              radius={isSelected ? 9 : 7}
              pathOptions={{
                color: "#ffffff",
                weight: isSelected ? 3 : 2,
                fillColor: zoneColors[zone.risk_level] ?? "#06b6d4",
                fillOpacity: 0.92
              }}
              eventHandlers={{
                click: () => onZoneSelect?.(zone.id)
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                {zone.zone_name}
              </Tooltip>
              <Popup>
                <strong>{zone.zone_name}</strong>
                <br />
                Risk: {zone.risk_level}
                <br />
                {zone.description ?? "No description"}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
