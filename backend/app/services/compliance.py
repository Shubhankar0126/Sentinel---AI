from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.entities import ComplianceReportRepository
from app.schemas.compliance import ComplianceReportRequest
from app.schemas.domain import ComplianceReportCreate
from app.services.analytics import AnalyticsService
from app.services.risk import RiskService


class ComplianceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.report_repository = ComplianceReportRepository(session)
        self.analytics_service = AnalyticsService(session)
        self.risk_service = RiskService(session)

    async def generate(self, payload: ComplianceReportRequest):
        analytics = await self.analytics_service.overview()
        live_risks = await self.risk_service.live()
        critical_open = len([risk for risk in live_risks if risk.severity.value == "critical"])
        score = max(0.0, 100 - (analytics.open_incidents * 2) - (critical_open * 8) - (analytics.overdue_maintenance * 1.5))
        violations = []
        if critical_open:
            violations.append({"rule": payload.framework.value, "issue": "Critical risks remain open."})
        if analytics.overdue_maintenance:
            violations.append({"rule": payload.framework.value, "issue": "Overdue maintenance work exists."})
        recommendations = [
            {"action": "Close critical risks before shift handover."},
            {"action": "Review overdue maintenance and permit controls."},
        ]
        report = await self.report_repository.create(
            ComplianceReportCreate(
                plant_id=payload.plant_id,
                framework=payload.framework,
                score=round(score, 2),
                violations=violations,
                recommendations=recommendations,
                generated_at=datetime.now(UTC),
            ).model_dump()
        )
        await self.session.commit()
        return report

    async def list(self, *, plant_id: str | None = None, skip: int = 0, limit: int = 25):
        return await self.report_repository.list(skip=skip, limit=limit, filters={"plant_id": plant_id} if plant_id else None)
