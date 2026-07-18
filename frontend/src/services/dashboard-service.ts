import type { ApiResponse } from "@/types/api";
import type { DashboardSummary } from "@/types/dashboard";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const dashboardService = {
  async getSummary() {
    const { data } = await apiClient.get<ApiResponse<DashboardSummary>>("/dashboard");
    return unwrapResponse(data);
  }
};

