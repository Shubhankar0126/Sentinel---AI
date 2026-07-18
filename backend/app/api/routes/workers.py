from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import WorkerCreate, WorkerLocationCreate, WorkerLocationRead, WorkerLocationUpdate, WorkerRead, WorkerUpdate
from app.services.entities import WorkerLocationService, WorkerService

router = APIRouter(prefix="/workers", tags=["workers"])


@router.get("", response_model=APIResponse[list[WorkerRead]])
async def list_workers(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await WorkerService(session).list(**params)
    return build_response(items, message="Workers retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/{worker_id}", response_model=APIResponse[WorkerRead])
async def get_worker(worker_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await WorkerService(session).get(worker_id)
    return build_response(item, message="Worker retrieved successfully.")


@router.get("/{worker_id}/safety", response_model=APIResponse[dict])
async def worker_safety(worker_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await WorkerService(session).safety_view(worker_id)
    return build_response(item, message="Worker safety view retrieved successfully.")


@router.post("", response_model=APIResponse[WorkerRead])
async def create_worker(
    payload: WorkerCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await WorkerService(session).create(payload)
    return build_response(item, message="Worker created successfully.")


@router.put("/{worker_id}", response_model=APIResponse[WorkerRead])
async def update_worker(
    worker_id: str,
    payload: WorkerUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await WorkerService(session).update(worker_id, payload)
    return build_response(item, message="Worker updated successfully.")


@router.delete("/{worker_id}", response_model=APIResponse[dict])
async def delete_worker(worker_id: str, _=Depends(require_roles(UserRole.ADMIN)), session=Depends(get_db_session)):
    await WorkerService(session).delete(worker_id)
    return build_response({"deleted": True}, message="Worker deleted successfully.")


@router.post("/locations", response_model=APIResponse[WorkerLocationRead])
async def create_worker_location(
    payload: WorkerLocationCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await WorkerLocationService(session).create(payload)
    return build_response(item, message="Worker location created successfully.")


@router.put("/locations/{location_id}", response_model=APIResponse[WorkerLocationRead])
async def update_worker_location(
    location_id: str,
    payload: WorkerLocationUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await WorkerLocationService(session).update(location_id, payload)
    return build_response(item, message="Worker location updated successfully.")
