import type { ApiResponse } from "@/types/api";
import type { ComplianceFramework, ComplianceReportRead } from "@/types/domain";
import { apiClient, unwrapResponse } from "@/services/api-client";

export interface ComplianceReportRequest {
  plant_id: string;
  framework: ComplianceFramework;
}

export const complianceService = {
  async list(plantId?: string) {
    const { data } = await apiClient.get<ApiResponse<ComplianceReportRead[]>>("/compliance", {
      params: plantId ? { plant_id: plantId } : undefined
    });
    return unwrapResponse(data);
  },
  async generate(payload: ComplianceReportRequest) {
    const { data } = await apiClient.post<ApiResponse<ComplianceReportRead>>("/compliance/generate", payload);
    return unwrapResponse(data);
  }
};

