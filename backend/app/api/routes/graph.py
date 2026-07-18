from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.knowledge_graph.service import KnowledgeGraphService
from app.schemas.graph import (
    GraphNeighborhoodResult,
    GraphNodeDetail,
    GraphPathResult,
    KnowledgeGraphOverview,
)

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=APIResponse[KnowledgeGraphOverview])
async def graph_overview(
    plant_id: str | None = Query(default=None),
    _=Depends(get_current_user),
    session=Depends(get_db_session),
):
    item = await KnowledgeGraphService(session).overview(plant_id=plant_id)
    return build_response(item, message="Knowledge graph overview retrieved successfully.")


@router.get("/node", response_model=APIResponse[GraphNodeDetail])
async def graph_node_detail(
    node_id: str = Query(...),
    depth: int = Query(default=2, ge=1, le=5),
    plant_id: str | None = Query(default=None),
    _=Depends(get_current_user),
    session=Depends(get_db_session),
):
    try:
        item = await KnowledgeGraphService(session).node_detail(node_id, depth=depth, plant_id=plant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return build_response(item, message="Graph node detail retrieved successfully.")


@router.get("/neighbors", response_model=APIResponse[GraphNeighborhoodResult])
async def graph_neighbors(
    node_id: str = Query(...),
    depth: int = Query(default=2, ge=1, le=5),
    plant_id: str | None = Query(default=None),
    _=Depends(get_current_user),
    session=Depends(get_db_session),
):
    try:
        item = await KnowledgeGraphService(session).neighbors(node_id, depth=depth, plant_id=plant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return build_response(item, message="Graph neighborhood retrieved successfully.")


@router.get("/path", response_model=APIResponse[GraphPathResult])
async def graph_path(
    source_id: str = Query(...),
    target_id: str = Query(...),
    plant_id: str | None = Query(default=None),
    _=Depends(get_current_user),
    session=Depends(get_db_session),
):
    try:
        item = await KnowledgeGraphService(session).path(source_id, target_id, plant_id=plant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return build_response(item, message="Graph path retrieved successfully.")
