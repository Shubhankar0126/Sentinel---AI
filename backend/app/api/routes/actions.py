from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import RecommendationCreate, RecommendationRead, RecommendationUpdate
from app.services.entities import RecommendationService

router = APIRouter(prefix="/actions", tags=["action-center"])


@router.get("", response_model=APIResponse[list[RecommendationRead]])
async def list_actions(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await RecommendationService(session).list(**params)
    return build_response(items, message="Actions retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/pending", response_model=APIResponse[list[RecommendationRead]])
async def pending_actions(_=Depends(get_current_user), session=Depends(get_db_session)):
    items = await RecommendationService(session).action_center()
    return build_response(list(items), message="Pending actions retrieved successfully.")


@router.post("", response_model=APIResponse[RecommendationRead])
async def create_action(
    payload: RecommendationCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await RecommendationService(session).create(payload)
    return build_response(item, message="Action created successfully.")


@router.put("/{action_id}", response_model=APIResponse[RecommendationRead])
async def update_action(
    action_id: str,
    payload: RecommendationUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await RecommendationService(session).update(action_id, payload)
    return build_response(item, message="Action updated successfully.")
