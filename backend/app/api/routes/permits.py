from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import PermitCreate, PermitRead, PermitUpdate
from app.services.entities import PermitService

router = APIRouter(prefix="/permits", tags=["permits"])


@router.get("", response_model=APIResponse[list[PermitRead]])
async def list_permits(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await PermitService(session).list(**params)
    return build_response(items, message="Permits retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/{permit_id}", response_model=APIResponse[PermitRead])
async def get_permit(permit_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await PermitService(session).get(permit_id)
    return build_response(item, message="Permit retrieved successfully.")


@router.get("/{permit_id}/conflicts", response_model=APIResponse[list[PermitRead]])
async def permit_conflicts(permit_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    items = await PermitService(session).conflicts(permit_id)
    return build_response(list(items), message="Permit conflicts retrieved successfully.")


@router.post("", response_model=APIResponse[PermitRead])
async def create_permit(
    payload: PermitCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await PermitService(session).create(payload)
    return build_response(item, message="Permit created successfully.")


@router.put("/{permit_id}", response_model=APIResponse[PermitRead])
async def update_permit(
    permit_id: str,
    payload: PermitUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await PermitService(session).update(permit_id, payload)
    return build_response(item, message="Permit updated successfully.")


@router.delete("/{permit_id}", response_model=APIResponse[dict])
async def delete_permit(permit_id: str, _=Depends(require_roles(UserRole.ADMIN)), session=Depends(get_db_session)):
    await PermitService(session).delete(permit_id)
    return build_response({"deleted": True}, message="Permit deleted successfully.")
