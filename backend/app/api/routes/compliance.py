from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.schemas.compliance import ComplianceReportRequest
from app.schemas.domain import ComplianceReportRead
from app.services.compliance import ComplianceService

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("", response_model=APIResponse[list[ComplianceReportRead]])
async def list_reports(
    plant_id: str | None = Query(default=None),
    _=Depends(get_current_user),
    session=Depends(get_db_session),
):
    items = await ComplianceService(session).list(plant_id=plant_id)
    return build_response(list(items), message="Compliance reports retrieved successfully.")


@router.post("/generate", response_model=APIResponse[ComplianceReportRead])
async def generate_report(payload: ComplianceReportRequest, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await ComplianceService(session).generate(payload)
    return build_response(item, message="Compliance report generated successfully.")
