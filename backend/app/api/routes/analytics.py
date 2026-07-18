from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.schemas.analytics import AnalyticsOverview
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=APIResponse[AnalyticsOverview])
async def analytics_overview(_=Depends(get_current_user), session=Depends(get_db_session)):
    item = await AnalyticsService(session).overview()
    return build_response(item, message="Analytics overview retrieved successfully.")
