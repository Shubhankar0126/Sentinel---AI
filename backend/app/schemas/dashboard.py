from app.schemas.domain import IncidentRead, RecommendationRead, RiskEventRead
from app.schemas.domain import NotificationRead

from app.schemas.common import ORMModel


class DashboardSummary(ORMModel):
    plant_health: float
    active_incidents: int
    critical_risks: int
    open_permits: int
    workers_present: int
    equipment_health_average: float
    ai_confidence_average: float
    recent_recommendations: list[RecommendationRead]
    live_risks: list[RiskEventRead]
    alerts: list[NotificationRead]
    recent_incidents: list[IncidentRead]
