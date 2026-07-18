from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

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
from app.schemas.common import ORMModel, TimestampedModel


class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole = UserRole.VIEWER
    plant_id: str | None = None
    status: LifecycleStatus = LifecycleStatus.ACTIVE


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: UserRole | None = None
    plant_id: str | None = None
    status: LifecycleStatus | None = None
    password: str | None = None


class UserRead(TimestampedModel):
    name: str
    email: str
    role: UserRole
    plant_id: str | None = None
    status: LifecycleStatus


class PlantBase(BaseModel):
    name: str
    location: str
    industry: str
    status: LifecycleStatus = LifecycleStatus.ACTIVE
    latitude: float | None = None
    longitude: float | None = None


class PlantCreate(PlantBase):
    pass


class PlantUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    industry: str | None = None
    status: LifecycleStatus | None = None
    latitude: float | None = None
    longitude: float | None = None


class PlantRead(TimestampedModel):
    name: str
    location: str
    industry: str
    status: LifecycleStatus
    latitude: float | None = None
    longitude: float | None = None


class ZoneBase(BaseModel):
    plant_id: str
    zone_name: str
    risk_level: SeverityLevel = SeverityLevel.SAFE
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[dict[str, Any]] | None = None
    description: str | None = None


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    plant_id: str | None = None
    zone_name: str | None = None
    risk_level: SeverityLevel | None = None
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[dict[str, Any]] | None = None
    description: str | None = None


class ZoneRead(TimestampedModel):
    plant_id: str
    zone_name: str
    risk_level: SeverityLevel
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[dict[str, Any]] | None = None
    description: str | None = None


class EquipmentBase(BaseModel):
    plant_id: str
    zone_id: str | None = None
    equipment_name: str
    equipment_type: str
    manufacturer: str | None = None
    health_score: float = 100.0
    status: EquipmentStatus = EquipmentStatus.HEALTHY
    last_maintenance: datetime | None = None
    next_maintenance: datetime | None = None
    external_id: str | None = None
    source_dataset: str | None = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    plant_id: str | None = None
    zone_id: str | None = None
    equipment_name: str | None = None
    equipment_type: str | None = None
    manufacturer: str | None = None
    health_score: float | None = None
    status: EquipmentStatus | None = None
    last_maintenance: datetime | None = None
    next_maintenance: datetime | None = None
    external_id: str | None = None
    source_dataset: str | None = None


class EquipmentRead(TimestampedModel):
    plant_id: str
    zone_id: str | None = None
    equipment_name: str
    equipment_type: str
    manufacturer: str | None = None
    health_score: float
    status: EquipmentStatus
    last_maintenance: datetime | None = None
    next_maintenance: datetime | None = None
    external_id: str | None = None
    source_dataset: str | None = None


class SensorBase(BaseModel):
    equipment_id: str | None = None
    zone_id: str | None = None
    sensor_name: str
    sensor_type: str
    unit: str | None = None
    min_value: float | None = None
    max_value: float | None = None
    status: SensorStatus = SensorStatus.ACTIVE
    external_id: str | None = None


class SensorCreate(SensorBase):
    pass


class SensorUpdate(BaseModel):
    equipment_id: str | None = None
    zone_id: str | None = None
    sensor_name: str | None = None
    sensor_type: str | None = None
    unit: str | None = None
    min_value: float | None = None
    max_value: float | None = None
    status: SensorStatus | None = None
    external_id: str | None = None


class SensorRead(TimestampedModel):
    equipment_id: str | None = None
    zone_id: str | None = None
    sensor_name: str
    sensor_type: str
    unit: str | None = None
    min_value: float | None = None
    max_value: float | None = None
    status: SensorStatus
    external_id: str | None = None


class SensorReadingBase(BaseModel):
    sensor_id: str
    timestamp: datetime
    value: float
    quality: str | None = None
    status: str = "ok"
    scenario: str | None = None


class SensorReadingCreate(SensorReadingBase):
    pass


class SensorReadingUpdate(BaseModel):
    timestamp: datetime | None = None
    value: float | None = None
    quality: str | None = None
    status: str | None = None
    scenario: str | None = None


