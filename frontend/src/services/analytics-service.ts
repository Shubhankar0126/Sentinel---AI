import type { ApiResponse } from "@/types/api";
import type { AnalyticsOverview } from "@/types/analytics";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const analyticsService = {
  async getOverview() {
    const { data } = await apiClient.get<ApiResponse<AnalyticsOverview>>("/analytics/overview");
    return unwrapResponse(data);
  }
};

