from fastapi import APIRouter

from app.api.routes import (
    actions,
    analytics,
    auth,
    compliance,
    copilot,
    dashboard,
    equipment,
    graph,
    health,
    incidents,
    maintenance,
    notifications,
    permits,
    plants,
    risk,
    sensors,
    simulation,
    workers,
    zones,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(graph.router)
api_router.include_router(dashboard.router)
api_router.include_router(plants.router)
api_router.include_router(zones.router)
api_router.include_router(equipment.router)
api_router.include_router(sensors.router)
api_router.include_router(workers.router)
api_router.include_router(permits.router)
api_router.include_router(maintenance.router)
api_router.include_router(incidents.router)
api_router.include_router(risk.router)
api_router.include_router(actions.router)
api_router.include_router(analytics.router)
api_router.include_router(copilot.router)
api_router.include_router(notifications.router)
api_router.include_router(compliance.router)
api_router.include_router(simulation.router)
