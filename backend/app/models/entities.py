from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import (
    ComplianceFramework,
    EquipmentStatus,
    IncidentStatus,
    IncidentType,
    LifecycleStatus,
    MaintenanceStatus,
    MaintenanceType,
    NotificationType,
    PermitStatus,
    PermitType,
    PriorityLevel,
    RecommendationStatus,
    RiskStatus,
    SensorStatus,
    SeverityLevel,
    UserRole,
)
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, native_enum=False), default=UserRole.VIEWER)
    plant_id: Mapped[str | None] = mapped_column(ForeignKey("plants.id"), nullable=True, index=True)
    status: Mapped[LifecycleStatus] = mapped_column(
        Enum(LifecycleStatus, native_enum=False),
        default=LifecycleStatus.ACTIVE,
        index=True,
    )

    plant: Mapped["Plant | None"] = relationship(back_populates="users")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")
    chat_history: Mapped[list["ChatHistory"]] = relationship(back_populates="user")


class Plant(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "plants"

    name: Mapped[str] = mapped_column(String(255), index=True)
    location: Mapped[str] = mapped_column(String(255))
    industry: Mapped[str] = mapped_column(String(128))
    status: Mapped[LifecycleStatus] = mapped_column(
        Enum(LifecycleStatus, native_enum=False),
        default=LifecycleStatus.ACTIVE,
        index=True,
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    users: Mapped[list[User]] = relationship(back_populates="plant")
    zones: Mapped[list["Zone"]] = relationship(back_populates="plant")
    equipment: Mapped[list["Equipment"]] = relationship(back_populates="plant")
    compliance_reports: Mapped[list["ComplianceReport"]] = relationship(back_populates="plant")
    documents: Mapped[list["Document"]] = relationship(back_populates="plant")


class Zone(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "zones"

    plant_id: Mapped[str] = mapped_column(ForeignKey("plants.id"), index=True)
    zone_name: Mapped[str] = mapped_column(String(255))
    risk_level: Mapped[SeverityLevel] = mapped_column(
        Enum(SeverityLevel, native_enum=False),
        default=SeverityLevel.SAFE,
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    polygon: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    plant: Mapped[Plant] = relationship(back_populates="zones")
    equipment: Mapped[list["Equipment"]] = relationship(back_populates="zone")
    sensors: Mapped[list["Sensor"]] = relationship(back_populates="zone")
    worker_locations: Mapped[list["WorkerLocation"]] = relationship(back_populates="zone")
    permits: Mapped[list["Permit"]] = relationship(back_populates="zone")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="zone")
    risk_events: Mapped[list["RiskEvent"]] = relationship(back_populates="zone")


class Equipment(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "equipment"

    plant_id: Mapped[str] = mapped_column(ForeignKey("plants.id"), index=True)
    zone_id: Mapped[str | None] = mapped_column(ForeignKey("zones.id"), nullable=True, index=True)
    equipment_name: Mapped[str] = mapped_column(String(255))
    equipment_type: Mapped[str] = mapped_column(String(128))
    manufacturer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    health_score: Mapped[float] = mapped_column(Float, default=100.0)
    status: Mapped[EquipmentStatus] = mapped_column(
        Enum(EquipmentStatus, native_enum=False),
        default=EquipmentStatus.HEALTHY,
        index=True,
    )
    last_maintenance: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_maintenance: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    source_dataset: Mapped[str | None] = mapped_column(String(64), nullable=True)

    plant: Mapped[Plant] = relationship(back_populates="equipment")
    zone: Mapped["Zone | None"] = relationship(back_populates="equipment")
    sensors: Mapped[list["Sensor"]] = relationship(back_populates="equipment")
    maintenance_records: Mapped[list["Maintenance"]] = relationship(back_populates="equipment")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="equipment")
    permits: Mapped[list["Permit"]] = relationship(back_populates="equipment")


class Sensor(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "sensors"

    equipment_id: Mapped[str | None] = mapped_column(ForeignKey("equipment.id"), nullable=True, index=True)
    zone_id: Mapped[str | None] = mapped_column(ForeignKey("zones.id"), nullable=True, index=True)
    sensor_name: Mapped[str] = mapped_column(String(255))
    sensor_type: Mapped[str] = mapped_column(String(128), index=True)
    unit: Mapped[str | None] = mapped_column(String(64), nullable=True)
    min_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[SensorStatus] = mapped_column(
        Enum(SensorStatus, native_enum=False),
        default=SensorStatus.ACTIVE,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)

    equipment: Mapped["Equipment | None"] = relationship(back_populates="sensors")
    zone: Mapped["Zone | None"] = relationship(back_populates="sensors")
    readings: Mapped[list["SensorReading"]] = relationship(back_populates="sensor")


class SensorReading(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "sensor_readings"

    sensor_id: Mapped[str] = mapped_column(ForeignKey("sensors.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    value: Mapped[float] = mapped_column(Float)
    quality: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="ok", index=True)
    scenario: Mapped[str | None] = mapped_column(String(64), nullable=True)

    sensor: Mapped[Sensor] = relationship(back_populates="readings")


class Worker(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "workers"

    worker_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    department: Mapped[str] = mapped_column(String(128))
    designation: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[LifecycleStatus] = mapped_column(
        Enum(LifecycleStatus, native_enum=False),
        default=LifecycleStatus.ACTIVE,
        index=True,
    )

    locations: Mapped[list["WorkerLocation"]] = relationship(back_populates="worker")
    permits: Mapped[list["Permit"]] = relationship(back_populates="worker")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="worker")


class WorkerLocation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "worker_locations"

    worker_id: Mapped[str] = mapped_column(ForeignKey("workers.id"), index=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("zones.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    worker: Mapped[Worker] = relationship(back_populates="locations")
    zone: Mapped[Zone] = relationship(back_populates="worker_locations")


class Permit(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "permits"

    permit_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    permit_type: Mapped[PermitType] = mapped_column(Enum(PermitType, native_enum=False))
    worker_id: Mapped[str | None] = mapped_column(ForeignKey("workers.id"), nullable=True, index=True)
    zone_id: Mapped[str | None] = mapped_column(ForeignKey("zones.id"), nullable=True, index=True)
    equipment_id: Mapped[str | None] = mapped_column(ForeignKey("equipment.id"), nullable=True, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[PermitStatus] = mapped_column(
        Enum(PermitStatus, native_enum=False),
        default=PermitStatus.DRAFT,
        index=True,
    )
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    worker: Mapped["Worker | None"] = relationship(back_populates="permits")
    zone: Mapped["Zone | None"] = relationship(back_populates="permits")
    equipment: Mapped["Equipment | None"] = relationship(back_populates="permits")


class Maintenance(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "maintenance"

    equipment_id: Mapped[str] = mapped_column(ForeignKey("equipment.id"), index=True)
    maintenance_type: Mapped[MaintenanceType] = mapped_column(
        Enum(MaintenanceType, native_enum=False),
        default=MaintenanceType.PREVENTIVE,
    )
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus, native_enum=False),
        default=MaintenanceStatus.SCHEDULED,
        index=True,
    )
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scheduled_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    completed_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    equipment: Mapped[Equipment] = relationship(back_populates="maintenance_records")


class Incident(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "incidents"

    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[SeverityLevel] = mapped_column(
        Enum(SeverityLevel, native_enum=False),
        default=SeverityLevel.MODERATE,
    )
    zone_id: Mapped[str | None] = mapped_column(ForeignKey("zones.id"), nullable=True, index=True)
    equipment_id: Mapped[str | None] = mapped_column(ForeignKey("equipment.id"), nullable=True, index=True)
    worker_id: Mapped[str | None] = mapped_column(ForeignKey("workers.id"), nullable=True, index=True)
    incident_type: Mapped[IncidentType] = mapped_column(
        Enum(IncidentType, native_enum=False),
        default=IncidentType.SAFETY_INCIDENT,
        index=True,
    )
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus, native_enum=False),
        default=IncidentStatus.OPEN,
        index=True,
    )
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_dataset: Mapped[str | None] = mapped_column(String(64), nullable=True)

    zone: Mapped["Zone | None"] = relationship(back_populates="incidents")
    equipment: Mapped["Equipment | None"] = relationship(back_populates="incidents")
    worker: Mapped["Worker | None"] = relationship(back_populates="incidents")


class RiskEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "risk_events"

    zone_id: Mapped[str | None] = mapped_column(ForeignKey("zones.id"), nullable=True, index=True)
    risk_score: Mapped[float] = mapped_column(Float, index=True)
    severity: Mapped[SeverityLevel] = mapped_column(Enum(SeverityLevel, native_enum=False))
    confidence: Mapped[float] = mapped_column(Float)
    risk_category: Mapped[str] = mapped_column(String(128))
    reason: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(Text)
    expected_consequence: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RiskStatus] = mapped_column(
        Enum(RiskStatus, native_enum=False),
        default=RiskStatus.OPEN,
        index=True,
    )
    evidence: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    affected_assets: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    affected_workers: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)

    zone: Mapped["Zone | None"] = relationship(back_populates="risk_events")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="risk_event")


class Recommendation(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "recommendations"

    risk_event_id: Mapped[str | None] = mapped_column(ForeignKey("risk_events.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(Text)
    priority: Mapped[PriorityLevel] = mapped_column(
        Enum(PriorityLevel, native_enum=False),
        default=PriorityLevel.MEDIUM,
    )
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus, native_enum=False),
        default=RecommendationStatus.OPEN,
        index=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    risk_event: Mapped["RiskEvent | None"] = relationship(back_populates="recommendations")


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "notifications"

    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, native_enum=False),
        default=NotificationType.INFO,
    )
    priority: Mapped[PriorityLevel] = mapped_column(
        Enum(PriorityLevel, native_enum=False),
        default=PriorityLevel.LOW,
    )
    read: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User | None"] = relationship(back_populates="notifications")


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(255))
    resource: Mapped[str] = mapped_column(String(255))
    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    user: Mapped["User | None"] = relationship(back_populates="audit_logs")


class ComplianceReport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "compliance_reports"

    plant_id: Mapped[str] = mapped_column(ForeignKey("plants.id"), index=True)
    framework: Mapped[ComplianceFramework] = mapped_column(
        Enum(ComplianceFramework, native_enum=False),
        default=ComplianceFramework.OSHA,
    )
    score: Mapped[float] = mapped_column(Float)
    violations: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    plant: Mapped[Plant] = relationship(back_populates="compliance_reports")


class Document(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"

    plant_id: Mapped[str | None] = mapped_column(ForeignKey("plants.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    document_type: Mapped[str] = mapped_column(String(128))
    storage_path: Mapped[str] = mapped_column(String(512))
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

    plant: Mapped["Plant | None"] = relationship(back_populates="documents")


class ChatHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "chat_history"

    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    question: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    citations: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    user: Mapped["User | None"] = relationship(back_populates="chat_history")


__all__ = [
    "AuditLog",
    "ChatHistory",
    "ComplianceReport",
    "Document",
    "Equipment",
    "Incident",
    "Maintenance",
    "Notification",
    "Permit",
    "Plant",
    "Recommendation",
    "RiskEvent",
    "Sensor",
    "SensorReading",
    "User",
    "Worker",
    "WorkerLocation",
    "Zone",
]
