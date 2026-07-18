import type { RiskAnalysisResult } from "@/types/risk";

export interface SimulationRequest {
  scenario: string;
  zone_id?: string | null;
  worker_count?: number;
  hot_work_permit?: boolean;
  electrical_permit?: boolean;
  maintenance_running?: boolean;
  equipment_health?: number | null;
  weather_condition?: string | null;
}

export interface SimulationResponse {
  scenario: string;
  assumptions: Record<string, string>;
  result: RiskAnalysisResult;
}

