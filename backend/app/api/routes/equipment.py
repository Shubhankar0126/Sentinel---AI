from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import EquipmentCreate, EquipmentRead, EquipmentUpdate
from app.services.entities import EquipmentService

router = APIRouter(prefix="/equipment", tags=["equipment"])


@router.get("", response_model=APIResponse[list[EquipmentRead]])
async def list_equipment(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await EquipmentService(session).list(**params)
    return build_response(items, message="Equipment retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/{equipment_id}", response_model=APIResponse[EquipmentRead])
async def get_equipment(equipment_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await EquipmentService(session).get(equipment_id)
    return build_response(item, message="Equipment retrieved successfully.")


@router.get("/{equipment_id}/health", response_model=APIResponse[dict])
async def equipment_health(equipment_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await EquipmentService(session).health_view(equipment_id)
    return build_response(item, message="Equipment health retrieved successfully.")


@router.post("", response_model=APIResponse[EquipmentRead])
async def create_equipment(
    payload: EquipmentCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.MAINTENANCE)),
    session=Depends(get_db_session),
):
    item = await EquipmentService(session).create(payload)
    return build_response(item, message="Equipment created successfully.")


@router.put("/{equipment_id}", response_model=APIResponse[EquipmentRead])
async def update_equipment(
    equipment_id: str,
    payload: EquipmentUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.MAINTENANCE)),
    session=Depends(get_db_session),
):
    item = await EquipmentService(session).update(equipment_id, payload)
    return build_response(item, message="Equipment updated successfully.")


@router.delete("/{equipment_id}", response_model=APIResponse[dict])
async def delete_equipment(equipment_id: str, _=Depends(require_roles(UserRole.ADMIN)), session=Depends(get_db_session)):
    await EquipmentService(session).delete(equipment_id)
    return build_response({"deleted": True}, message="Equipment deleted successfully.")
