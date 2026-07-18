from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import ZoneCreate, ZoneRead, ZoneUpdate
from app.services.entities import ZoneService

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("", response_model=APIResponse[list[ZoneRead]])
async def list_zones(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await ZoneService(session).list(**params)
    return build_response(items, message="Zones retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/{zone_id}", response_model=APIResponse[ZoneRead])
async def get_zone(zone_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await ZoneService(session).get(zone_id)
    return build_response(item, message="Zone retrieved successfully.")


@router.get("/{zone_id}/summary", response_model=APIResponse[dict])
async def zone_summary(zone_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    summary = await ZoneService(session).summary(zone_id)
    return build_response(summary, message="Zone summary retrieved successfully.")


@router.post("", response_model=APIResponse[ZoneRead])
async def create_zone(
    payload: ZoneCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await ZoneService(session).create(payload)
    return build_response(item, message="Zone created successfully.")


@router.put("/{zone_id}", response_model=APIResponse[ZoneRead])
async def update_zone(
    zone_id: str,
    payload: ZoneUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await ZoneService(session).update(zone_id, payload)
    return build_response(item, message="Zone updated successfully.")


@router.delete("/{zone_id}", response_model=APIResponse[dict])
async def delete_zone(zone_id: str, _=Depends(require_roles(UserRole.ADMIN)), session=Depends(get_db_session)):
    await ZoneService(session).delete(zone_id)
    return build_response({"deleted": True}, message="Zone deleted successfully.")
