from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.services.simulation import SimulationService

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("/scenarios", response_model=APIResponse[list[str]])
async def scenarios(_=Depends(get_current_user)):
    available = [
        "Gas Leak",
        "Fire",
        "Explosion",
        "Chemical Leak",
        "Machine Failure",
        "Worker Collapse",
        "Permit Conflict",
        "Maintenance Conflict",
        "Multiple Hazard",
    ]
    return build_response(available, message="Simulation scenarios retrieved successfully.")


@router.post("/start", response_model=APIResponse[SimulationResponse])
async def start_simulation(payload: SimulationRequest, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await SimulationService(session).start(payload)
    return build_response(item, message="Simulation completed successfully.")
