from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import IncidentCreate, IncidentRead, IncidentUpdate
from app.services.entities import IncidentService

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=APIResponse[list[IncidentRead]])
async def list_incidents(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await IncidentService(session).list(**params)
    return build_response(items, message="Incidents retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/{incident_id}", response_model=APIResponse[IncidentRead])
async def get_incident(incident_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await IncidentService(session).get(incident_id)
    return build_response(item, message="Incident retrieved successfully.")


@router.get("/{incident_id}/report", response_model=APIResponse[dict])
async def incident_report(incident_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await IncidentService(session).report(incident_id)
    return build_response(item, message="Incident report generated successfully.")


@router.post("", response_model=APIResponse[IncidentRead])
async def create_incident(
    payload: IncidentCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await IncidentService(session).create(payload)
    return build_response(item, message="Incident created successfully.")


@router.put("/{incident_id}", response_model=APIResponse[IncidentRead])
async def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await IncidentService(session).update(incident_id, payload)
    return build_response(item, message="Incident updated successfully.")


@router.delete("/{incident_id}", response_model=APIResponse[dict])
async def delete_incident(incident_id: str, _=Depends(require_roles(UserRole.ADMIN)), session=Depends(get_db_session)):
    await IncidentService(session).delete(incident_id)
    return build_response({"deleted": True}, message="Incident deleted successfully.")
