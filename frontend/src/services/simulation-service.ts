import type { ApiResponse } from "@/types/api";
import type { SimulationRequest, SimulationResponse } from "@/types/simulation";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const simulationService = {
  async scenarios() {
    const { data } = await apiClient.get<ApiResponse<string[]>>("/simulation/scenarios");
    return unwrapResponse(data);
  },
  async start(payload: SimulationRequest) {
    const { data } = await apiClient.post<ApiResponse<SimulationResponse>>("/simulation/start", payload);
    return unwrapResponse(data);
  }
};

