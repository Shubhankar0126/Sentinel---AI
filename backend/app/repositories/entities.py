from collections.abc import Sequence

from sqlalchemy import delete, desc, select

from app.models.entities import (
    ChatHistory,
    ComplianceReport,
    Document,
    Equipment,
    Incident,
    Maintenance,
    Notification,
    Permit,
    Plant,
    Recommendation,
    RiskEvent,
    Sensor,
    SensorReading,
    User,
    Worker,
    WorkerLocation,
    Zone,
)
from app.models.enums import PermitStatus, RecommendationStatus, RiskStatus
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session):
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        stmt = self._apply_filters(select(User).where(User.email == email))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class PlantRepository(BaseRepository[Plant]):
    def __init__(self, session):
        super().__init__(session, Plant)


class ZoneRepository(BaseRepository[Zone]):
    def __init__(self, session):
        super().__init__(session, Zone)


class EquipmentRepository(BaseRepository[Equipment]):
    def __init__(self, session):
        super().__init__(session, Equipment)


class SensorRepository(BaseRepository[Sensor]):
    def __init__(self, session):
        super().__init__(session, Sensor)


class SensorReadingRepository(BaseRepository[SensorReading]):
    def __init__(self, session):
        super().__init__(session, SensorReading)

    async def latest_for_sensor(self, sensor_id: str, limit: int = 20) -> Sequence[SensorReading]:
        stmt = (
            select(SensorReading)
            .where(SensorReading.sensor_id == sensor_id)
            .order_by(desc(SensorReading.timestamp))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()


class WorkerRepository(BaseRepository[Worker]):
    def __init__(self, session):
        super().__init__(session, Worker)


class WorkerLocationRepository(BaseRepository[WorkerLocation]):
    def __init__(self, session):
        super().__init__(session, WorkerLocation)

    async def latest_for_worker(self, worker_id: str) -> WorkerLocation | None:
        stmt = (
            select(WorkerLocation)
            .where(WorkerLocation.worker_id == worker_id)
            .order_by(desc(WorkerLocation.timestamp))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class PermitRepository(BaseRepository[Permit]):
    def __init__(self, session):
        super().__init__(session, Permit)

    async def open_permits(self) -> Sequence[Permit]:
        return await self.list(filters={"status": PermitStatus.OPEN})


class MaintenanceRepository(BaseRepository[Maintenance]):
    def __init__(self, session):
        super().__init__(session, Maintenance)


class IncidentRepository(BaseRepository[Incident]):
    def __init__(self, session):
        super().__init__(session, Incident)

    async def recent(self, limit: int = 10) -> Sequence[Incident]:
        stmt = self._apply_filters(select(Incident)).order_by(desc(Incident.reported_at)).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def search_context(self, text: str, limit: int = 5) -> Sequence[Incident]:
        pattern = f"%{text}%"
        stmt = self._apply_filters(
            select(Incident).where((Incident.title.ilike(pattern)) | (Incident.description.ilike(pattern)))
        ).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class RiskEventRepository(BaseRepository[RiskEvent]):
    def __init__(self, session):
        super().__init__(session, RiskEvent)

    async def live(self, limit: int = 10) -> Sequence[RiskEvent]:
        stmt = self._apply_filters(
            select(RiskEvent).where(RiskEvent.status.in_([RiskStatus.OPEN, RiskStatus.ACKNOWLEDGED]))
        ).order_by(desc(RiskEvent.created_at)).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def history(self, limit: int = 50) -> Sequence[RiskEvent]:
        stmt = self._apply_filters(select(RiskEvent)).order_by(desc(RiskEvent.created_at)).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class RecommendationRepository(BaseRepository[Recommendation]):
    def __init__(self, session):
        super().__init__(session, Recommendation)

    async def pending(self, limit: int = 20) -> Sequence[Recommendation]:
        stmt = self._apply_filters(
            select(Recommendation).where(
                Recommendation.status.in_([RecommendationStatus.OPEN, RecommendationStatus.IN_PROGRESS])
            )
        ).order_by(desc(Recommendation.created_at)).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, session):
        super().__init__(session, Notification)

    async def unread_for_user(self, user_id: str, limit: int = 20) -> Sequence[Notification]:
        stmt = self._apply_filters(
            select(Notification).where(Notification.user_id == user_id, Notification.read.is_(False))
        ).order_by(desc(Notification.created_at)).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class ComplianceReportRepository(BaseRepository[ComplianceReport]):
    def __init__(self, session):
        super().__init__(session, ComplianceReport)

    async def latest_for_plant(self, plant_id: str) -> ComplianceReport | None:
        stmt = (
            select(ComplianceReport)
            .where(ComplianceReport.plant_id == plant_id)
            .order_by(desc(ComplianceReport.generated_at))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, session):
        super().__init__(session, Document)

    async def get_by_storage_path(self, storage_path: str) -> Document | None:
        stmt = self._apply_filters(select(Document).where(Document.storage_path == storage_path))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class ChatHistoryRepository(BaseRepository[ChatHistory]):
    def __init__(self, session):
        super().__init__(session, ChatHistory)

    async def for_user(self, user_id: str, limit: int = 20) -> Sequence[ChatHistory]:
        stmt = (
            select(ChatHistory)
            .where(ChatHistory.user_id == user_id)
            .order_by(desc(ChatHistory.timestamp))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def clear_for_user(self, user_id: str) -> int:
        stmt = delete(ChatHistory).where(ChatHistory.user_id == user_id)
        result = await self.session.execute(stmt)
        return int(result.rowcount or 0)
