from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Equipment, Incident, Permit, WorkerLocation
from app.models.enums import IncidentStatus, PermitStatus, SeverityLevel
from app.repositories.entities import IncidentRepository, NotificationRepository, RecommendationRepository, RiskEventRepository
from app.schemas.dashboard import DashboardSummary


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_repository = IncidentRepository(session)
        self.risk_repository = RiskEventRepository(session)
        self.recommendation_repository = RecommendationRepository(session)
        self.notification_repository = NotificationRepository(session)

    async def summary(self, user_id: str | None = None) -> DashboardSummary:
        plant_health = await self.session.scalar(select(func.avg(Equipment.health_score)).select_from(Equipment))
        active_incidents = await self.session.scalar(
            select(func.count()).select_from(Incident).where(Incident.status != IncidentStatus.CLOSED)
        )
        critical_risks = await self.session.scalar(
            select(func.count()).select_from(self.risk_repository.model).where(
                self.risk_repository.model.severity == SeverityLevel.CRITICAL
            )
        )
        open_permits = await self.session.scalar(
            select(func.count()).select_from(Permit).where(Permit.status == PermitStatus.OPEN)
        )
        workers_present = await self.session.scalar(select(func.count()).select_from(WorkerLocation))
        ai_confidence_average = await self.session.scalar(select(func.avg(self.risk_repository.model.confidence)))
        live_risks = await self.risk_repository.live()
        recent_recommendations = await self.recommendation_repository.pending(limit=5)
        recent_incidents = await self.incident_repository.recent(limit=5)
        alerts = (
            await self.notification_repository.unread_for_user(user_id, limit=5)
            if user_id
            else await self.notification_repository.list(limit=5)
        )

        return DashboardSummary(
            plant_health=round(float(plant_health or 0), 2),
            active_incidents=int(active_incidents or 0),
            critical_risks=int(critical_risks or 0),
            open_permits=int(open_permits or 0),
            workers_present=int(workers_present or 0),
            equipment_health_average=round(float(plant_health or 0), 2),
            ai_confidence_average=round(float(ai_confidence_average or 0), 2),
            recent_recommendations=recent_recommendations,
            live_risks=list(live_risks),
            alerts=list(alerts),
            recent_incidents=list(recent_incidents),
        )
