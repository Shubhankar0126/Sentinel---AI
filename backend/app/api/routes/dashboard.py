from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=APIResponse[DashboardSummary])
async def get_dashboard(current_user=Depends(get_current_user), session=Depends(get_db_session)):
    summary = await DashboardService(session).summary(current_user.id)
    return build_response(summary, message="Dashboard summary retrieved successfully.")
