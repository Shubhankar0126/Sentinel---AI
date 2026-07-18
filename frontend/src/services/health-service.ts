import type { ApiResponse, HealthPayload } from "@/types/api";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const healthService = {
  async getHealth() {
    const { data } = await apiClient.get<ApiResponse<HealthPayload>>("/health");
    return unwrapResponse(data);
  },
  async getVersion() {
    const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>("/version");
    return unwrapResponse(data);
  }
};

