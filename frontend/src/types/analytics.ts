export interface AnalyticsOverview {
  total_incidents: number;
  open_incidents: number;
  critical_risks: number;
  open_permits: number;
  overdue_maintenance: number;
  equipment_health_average: number;
  incident_severity_breakdown: Record<string, number>;
  risk_severity_breakdown: Record<string, number>;
  equipment_status_breakdown: Record<string, number>;
  permit_status_breakdown: Record<string, number>;
  maintenance_status_breakdown: Record<string, number>;
  department_safety_scores: Record<string, number>;
}

