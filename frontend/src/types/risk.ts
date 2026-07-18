import type { PermitType, PriorityLevel, RecommendationRead, RiskEventRead, SeverityLevel } from "@/types/domain";

export interface SensorSignalInput {
  sensor_id?: string | null;
  sensor_name?: string | null;
  sensor_type?: string | null;
  value: number;
  unit?: string | null;
  timestamp?: string | null;
}

export interface RuleConditionResult {
  field: string;
  operator: string;
  expected: unknown;
  observed: unknown;
  matched: boolean;
  label?: string | null;
}

export interface RuleMatch {
  rule_id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  risk_category: string;
  score_delta: number;
  reason: string;
  regulations: string[];
  conditions: RuleConditionResult[];
}

export interface RecommendationAction {
  action: string;
  priority: PriorityLevel;
  rationale: string;
  target_type?: string | null;
  target_id?: string | null;
  source_rules: string[];
}

export interface HistoricalSimilarityMatch {
  source: string;
  reference_id: string;
  title: string;
  similarity_score: number;
  summary: string;
  evidence: string[];
}

export interface ExplainabilityReport {
  why: string;
  evidence: Array<Record<string, unknown>>;
  contributing_factors: string[];
  applicable_rules: RuleMatch[];
  historical_similarity: HistoricalSimilarityMatch[];
  recommended_actions: RecommendationAction[];
  impact_summary?: Record<string, unknown> | null;
}

export interface RiskAnalysisRequest {
  zone_id?: string | null;
  equipment_id?: string | null;
  gas_level?: number | null;
  temperature?: number | null;
  pressure?: number | null;
  humidity?: number | null;
  vibration?: number | null;
  equipment_health?: number | null;
  permit_type?: PermitType | null;
  worker_count?: number;
  worker_present?: boolean;
  worker_ids?: string[];
  maintenance_running?: boolean;
  maintenance_overdue?: boolean;
  weather_condition?: string | null;
  weather_temperature_c?: number | null;
  weather_humidity?: number | null;
  wind_kph?: number | null;
  historical_similarity?: number | null;
  shift?: string | null;
  time_of_day?: string | null;
  sensor_readings?: SensorSignalInput[];
  persist_result?: boolean;
}

export interface RiskAnalysisResult {
  risk_score: number;
  severity: SeverityLevel;
  confidence: number;
  risk_category: string;
  reason: string;
  root_cause: string;
  recommendation: string;
  expected_consequence: string;
  regulations: string[];
  evidence: Array<Record<string, unknown>>;
  applicable_rules: RuleMatch[];
  historical_similarity: HistoricalSimilarityMatch[];
  recommended_actions: RecommendationAction[];
  explainability: ExplainabilityReport;
  graph_insights?: Record<string, unknown> | null;
  recommendations_created: RecommendationRead[];
  risk_event?: RiskEventRead | null;
}

