from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, pagination_params, require_roles
from app.core.response import APIResponse, PaginationMeta, build_response
from app.database.session import get_db_session
from app.models.enums import UserRole
from app.schemas.domain import SensorCreate, SensorRead, SensorReadingCreate, SensorReadingRead, SensorReadingUpdate, SensorUpdate
from app.services.entities import SensorReadingService, SensorService

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.get("", response_model=APIResponse[list[SensorRead]])
async def list_sensors(params=Depends(pagination_params), _=Depends(get_current_user), session=Depends(get_db_session)):
    items, total = await SensorService(session).list(**params)
    return build_response(items, message="Sensors retrieved successfully.", pagination=PaginationMeta(total=total, **params))


@router.get("/{sensor_id}", response_model=APIResponse[SensorRead])
async def get_sensor(sensor_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    item = await SensorService(session).get(sensor_id)
    return build_response(item, message="Sensor retrieved successfully.")


@router.post("", response_model=APIResponse[SensorRead])
async def create_sensor(
    payload: SensorCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.MAINTENANCE)),
    session=Depends(get_db_session),
):
    item = await SensorService(session).create(payload)
    return build_response(item, message="Sensor created successfully.")


@router.put("/{sensor_id}", response_model=APIResponse[SensorRead])
async def update_sensor(
    sensor_id: str,
    payload: SensorUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.MAINTENANCE)),
    session=Depends(get_db_session),
):
    item = await SensorService(session).update(sensor_id, payload)
    return build_response(item, message="Sensor updated successfully.")


@router.delete("/{sensor_id}", response_model=APIResponse[dict])
async def delete_sensor(sensor_id: str, _=Depends(require_roles(UserRole.ADMIN)), session=Depends(get_db_session)):
    await SensorService(session).delete(sensor_id)
    return build_response({"deleted": True}, message="Sensor deleted successfully.")


@router.get("/{sensor_id}/readings", response_model=APIResponse[list[SensorReadingRead]])
async def sensor_readings(sensor_id: str, _=Depends(get_current_user), session=Depends(get_db_session)):
    readings = await SensorReadingService(session).latest(sensor_id)
    return build_response(list(readings), message="Sensor readings retrieved successfully.")


@router.post("/readings", response_model=APIResponse[SensorReadingRead])
async def create_sensor_reading(
    payload: SensorReadingCreate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MAINTENANCE, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await SensorReadingService(session).create(payload)
    return build_response(item, message="Sensor reading created successfully.")


@router.put("/readings/{reading_id}", response_model=APIResponse[SensorReadingRead])
async def update_sensor_reading(
    reading_id: str,
    payload: SensorReadingUpdate,
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MAINTENANCE, UserRole.SAFETY_OFFICER)),
    session=Depends(get_db_session),
):
    item = await SensorReadingService(session).update(reading_id, payload)
    return build_response(item, message="Sensor reading updated successfully.")
