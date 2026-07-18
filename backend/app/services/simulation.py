from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import PermitType
from app.schemas.risk import RiskAnalysisRequest
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.services.risk import RiskService


class SimulationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.risk_service = RiskService(session)

    async def start(self, payload: SimulationRequest) -> SimulationResponse:
        scenario = payload.scenario.lower()
        risk_payload = RiskAnalysisRequest(
            zone_id=payload.zone_id,
            gas_level=88 if scenario == "gas leak" else 35,
            temperature=72 if scenario in {"fire", "explosion"} else 40,
            pressure=84 if scenario == "explosion" else 50,
            equipment_health=payload.equipment_health or (18 if scenario == "machine failure" else 62),
            permit_type=PermitType.HOT_WORK if payload.hot_work_permit else (PermitType.ELECTRICAL if payload.electrical_permit else None),
            worker_count=payload.worker_count,
            worker_present=payload.worker_count > 0,
            maintenance_running=payload.maintenance_running,
            weather_condition=payload.weather_condition,
            historical_similarity=91 if scenario in {"gas leak", "explosion"} else 70,
        )
        result = await self.risk_service.analyze(risk_payload)
        return SimulationResponse(
            scenario=payload.scenario,
            assumptions={
                "scenario": payload.scenario,
                "worker_count": str(payload.worker_count),
                "hot_work_permit": str(payload.hot_work_permit),
                "maintenance_running": str(payload.maintenance_running),
            },
            result=result,
        )
