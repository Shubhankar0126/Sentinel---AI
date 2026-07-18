from pydantic import BaseModel

from app.schemas.risk import RiskAnalysisResult


class SimulationRequest(BaseModel):
    scenario: str
    zone_id: str | None = None
    worker_count: int = 0
    hot_work_permit: bool = False
    electrical_permit: bool = False
    maintenance_running: bool = False
    equipment_health: float | None = None
    weather_condition: str | None = None


class SimulationResponse(BaseModel):
    scenario: str
    assumptions: dict[str, str]
    result: RiskAnalysisResult
