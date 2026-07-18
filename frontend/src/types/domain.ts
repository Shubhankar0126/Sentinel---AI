export type UserRole =
  | "admin"
  | "plant_manager"
  | "safety_officer"
  | "maintenance"
  | "viewer";

export type LifecycleStatus = "active" | "inactive" | "archived";
export type SeverityLevel = "safe" | "low" | "moderate" | "high" | "critical";
export type PermitType =
  | "hot_work"
  | "confined_space"
  | "electrical"
  | "working_at_height"
  | "cold_work"
  | "general";
export type PermitStatus = "draft" | "open" | "approved" | "suspended" | "expired" | "closed";
export type EquipmentStatus = "healthy" | "warning" | "critical" | "offline" | "maintenance";
export type SensorStatus = "active" | "offline" | "faulty" | "maintenance";
export type MaintenanceStatus = "scheduled" | "running" | "completed" | "overdue" | "cancelled";
export type MaintenanceType = "preventive" | "corrective" | "inspection" | "emergency";
export type IncidentStatus = "open" | "investigating" | "closed";
export type IncidentType =
  | "safety_incident"
  | "near_miss"
  | "equipment_failure"
  | "fire"
  | "gas_leak"
  | "chemical_exposure"
  | "worker_collapse";
export type RiskStatus = "open" | "acknowledged" | "mitigated" | "closed";
export type PriorityLevel = "low" | "medium" | "high" | "critical";
export type RecommendationStatus = "open" | "in_progress" | "completed" | "dismissed";
export type NotificationType = "info" | "warning" | "critical";
export type ComplianceFramework = "osha" | "iso_45001" | "factory_act" | "oisd";

export interface TimestampedEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface UserRead extends TimestampedEntity {
  name: string;
  email: string;
  role: UserRole;
  plant_id?: string | null;
  status: LifecycleStatus;
}

export interface PlantRead extends TimestampedEntity {
  name: string;
  location: string;
  industry: string;
  status: LifecycleStatus;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ZoneRead extends TimestampedEntity {
  plant_id: string;
  zone_name: string;
  risk_level: SeverityLevel;
  latitude?: number | null;
  longitude?: number | null;
  polygon?: Array<Record<string, unknown>> | null;
  description?: string | null;
}

export interface EquipmentRead extends TimestampedEntity {
  plant_id: string;
  zone_id?: string | null;
  equipment_name: string;
  equipment_type: string;
  manufacturer?: string | null;
  health_score: number;
  status: EquipmentStatus;
  last_maintenance?: string | null;
  next_maintenance?: string | null;
  external_id?: string | null;
  source_dataset?: string | null;
}

export interface SensorRead extends TimestampedEntity {
  equipment_id?: string | null;
  zone_id?: string | null;
  sensor_name: string;
  sensor_type: string;
  unit?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  status: SensorStatus;
  external_id?: string | null;
}

export interface SensorReadingRead extends TimestampedEntity {
  sensor_id: string;
  timestamp: string;
  value: number;
  quality?: string | null;
  status: string;
  scenario?: string | null;
}

export interface WorkerRead extends TimestampedEntity {
  worker_code: string;
  name: string;
  department: string;
  designation: string;
  phone?: string | null;
  status: LifecycleStatus;
}

export interface WorkerLocationRead extends TimestampedEntity {
  worker_id: string;
  zone_id: string;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PermitRead extends TimestampedEntity {
  permit_number: string;
  permit_type: PermitType;
  worker_id?: string | null;
  zone_id?: string | null;
  equipment_id?: string | null;
  start_time: string;
  end_time: string;
  status: PermitStatus;
  approved_by?: string | null;
}

export interface MaintenanceRead extends TimestampedEntity {
  equipment_id: string;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  assigned_to?: string | null;
  scheduled_date: string;
  completed_date?: string | null;
  remarks?: string | null;
}

export interface IncidentRead extends TimestampedEntity {
  title: string;
  description: string;
  severity: SeverityLevel;
  zone_id?: string | null;
  equipment_id?: string | null;
  worker_id?: string | null;
  incident_type: IncidentType;
  root_cause?: string | null;
  status: IncidentStatus;
  reported_at: string;
  closed_at?: string | null;
  evidence?: Array<Record<string, unknown>> | null;
  ai_summary?: string | null;
  source_dataset?: string | null;
}

export interface RiskEventRead extends TimestampedEntity {
  zone_id?: string | null;
  risk_score: number;
  severity: SeverityLevel;
  confidence: number;
  risk_category: string;
  reason: string;
  recommendation: string;
  expected_consequence?: string | null;
  status: RiskStatus;
  evidence?: Array<Record<string, unknown>> | null;
  affected_assets?: Array<Record<string, unknown>> | null;
  affected_workers?: Array<Record<string, unknown>> | null;
}

export interface RecommendationRead extends TimestampedEntity {
  risk_event_id?: string | null;
  action: string;
  priority: PriorityLevel;
  assigned_to?: string | null;
  status: RecommendationStatus;
  completed_at?: string | null;
}

export interface NotificationRead extends TimestampedEntity {
  user_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  priority: PriorityLevel;
  read: boolean;
}

export interface ComplianceReportRead extends TimestampedEntity {
  plant_id: string;
  framework: ComplianceFramework;
  score: number;
  violations?: Array<Record<string, unknown>> | null;
  recommendations?: Array<Record<string, unknown>> | null;
  generated_at: string;
}

export interface ChatHistoryRead {
  id: string;
  user_id?: string | null;
  question: string;
  response: string;
  citations?: Array<Record<string, unknown>> | null;
  timestamp: string;
}

export interface ZoneSummary {
  zone_id: string;
  zone_name: string;
  risk_level: SeverityLevel;
  equipment_count: number;
  worker_count: number;
  incident_count: number;
}

export interface EquipmentHealthView {
  equipment_id: string;
  equipment_name: string;
  health_score: number;
  status: EquipmentStatus;
  last_maintenance?: string | null;
  next_maintenance?: string | null;
  predicted_failure_risk: number;
}

export interface WorkerSafetyView {
  worker_id: string;
  worker_name: string;
  current_zone_id?: string | null;
  current_location_timestamp?: string | null;
  active_permits: number;
  safety_status: string;
}

export interface IncidentReport {
  title: string;
  timeline: Array<Record<string, string>>;
  severity: SeverityLevel;
  root_cause?: string | null;
  evidence: Array<Record<string, unknown>>;
  ai_summary?: string | null;
}

