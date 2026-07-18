from app.schemas.common import ORMModel


class AnalyticsOverview(ORMModel):
    total_incidents: int
    open_incidents: int
    critical_risks: int
    open_permits: int
    overdue_maintenance: int
    equipment_health_average: float
    incident_severity_breakdown: dict[str, int]
    risk_severity_breakdown: dict[str, int]
    equipment_status_breakdown: dict[str, int]
    permit_status_breakdown: dict[str, int]
    maintenance_status_breakdown: dict[str, int]
    department_safety_scores: dict[str, float]
