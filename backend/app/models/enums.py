from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    PLANT_MANAGER = "plant_manager"
    SAFETY_OFFICER = "safety_officer"
    MAINTENANCE = "maintenance"
    VIEWER = "viewer"


class LifecycleStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class SeverityLevel(str, Enum):
    SAFE = "safe"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class PermitType(str, Enum):
    HOT_WORK = "hot_work"
    CONFINED_SPACE = "confined_space"
    ELECTRICAL = "electrical"
    WORKING_AT_HEIGHT = "working_at_height"
    COLD_WORK = "cold_work"
    GENERAL = "general"


class PermitStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    CLOSED = "closed"


class EquipmentStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class SensorStatus(str, Enum):
    ACTIVE = "active"
    OFFLINE = "offline"
    FAULTY = "faulty"
    MAINTENANCE = "maintenance"


class MaintenanceStatus(str, Enum):
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class MaintenanceType(str, Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    INSPECTION = "inspection"
    EMERGENCY = "emergency"


class IncidentStatus(str, Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    CLOSED = "closed"


class IncidentType(str, Enum):
    SAFETY_INCIDENT = "safety_incident"
    NEAR_MISS = "near_miss"
    EQUIPMENT_FAILURE = "equipment_failure"
    FIRE = "fire"
    GAS_LEAK = "gas_leak"
    CHEMICAL_EXPOSURE = "chemical_exposure"
    WORKER_COLLAPSE = "worker_collapse"


class RiskStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    MITIGATED = "mitigated"
    CLOSED = "closed"


class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecommendationStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ComplianceFramework(str, Enum):
    OSHA = "osha"
    ISO_45001 = "iso_45001"
    FACTORY_ACT = "factory_act"
    OISD = "oisd"
