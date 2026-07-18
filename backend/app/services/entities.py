from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Equipment, Incident, Maintenance, Permit, Recommendation, RiskEvent, WorkerLocation, Zone
from app.models.enums import MaintenanceStatus, PermitStatus, RecommendationStatus
from app.repositories.base import BaseRepository
from app.repositories.entities import (
    EquipmentRepository,
    IncidentRepository,
    MaintenanceRepository,
    NotificationRepository,
    PermitRepository,
    PlantRepository,
    RecommendationRepository,
    RiskEventRepository,
    SensorReadingRepository,
    SensorRepository,
    UserRepository,
    WorkerLocationRepository,
    WorkerRepository,
    ZoneRepository,
)


class BaseEntityService:
    repository_class = BaseRepository

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = self.repository_class(session)

    async def list(self, *, skip: int = 0, limit: int = 25, filters: dict[str, Any] | None = None):
        items = await self.repository.list(skip=skip, limit=limit, filters=filters)
        total = await self.repository.count(filters=filters)
        return items, total

    async def get(self, item_id: str):
        instance = await self.repository.get(item_id)
        if not instance:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")
        return instance

    async def create(self, payload):
        instance = await self.repository.create(payload.model_dump(exclude_none=True))
        await self.session.commit()
        return instance

    async def update(self, item_id: str, payload):
        instance = await self.get(item_id)
        updated = await self.repository.update(instance, payload.model_dump(exclude_none=True))
        await self.session.commit()
        return updated

    async def delete(self, item_id: str):
        instance = await self.get(item_id)
        await self.repository.delete(instance)
        await self.session.commit()
        return True


class UserService(BaseEntityService):
    repository_class = UserRepository


class PlantService(BaseEntityService):
    repository_class = PlantRepository


class ZoneService(BaseEntityService):
    repository_class = ZoneRepository

    async def summary(self, zone_id: str) -> dict[str, Any]:
        zone = await self.get(zone_id)
        equipment_count = await self.session.scalar(select(func.count()).select_from(Equipment).where(Equipment.zone_id == zone_id))
        worker_count = await self.session.scalar(
            select(func.count()).select_from(WorkerLocation).where(WorkerLocation.zone_id == zone_id)
        )
        incident_count = await self.session.scalar(select(func.count()).select_from(Incident).where(Incident.zone_id == zone_id))
        return {
            "zone_id": zone.id,
            "zone_name": zone.zone_name,
            "risk_level": zone.risk_level,
            "equipment_count": int(equipment_count or 0),
            "worker_count": int(worker_count or 0),
            "incident_count": int(incident_count or 0),
        }


class EquipmentService(BaseEntityService):
    repository_class = EquipmentRepository

    async def health_view(self, equipment_id: str) -> dict[str, Any]:
        equipment = await self.get(equipment_id)
        return {
            "equipment_id": equipment.id,
            "equipment_name": equipment.equipment_name,
            "health_score": equipment.health_score,
            "status": equipment.status,
            "last_maintenance": equipment.last_maintenance,
            "next_maintenance": equipment.next_maintenance,
            "predicted_failure_risk": round(max(0.0, 100 - equipment.health_score), 2),
        }


class SensorService(BaseEntityService):
    repository_class = SensorRepository


class SensorReadingService(BaseEntityService):
    repository_class = SensorReadingRepository

    async def latest(self, sensor_id: str, limit: int = 20):
        return await self.repository.latest_for_sensor(sensor_id, limit=limit)


class WorkerService(BaseEntityService):
    repository_class = WorkerRepository

    def __init__(self, session: AsyncSession):
        super().__init__(session)
        self.location_repository = WorkerLocationRepository(session)
        self.permit_repository = PermitRepository(session)

    async def safety_view(self, worker_id: str) -> dict[str, Any]:
        worker = await self.get(worker_id)
        location = await self.location_repository.latest_for_worker(worker_id)
        permits, _ = await PermitService(self.session).list(filters={"worker_id": worker_id, "status": PermitStatus.OPEN})
        return {
            "worker_id": worker.id,
            "worker_name": worker.name,
            "current_zone_id": location.zone_id if location else None,
            "current_location_timestamp": location.timestamp if location else None,
            "active_permits": len(permits),
            "safety_status": "attention" if permits else "normal",
        }


class WorkerLocationService(BaseEntityService):
    repository_class = WorkerLocationRepository


class PermitService(BaseEntityService):
    repository_class = PermitRepository

    async def conflicts(self, permit_id: str):
        permit = await self.get(permit_id)
        permits, _ = await self.list(filters={"zone_id": permit.zone_id, "status": PermitStatus.OPEN})
        conflicts = [
            item
            for item in permits
            if item.id != permit.id
            and item.start_time <= permit.end_time
            and permit.start_time <= item.end_time
        ]
        return conflicts


class MaintenanceService(BaseEntityService):
    repository_class = MaintenanceRepository

    async def overdue(self):
        now = datetime.now(UTC)
        stmt = select(Maintenance).where(
            Maintenance.scheduled_date < now,
            Maintenance.status.notin_([MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED]),
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()


class IncidentService(BaseEntityService):
    repository_class = IncidentRepository

    async def report(self, incident_id: str) -> dict[str, Any]:
        incident = await self.get(incident_id)
        return {
            "title": incident.title,
            "timeline": [{"reported_at": incident.reported_at.isoformat(), "status": incident.status.value}],
            "severity": incident.severity,
            "root_cause": incident.root_cause,
            "evidence": incident.evidence or [],
            "ai_summary": incident.ai_summary,
        }


class RiskEventService(BaseEntityService):
    repository_class = RiskEventRepository

    async def live(self):
        return await self.repository.live()

    async def history(self):
        return await self.repository.history()


class RecommendationService(BaseEntityService):
    repository_class = RecommendationRepository

    async def action_center(self):
        return await self.repository.pending()


class NotificationService(BaseEntityService):
    repository_class = NotificationRepository

    async def unread(self, user_id: str):
        return await self.repository.unread_for_user(user_id)
