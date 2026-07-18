import type { ApiListResult, ApiResponse } from "@/types/api";
import type { RecommendationRead } from "@/types/domain";
import { apiClient, unwrapListResponse, unwrapResponse } from "@/services/api-client";

export interface ActionCreatePayload {
  risk_event_id?: string | null;
  action: string;
  priority?: "low" | "medium" | "high" | "critical";
  assigned_to?: string | null;
  status?: "open" | "in_progress" | "completed" | "dismissed";
  completed_at?: string | null;
}

export interface ActionUpdatePayload {
  risk_event_id?: string | null;
  action?: string | null;
  priority?: "low" | "medium" | "high" | "critical" | null;
  assigned_to?: string | null;
  status?: "open" | "in_progress" | "completed" | "dismissed" | null;
  completed_at?: string | null;
}

export const actionService = {
  async list(params?: { skip?: number; limit?: number }) {
    const { data } = await apiClient.get<ApiResponse<RecommendationRead[]>>("/actions", { params });
    return unwrapListResponse<RecommendationRead>(data) satisfies ApiListResult<RecommendationRead>;
  },
  async pending() {
    const { data } = await apiClient.get<ApiResponse<RecommendationRead[]>>("/actions/pending");
    return unwrapResponse(data);
  },
  async create(payload: ActionCreatePayload) {
    const { data } = await apiClient.post<ApiResponse<RecommendationRead>>("/actions", payload);
    return unwrapResponse(data);
  },
  async update(actionId: string, payload: ActionUpdatePayload) {
    const { data } = await apiClient.put<ApiResponse<RecommendationRead>>(`/actions/${actionId}`, payload);
    return unwrapResponse(data);
  }
};
