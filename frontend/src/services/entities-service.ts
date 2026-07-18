import type { ApiListResult, ApiResponse } from "@/types/api";
import type {
  EquipmentHealthView,
  EquipmentRead,
  IncidentRead,
  IncidentReport,
  MaintenanceRead,
  PermitRead,
  PlantRead,
  RiskEventRead,
  SensorRead,
  SensorReadingRead,
  WorkerRead,
  WorkerSafetyView,
  ZoneRead,
  ZoneSummary
} from "@/types/domain";
import { apiClient, unwrapListResponse, unwrapResponse } from "@/services/api-client";

const getList = async <T>(path: string, params?: Record<string, unknown>) => {
  const { data } = await apiClient.get<ApiResponse<T[]>>(path, { params });
  return unwrapListResponse<T>(data);
};

export const entitiesService = {
  listPlants: () => getList<PlantRead>("/plants"),
  getPlant: async (plantId: string) => {
    const { data } = await apiClient.get<ApiResponse<PlantRead>>(`/plants/${plantId}`);
    return unwrapResponse(data);
  },
  listZones: (plantId?: string) => getList<ZoneRead>("/zones", plantId ? { plant_id: plantId } : undefined),
  getZoneSummary: async (zoneId: string) => {
    const { data } = await apiClient.get<ApiResponse<ZoneSummary>>(`/zones/${zoneId}/summary`);
    return unwrapResponse(data);
  },
  listEquipment: (plantId?: string) =>
    getList<EquipmentRead>("/equipment", plantId ? { plant_id: plantId } : undefined),
  getEquipmentHealth: async (equipmentId: string) => {
    const { data } = await apiClient.get<ApiResponse<EquipmentHealthView>>(`/equipment/${equipmentId}/health`);
    return unwrapResponse(data);
  },
  listSensors: () => getList<SensorRead>("/sensors"),
  listSensorReadings: async (sensorId: string) => {
    const { data } = await apiClient.get<ApiResponse<SensorReadingRead[]>>(`/sensors/${sensorId}/readings`);
    return unwrapResponse(data);
  },
  listWorkers: () => getList<WorkerRead>("/workers"),
  getWorkerSafety: async (workerId: string) => {
    const { data } = await apiClient.get<ApiResponse<WorkerSafetyView>>(`/workers/${workerId}/safety`);
    return unwrapResponse(data);
  },
  listPermits: () => getList<PermitRead>("/permits"),
  getPermitConflicts: async (permitId: string) => {
    const { data } = await apiClient.get<ApiResponse<RiskEventRead[]>>(`/permits/${permitId}/conflicts`);
    return unwrapResponse(data);
  },
  listMaintenance: () => getList<MaintenanceRead>("/maintenance"),
  listOverdueMaintenance: async () => {
    const { data } = await apiClient.get<ApiResponse<MaintenanceRead[]>>("/maintenance/overdue");
    return unwrapResponse(data);
  },
  listIncidents: () => getList<IncidentRead>("/incidents"),
  getIncident: async (incidentId: string) => {
    const { data } = await apiClient.get<ApiResponse<IncidentRead>>(`/incidents/${incidentId}`);
    return unwrapResponse(data);
  },
  getIncidentReport: async (incidentId: string) => {
    const { data } = await apiClient.get<ApiResponse<IncidentReport>>(`/incidents/${incidentId}/report`);
    return unwrapResponse(data);
  },
  updateIncident: async (incidentId: string, payload: Partial<IncidentRead>) => {
    const { data } = await apiClient.put<ApiResponse<IncidentRead>>(`/incidents/${incidentId}`, payload);
    return unwrapResponse(data);
  }
};
