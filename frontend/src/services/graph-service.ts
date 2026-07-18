import type { ApiResponse } from "@/types/api";
import type {
  GraphNeighborhoodResult,
  GraphNodeDetail,
  GraphPathResult,
  KnowledgeGraphOverview
} from "@/types/graph";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const graphService = {
  async getOverview(plantId?: string) {
    const { data } = await apiClient.get<ApiResponse<KnowledgeGraphOverview>>("/graph", {
      params: plantId ? { plant_id: plantId } : undefined
    });
    return unwrapResponse(data);
  },
  async getNode(nodeId: string, depth = 2, plantId?: string) {
    const { data } = await apiClient.get<ApiResponse<GraphNodeDetail>>("/graph/node", {
      params: { node_id: nodeId, depth, plant_id: plantId }
    });
    return unwrapResponse(data);
  },
  async getNeighbors(nodeId: string, depth = 2, plantId?: string) {
    const { data } = await apiClient.get<ApiResponse<GraphNeighborhoodResult>>("/graph/neighbors", {
      params: { node_id: nodeId, depth, plant_id: plantId }
    });
    return unwrapResponse(data);
  },
  async getPath(sourceId: string, targetId: string, plantId?: string) {
    const { data } = await apiClient.get<ApiResponse<GraphPathResult>>("/graph/path", {
      params: { source_id: sourceId, target_id: targetId, plant_id: plantId }
    });
    return unwrapResponse(data);
  }
};

