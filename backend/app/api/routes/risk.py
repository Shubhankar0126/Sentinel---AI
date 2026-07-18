from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, require_roles
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import RiskEventRead
from app.schemas.risk import RiskAnalysisRequest, RiskAnalysisResult
from app.services.risk import RiskService

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/analyze", response_model=APIResponse[RiskAnalysisResult])
async def analyze_risk(
    payload: RiskAnalysisRequest,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER, UserRole.MAINTENANCE)),
    session=Depends(get_db_session),
):
    item = await RiskService(session).analyze(payload)
    return build_response(item, message="Risk analysis completed successfully.")


@router.get("/history", response_model=APIResponse[list[RiskEventRead]])
async def risk_history(_=Depends(get_current_user), session=Depends(get_db_session)):
    items = await RiskService(session).history()
    return build_response(list(items), message="Risk history retrieved successfully.")


@router.get("/live", response_model=APIResponse[list[RiskEventRead]])
async def live_risk_feed(_=Depends(get_current_user), session=Depends(get_db_session)):
    items = await RiskService(session).live()
    return build_response(list(items), message="Live risk feed retrieved successfully.")
