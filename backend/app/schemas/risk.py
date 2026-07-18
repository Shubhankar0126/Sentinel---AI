from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import PermitType, PriorityLevel, SeverityLevel
from app.schemas.domain import RecommendationRead, RiskEventRead


class SensorSignalInput(BaseModel):
    sensor_id: str | None = None
    sensor_name: str | None = None
    sensor_type: str | None = None
    value: float
    unit: str | None = None
    timestamp: datetime | None = None


class RuleConditionResult(BaseModel):
    field: str
    operator: str
    expected: Any
    observed: Any
    matched: bool
    label: str | None = None


class RuleMatch(BaseModel):
    rule_id: str
    name: str
    description: str
    severity: SeverityLevel
    risk_category: str
    score_delta: float
    reason: str
    regulations: list[str] = Field(default_factory=list)
    conditions: list[RuleConditionResult] = Field(default_factory=list)


class RecommendationAction(BaseModel):
    action: str
    priority: PriorityLevel
    rationale: str
    target_type: str | None = None
    target_id: str | None = None
    source_rules: list[str] = Field(default_factory=list)


class HistoricalSimilarityMatch(BaseModel):
    source: str
    reference_id: str
    title: str
    similarity_score: float
    summary: str
    evidence: list[str] = Field(default_factory=list)


class ExplainabilityReport(BaseModel):
    why: str
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    contributing_factors: list[str] = Field(default_factory=list)
    applicable_rules: list[RuleMatch] = Field(default_factory=list)
    historical_similarity: list[HistoricalSimilarityMatch] = Field(default_factory=list)
    recommended_actions: list[RecommendationAction] = Field(default_factory=list)
    impact_summary: dict[str, Any] | None = None


class RiskAnalysisRequest(BaseModel):
    zone_id: str | None = None
    equipment_id: str | None = None
    gas_level: float | None = None
    temperature: float | None = None
    pressure: float | None = None
    humidity: float | None = None
    vibration: float | None = None
    equipment_health: float | None = None
    permit_type: PermitType | None = None
    worker_count: int = 0
    worker_present: bool = False
    worker_ids: list[str] = Field(default_factory=list)
    maintenance_running: bool = False
    maintenance_overdue: bool = False
    weather_condition: str | None = None
    weather_temperature_c: float | None = None
    weather_humidity: float | None = None
    wind_kph: float | None = None
    historical_similarity: float | None = None
    shift: str | None = None
    time_of_day: str | None = None
    sensor_readings: list[SensorSignalInput] = Field(default_factory=list)
    persist_result: bool = True


class RiskAnalysisResult(BaseModel):
    risk_score: float
    severity: SeverityLevel
    confidence: float
    risk_category: str
    reason: str
    root_cause: str
    recommendation: str
    expected_consequence: str
    regulations: list[str] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    applicable_rules: list[RuleMatch] = Field(default_factory=list)
    historical_similarity: list[HistoricalSimilarityMatch] = Field(default_factory=list)
    recommended_actions: list[RecommendationAction] = Field(default_factory=list)
    explainability: ExplainabilityReport
    graph_insights: dict[str, Any] | None = None
    recommendations_created: list[RecommendationRead] = Field(default_factory=list)
    risk_event: RiskEventRead | None = None
