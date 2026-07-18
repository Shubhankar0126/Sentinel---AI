from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request

from app.core.config import get_settings
from app.core.response import APIResponse, build_response
from app.database.session import ping_database
from app.utils.datasets import dataset_health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=APIResponse[dict])
async def health_check(request: Request):
    settings = get_settings()
    started_at = getattr(request.app.state, "started_at", datetime.now(UTC))
    try:
        database_ok = await ping_database()
        database_status = "healthy" if database_ok else "unhealthy"
    except Exception as exc:
        database_status = f"unhealthy: {exc}"
    payload = {
        "application": "healthy",
        "database": database_status,
        "datasets": dataset_health(settings.dataset_root),
        "version": settings.app_version,
        "uptime_seconds": max(0, int((datetime.now(UTC) - started_at).total_seconds())),
        "environment": settings.environment,
    }
    return build_response(payload, message="Health status retrieved successfully.")


@router.get("/version", response_model=APIResponse[dict])
async def version_info():
    settings = get_settings()
    return build_response(
        {
            "application": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "database_url": settings.effective_database_url,
        },
        message="Version information retrieved successfully.",
    )
