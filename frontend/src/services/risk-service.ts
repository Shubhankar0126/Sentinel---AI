import type { ApiResponse } from "@/types/api";
import type { RiskEventRead } from "@/types/domain";
import type { RiskAnalysisRequest, RiskAnalysisResult } from "@/types/risk";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const riskService = {
  async analyze(payload: RiskAnalysisRequest) {
    const { data } = await apiClient.post<ApiResponse<RiskAnalysisResult>>("/risk/analyze", payload);
    return unwrapResponse(data);
  },
  async getHistory() {
    const { data } = await apiClient.get<ApiResponse<RiskEventRead[]>>("/risk/history");
    return unwrapResponse(data);
  },
  async getLive() {
    const { data } = await apiClient.get<ApiResponse<RiskEventRead[]>>("/risk/live");
    return unwrapResponse(data);
  }
};