class SensorReadingRead(TimestampedModel):
    sensor_id: str
    timestamp: datetime
    value: float
    quality: str | None = None
    status: str
    scenario: str | None = None


class WorkerBase(BaseModel):
    worker_code: str
    name: str
    department: str
    designation: str
    phone: str | None = None
    status: LifecycleStatus = LifecycleStatus.ACTIVE


class WorkerCreate(WorkerBase):
    pass


class WorkerUpdate(BaseModel):
    worker_code: str | None = None
    name: str | None = None
    department: str | None = None
    designation: str | None = None
    phone: str | None = None
    status: LifecycleStatus | None = None


class WorkerRead(TimestampedModel):
    worker_code: str
    name: str
    department: str
    designation: str
    phone: str | None = None
    status: LifecycleStatus


class WorkerLocationBase(BaseModel):
    worker_id: str
    zone_id: str
    timestamp: datetime
    latitude: float | None = None
    longitude: float | None = None


class WorkerLocationCreate(WorkerLocationBase):
    pass


class WorkerLocationUpdate(BaseModel):
    zone_id: str | None = None
    timestamp: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None


class WorkerLocationRead(TimestampedModel):
    worker_id: str
    zone_id: str
    timestamp: datetime
    latitude: float | None = None
    longitude: float | None = None


class PermitBase(BaseModel):
    permit_number: str
    permit_type: PermitType
    worker_id: str | None = None
    zone_id: str | None = None
    equipment_id: str | None = None
    start_time: datetime
    end_time: datetime
    status: PermitStatus = PermitStatus.DRAFT
    approved_by: str | None = None


class PermitCreate(PermitBase):
    pass


class PermitUpdate(BaseModel):
    permit_number: str | None = None
    permit_type: PermitType | None = None
    worker_id: str | None = None
    zone_id: str | None = None
    equipment_id: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: PermitStatus | None = None
    approved_by: str | None = None


class PermitRead(TimestampedModel):
    permit_number: str
    permit_type: PermitType
    worker_id: str | None = None
    zone_id: str | None = None
    equipment_id: str | None = None
    start_time: datetime
    end_time: datetime
    status: PermitStatus
    approved_by: str | None = None


class MaintenanceBase(BaseModel):
    equipment_id: str
    maintenance_type: MaintenanceType = MaintenanceType.PREVENTIVE
    status: MaintenanceStatus = MaintenanceStatus.SCHEDULED
    assigned_to: str | None = None
    scheduled_date: datetime
    completed_date: datetime | None = None
    remarks: str | None = None


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceUpdate(BaseModel):
    equipment_id: str | None = None
    maintenance_type: MaintenanceType | None = None
    status: MaintenanceStatus | None = None
    assigned_to: str | None = None
    scheduled_date: datetime | None = None
    completed_date: datetime | None = None
    remarks: str | None = None


class MaintenanceRead(TimestampedModel):
    equipment_id: str
    maintenance_type: MaintenanceType
    status: MaintenanceStatus
    assigned_to: str | None = None
    scheduled_date: datetime
    completed_date: datetime | None = None
    remarks: str | None = None


class IncidentBase(BaseModel):
    title: str
    description: str
    severity: SeverityLevel = SeverityLevel.MODERATE
    zone_id: str | None = None
    equipment_id: str | None = None
    worker_id: str | None = None
    incident_type: IncidentType = IncidentType.SAFETY_INCIDENT
    root_cause: str | None = None
    status: IncidentStatus = IncidentStatus.OPEN
    reported_at: datetime
    closed_at: datetime | None = None
    evidence: list[dict[str, Any]] | None = None
    ai_summary: str | None = None
    source_dataset: str | None = None


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: SeverityLevel | None = None
    zone_id: str | None = None
    equipment_id: str | None = None
    worker_id: str | None = None
    incident_type: IncidentType | None = None
    root_cause: str | None = None
    status: IncidentStatus | None = None
    reported_at: datetime | None = None
    closed_at: datetime | None = None
    evidence: list[dict[str, Any]] | None = None
    ai_summary: str | None = None
    source_dataset: str | None = None


