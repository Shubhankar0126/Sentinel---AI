from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Equipment, Incident, Maintenance, Permit, RiskEvent, Worker
from app.models.enums import IncidentStatus, MaintenanceStatus, PermitStatus, SeverityLevel
from app.schemas.analytics import AnalyticsOverview


class AnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def overview(self) -> AnalyticsOverview:
        total_incidents = await self.session.scalar(select(func.count()).select_from(Incident))
        open_incidents = await self.session.scalar(
            select(func.count()).select_from(Incident).where(Incident.status != IncidentStatus.CLOSED)
        )
        critical_risks = await self.session.scalar(
            select(func.count()).select_from(RiskEvent).where(RiskEvent.severity == SeverityLevel.CRITICAL)
        )
        open_permits = await self.session.scalar(
            select(func.count()).select_from(Permit).where(Permit.status == PermitStatus.OPEN)
        )
        overdue_maintenance = await self.session.scalar(
            select(func.count()).select_from(Maintenance).where(Maintenance.status == MaintenanceStatus.OVERDUE)
        )
        equipment_health_average = await self.session.scalar(select(func.avg(Equipment.health_score)).select_from(Equipment))

        incident_rows = (
            await self.session.execute(select(Incident.severity, func.count()).group_by(Incident.severity))
        ).all()
        risk_rows = (
            await self.session.execute(select(RiskEvent.severity, func.count()).group_by(RiskEvent.severity))
        ).all()
        equipment_rows = (
            await self.session.execute(select(Equipment.status, func.count()).group_by(Equipment.status))
        ).all()
        permit_rows = (await self.session.execute(select(Permit.status, func.count()).group_by(Permit.status))).all()
        maintenance_rows = (
            await self.session.execute(select(Maintenance.status, func.count()).group_by(Maintenance.status))
        ).all()
        worker_rows = (await self.session.execute(select(Worker.department, func.count()).group_by(Worker.department))).all()

        department_safety_scores = {
            str(department): round(100 - min(count * 1.5, 60), 2) for department, count in worker_rows
        }

        return AnalyticsOverview(
            total_incidents=int(total_incidents or 0),
            open_incidents=int(open_incidents or 0),
            critical_risks=int(critical_risks or 0),
            open_permits=int(open_permits or 0),
            overdue_maintenance=int(overdue_maintenance or 0),
            equipment_health_average=round(float(equipment_health_average or 0), 2),
            incident_severity_breakdown={severity.value: count for severity, count in incident_rows},
            risk_severity_breakdown={severity.value: count for severity, count in risk_rows},
            equipment_status_breakdown={status.value: count for status, count in equipment_rows},
            permit_status_breakdown={status.value: count for status, count in permit_rows},
            maintenance_status_breakdown={status.value: count for status, count in maintenance_rows},
            department_safety_scores=department_safety_scores,
        )
