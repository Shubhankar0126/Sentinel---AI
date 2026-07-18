from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import NotificationCreate, NotificationRead, NotificationUpdate
from app.services.entities import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=APIResponse[list[NotificationRead]])
async def list_notifications(params=Depends(pagination_params), current_user=Depends(get_current_user), session=Depends(get_db_session)):
    filters = {"user_id": current_user.id}
    items, total = await NotificationService(session).list(**params, filters=filters)
    return build_response(items, message="Notifications retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/unread", response_model=APIResponse[list[NotificationRead]])
async def unread_notifications(current_user=Depends(get_current_user), session=Depends(get_db_session)):
    items = await NotificationService(session).unread(current_user.id)
    return build_response(list(items), message="Unread notifications retrieved successfully.")


@router.post("", response_model=APIResponse[NotificationRead])
async def create_notification(
    payload: NotificationCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await NotificationService(session).create(payload)
    return build_response(item, message="Notification created successfully.")


@router.put("/{notification_id}", response_model=APIResponse[NotificationRead])
async def update_notification(
    notification_id: str,
    payload: NotificationUpdate,
    current_user=Depends(get_current_user),
    session=Depends(get_db_session),
):
    item = await NotificationService(session).update(notification_id, payload)
    if item.user_id and item.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update another user's notification.",
        )
    return build_response(item, message="Notification updated successfully.")


@router.delete("/{notification_id}", response_model=APIResponse[dict])
async def delete_notification(notification_id: str, current_user=Depends(get_current_user), session=Depends(get_db_session)):
    if current_user.role not in {UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.SAFETY_OFFICER, UserRole.VIEWER, UserRole.MAINTENANCE}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid role.")
    await NotificationService(session).delete(notification_id)
    return build_response({"deleted": True}, message="Notification deleted successfully.")