class IncidentRead(TimestampedModel):
    title: str
    description: str
    severity: SeverityLevel
    zone_id: str | None = None
    equipment_id: str | None = None
    worker_id: str | None = None
    incident_type: IncidentType
    root_cause: str | None = None
    status: IncidentStatus
    reported_at: datetime
    closed_at: datetime | None = None
    evidence: list[dict[str, Any]] | None = None
    ai_summary: str | None = None
    source_dataset: str | None = None


class RiskEventBase(BaseModel):
    zone_id: str | None = None
    risk_score: float
    severity: SeverityLevel
    confidence: float
    risk_category: str
    reason: str
    recommendation: str
    expected_consequence: str | None = None
    status: RiskStatus = RiskStatus.OPEN
    evidence: list[dict[str, Any]] | None = None
    affected_assets: list[dict[str, Any]] | None = None
    affected_workers: list[dict[str, Any]] | None = None


class RiskEventCreate(RiskEventBase):
    pass


class RiskEventUpdate(BaseModel):
    zone_id: str | None = None
    risk_score: float | None = None
    severity: SeverityLevel | None = None
    confidence: float | None = None
    risk_category: str | None = None
    reason: str | None = None
    recommendation: str | None = None
    expected_consequence: str | None = None
    status: RiskStatus | None = None
    evidence: list[dict[str, Any]] | None = None
    affected_assets: list[dict[str, Any]] | None = None
    affected_workers: list[dict[str, Any]] | None = None


class RiskEventRead(TimestampedModel):
    zone_id: str | None = None
    risk_score: float
    severity: SeverityLevel
    confidence: float
    risk_category: str
    reason: str
    recommendation: str
    expected_consequence: str | None = None
    status: RiskStatus
    evidence: list[dict[str, Any]] | None = None
    affected_assets: list[dict[str, Any]] | None = None
    affected_workers: list[dict[str, Any]] | None = None


class RecommendationBase(BaseModel):
    risk_event_id: str | None = None
    action: str
    priority: PriorityLevel = PriorityLevel.MEDIUM
    assigned_to: str | None = None
    status: RecommendationStatus = RecommendationStatus.OPEN
    completed_at: datetime | None = None


class RecommendationCreate(RecommendationBase):
    pass


class RecommendationUpdate(BaseModel):
    risk_event_id: str | None = None
    action: str | None = None
    priority: PriorityLevel | None = None
    assigned_to: str | None = None
    status: RecommendationStatus | None = None
    completed_at: datetime | None = None


class RecommendationRead(TimestampedModel):
    risk_event_id: str | None = None
    action: str
    priority: PriorityLevel
    assigned_to: str | None = None
    status: RecommendationStatus
    completed_at: datetime | None = None


class NotificationBase(BaseModel):
    user_id: str | None = None
    title: str
    message: str
    type: NotificationType = NotificationType.INFO
    priority: PriorityLevel = PriorityLevel.LOW
    read: bool = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    title: str | None = None
    message: str | None = None
    type: NotificationType | None = None
    priority: PriorityLevel | None = None
    read: bool | None = None


class NotificationRead(TimestampedModel):
    user_id: str | None = None
    title: str
    message: str
    type: NotificationType
    priority: PriorityLevel
    read: bool


class ComplianceReportBase(BaseModel):
    plant_id: str
    framework: ComplianceFramework = ComplianceFramework.OSHA
    score: float
    violations: list[dict[str, Any]] | None = None
    recommendations: list[dict[str, Any]] | None = None
    generated_at: datetime


class ComplianceReportCreate(ComplianceReportBase):
    pass


class ComplianceReportUpdate(BaseModel):
    framework: ComplianceFramework | None = None
    score: float | None = None
    violations: list[dict[str, Any]] | None = None
    recommendations: list[dict[str, Any]] | None = None
    generated_at: datetime | None = None


class ComplianceReportRead(TimestampedModel):
    plant_id: str
    framework: ComplianceFramework
    score: float
    violations: list[dict[str, Any]] | None = None
    recommendations: list[dict[str, Any]] | None = None
    generated_at: datetime


class ChatHistoryRead(ORMModel):
    id: str
    user_id: str | None = None
    question: str
    response: str
    citations: list[dict[str, Any]] | None = None
    timestamp: datetime
