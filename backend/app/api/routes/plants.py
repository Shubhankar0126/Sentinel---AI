from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import PlantCreate, PlantRead, PlantUpdate
from app.services.entities import PlantService

router = APIRouter(prefix="/plants", tags=["plants"])


@router.get("", response_model=APIResponse[list[PlantRead]])
async def list_plants(
    params=Depends(pagination_params),
    _=Depends(get_current_user),
    session=Depends(get_db_session),
):
    items, total = await PlantService(session).list(**params)
    return build_response(items, message="Plants retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/{plant_id}", response_model=APIResponse[PlantRead])
async def get_plant(plant_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await PlantService(session).get(plant_id)
    return build_response(item, message="Plant retrieved successfully.")


@router.post("", response_model=APIResponse[PlantRead])
async def create_plant(
    payload: PlantCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER)),
    session=Depends(get_db_session),
):
    item = await PlantService(session).create(payload)
    return build_response(item, message="Plant created successfully.")


@router.put("/{plant_id}", response_model=APIResponse[PlantRead])
async def update_plant(
    plant_id: str,
    payload: PlantUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER)),
    session=Depends(get_db_session),
):
    item = await PlantService(session).update(plant_id, payload)
    return build_response(item, message="Plant updated successfully.")


@router.delete("/{plant_id}", response_model=APIResponse[dict])
async def delete_plant(
    plant_id: str,
    _=Depends(require_roles(UserRole.ADMIN)),
    session=Depends(get_db_session),
):
    await PlantService(session).delete(plant_id)
    return build_response({"deleted": True}, message="Plant deleted successfully.")
