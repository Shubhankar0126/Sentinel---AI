from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import MaintenanceCreate, MaintenanceRead, MaintenanceUpdate
from app.services.entities import MaintenanceService

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("", response_model=APIResponse[list[MaintenanceRead]])
async def list_maintenance(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await MaintenanceService(session).list(**params)
    return build_response(items, message="Maintenance records retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/overdue", response_model=APIResponse[list[MaintenanceRead]])
async def overdue_maintenance(_=Depends(get_current_user), session=Depends(get_db_session)):
    items = await MaintenanceService(session).overdue()
    return build_response(list(items), message="Overdue maintenance retrieved successfully.")


@router.get("/{maintenance_id}", response_model=APIResponse[MaintenanceRead])
async def get_maintenance(maintenance_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await MaintenanceService(session).get(maintenance_id)
    return build_response(item, message="Maintenance record retrieved successfully.")


@router.post("", response_model=APIResponse[MaintenanceRead])
async def create_maintenance(
    payload: MaintenanceCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.MAINTENANCE)),
    session=Depends(get_db_session),
):
    item = await MaintenanceService(session).create(payload)
    return build_response(item, message="Maintenance record created successfully.")


@router.put("/{maintenance_id}", response_model=APIResponse[MaintenanceRead])
async def update_maintenance(
    maintenance_id: str,
    payload: MaintenanceUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.MAINTENANCE)),
    session=Depends(get_db_session),
):
    item = await MaintenanceService(session).update(maintenance_id, payload)
    return build_response(item, message="Maintenance record updated successfully.")


@router.delete("/{maintenance_id}", response_model=APIResponse[dict])
async def delete_maintenance(maintenance_id: str, _=Depends(require_roles(UserRole.ADMIN)), session=Depends(get_db_session)):
    await MaintenanceService(session).delete(maintenance_id)
    return build_response({"deleted": True}, message="Maintenance record deleted successfully.")
