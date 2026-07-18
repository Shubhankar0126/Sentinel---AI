import type {
  IncidentRead,
  NotificationRead,
  RecommendationRead,
  RiskEventRead
} from "@/types/domain";

export interface DashboardSummary {
  plant_health: number;
  active_incidents: number;
  critical_risks: number;
  open_permits: number;
  workers_present: number;
  equipment_health_average: number;
  ai_confidence_average: number;
  recent_recommendations: RecommendationRead[];
  live_risks: RiskEventRead[];
  alerts: NotificationRead[];
  recent_incidents: IncidentRead[];
}

