from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.knowledge_graph.builder import KnowledgeGraphBuilder
from app.models.entities import (
    Equipment,
    Incident,
    Maintenance,
    Permit,
    Plant,
    Recommendation,
    RiskEvent,
    Sensor,
    Worker,
    WorkerLocation,
    Zone,
)
from app.schemas.graph import (
    GraphImpactAnalysis,
    GraphNeighborhoodResult,
    GraphNode,
    GraphNodeDetail,
    GraphPathResult,
    KnowledgeGraphOverview,
)


class KnowledgeGraphService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()
        self.builder = KnowledgeGraphBuilder()

    async def overview(self, plant_id: str | None = None) -> KnowledgeGraphOverview:
        graph = await self._build_graph(plant_id=plant_id)
        sample_nodes = [
            self.builder.serialize_node(graph, node_id)
            for node_id in list(graph.nodes)[: self.settings.graph_sample_limit]
        ]
        sample_edge_ids = set(node.id for node in sample_nodes)
        sample_edges = self.builder.extract_edges(graph, sample_edge_ids)[: self.settings.graph_sample_limit]
        return KnowledgeGraphOverview(
            statistics=self.builder.graph_statistics(graph),
            sample_nodes=sample_nodes,
            sample_edges=sample_edges,
        )

    async def node_detail(
        self, node_id: str, *, depth: int | None = None, plant_id: str | None = None
    ) -> GraphNodeDetail:
        graph = await self._build_graph(plant_id=plant_id)
        if not graph.has_node(node_id):
            raise ValueError(f"Graph node not found: {node_id}")
        depth = depth or self.settings.graph_default_depth
        neighborhood = self._neighborhood_graph(graph, node_id, depth)
        return GraphNodeDetail(
            node=self.builder.serialize_node(graph, node_id),
            neighbors=[
                self.builder.serialize_node(graph, item)
                for item in neighborhood.nodes
                if item != node_id
            ],
            edges=self.builder.extract_edges(neighborhood, set(neighborhood.nodes)),
            impact_analysis=self._impact_analysis(graph, node_id, depth),
        )

    async def neighbors(
        self, node_id: str, *, depth: int | None = None, plant_id: str | None = None
    ) -> GraphNeighborhoodResult:
        graph = await self._build_graph(plant_id=plant_id)
        if not graph.has_node(node_id):
            raise ValueError(f"Graph node not found: {node_id}")
        depth = depth or self.settings.graph_default_depth
        neighborhood = self._neighborhood_graph(graph, node_id, depth)
        return GraphNeighborhoodResult(
            center=self.builder.serialize_node(graph, node_id),
            depth=depth,
            nodes=[self.builder.serialize_node(graph, item) for item in neighborhood.nodes],
            edges=self.builder.extract_edges(neighborhood, set(neighborhood.nodes)),
            impact_analysis=self._impact_analysis(graph, node_id, depth),
        )

    async def path(
        self,
        source_id: str,
        target_id: str,
        *,
        plant_id: str | None = None,
    ) -> GraphPathResult:
        graph = await self._build_graph(plant_id=plant_id)
        if not graph.has_node(source_id):
            raise ValueError(f"Graph node not found: {source_id}")
        if not graph.has_node(target_id):
            raise ValueError(f"Graph node not found: {target_id}")

        undirected = graph.to_undirected()
        try:
            path = nx.shortest_path(undirected, source=source_id, target=target_id)
        except nx.NetworkXNoPath:
            return GraphPathResult(
                path_found=False,
                path_nodes=[],
                path_edges=[],
                explanation="No relationship path exists between the requested nodes.",
            )

        path_edges = []
        for left, right in zip(path, path[1:]):
            edge_data = graph.get_edge_data(left, right) or graph.get_edge_data(right, left) or {}
            first_edge = next(iter(edge_data.values()), {"relation": "RELATED_TO", "attributes": {}})
            path_edges.append(
                self.builder.serialize_edge(
                    left,
                    right,
                    str(first_edge.get("relation", "RELATED_TO")),
                    dict(first_edge.get("attributes", {})),
                )
            )
        return GraphPathResult(
            path_found=True,
            path_nodes=[self.builder.serialize_node(graph, node_id) for node_id in path],
            path_edges=path_edges,
            explanation=f"Found a relationship path spanning {max(len(path) - 1, 0)} hops.",
        )

    async def impact_analysis(
        self,
        node_id: str,
        *,
        depth: int | None = None,
        plant_id: str | None = None,
    ) -> GraphImpactAnalysis:
        graph = await self._build_graph(plant_id=plant_id)
        if not graph.has_node(node_id):
            raise ValueError(f"Graph node not found: {node_id}")
        return self._impact_analysis(graph, node_id, depth or self.settings.graph_default_depth)

    async def _build_graph(self, plant_id: str | None = None) -> nx.MultiDiGraph:
        plants = await self._fetch(Plant, where=(Plant.id == plant_id) if plant_id else None)
        plant_ids = {item.id for item in plants}
        zones = await self._fetch(Zone, where=Zone.plant_id.in_(plant_ids) if plant_ids else None)
        zone_ids = {item.id for item in zones}
        equipment = await self._fetch(
            Equipment,
            where=Equipment.plant_id.in_(plant_ids) if plant_ids else None,
        )
        equipment_ids = {item.id for item in equipment}
        sensors = await self._fetch(
            Sensor,
            where=or_(Sensor.zone_id.in_(zone_ids), Sensor.equipment_id.in_(equipment_ids))
            if zone_ids or equipment_ids
            else None,
        )
        worker_locations = await self._fetch(
            WorkerLocation,
            where=WorkerLocation.zone_id.in_(zone_ids) if zone_ids else None,
        )
        worker_ids = {item.worker_id for item in worker_locations}
        workers = await self._fetch(Worker, where=Worker.id.in_(worker_ids) if worker_ids else None)
        permits = await self._fetch(
            Permit,
            where=or_(Permit.zone_id.in_(zone_ids), Permit.equipment_id.in_(equipment_ids))
            if zone_ids or equipment_ids
            else None,
        )
        maintenance_records = await self._fetch(
            Maintenance,
            where=Maintenance.equipment_id.in_(equipment_ids) if equipment_ids else None,
        )
        incidents = await self._fetch(
            Incident,
            where=or_(
                Incident.zone_id.in_(zone_ids),
                Incident.equipment_id.in_(equipment_ids),
                Incident.worker_id.in_(worker_ids),
            )
            if zone_ids or equipment_ids or worker_ids
            else None,
        )
        risk_events = await self._fetch(
            RiskEvent,
            where=RiskEvent.zone_id.in_(zone_ids) if zone_ids else None,
        )
        risk_event_ids = {item.id for item in risk_events}
        recommendations = await self._fetch(
            Recommendation,
            where=Recommendation.risk_event_id.in_(risk_event_ids) if risk_event_ids else None,
        )
        weather_records = self._load_weather_records(self.settings.dataset_root / "generated" / "weather.json")
        return self.builder.build_graph(
            plants=plants,
            zones=zones,
            equipment=equipment,
            sensors=sensors,
            workers=workers,
            worker_locations=worker_locations,
            permits=permits,
            maintenance_records=maintenance_records,
            incidents=incidents,
            weather_records=weather_records,
            risk_events=risk_events,
            recommendations=recommendations,
        )

    async def _fetch(self, model, *, where=None):
        stmt = select(model)
        if hasattr(model, "deleted_at"):
            stmt = stmt.where(model.deleted_at.is_(None))
        if where is not None:
            stmt = stmt.where(where)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    def _neighborhood_graph(
        self, graph: nx.MultiDiGraph, node_id: str, depth: int
    ) -> nx.MultiDiGraph:
        undirected = graph.to_undirected()
        distances = nx.single_source_shortest_path_length(undirected, node_id, cutoff=depth)
        return graph.subgraph(distances.keys()).copy()

    def _impact_analysis(
        self, graph: nx.MultiDiGraph, node_id: str, depth: int
    ) -> GraphImpactAnalysis:
        neighborhood = self._neighborhood_graph(graph, node_id, depth)
        related_nodes = [item for item in neighborhood.nodes if item != node_id]
        prioritized = self._prioritize_nodes(neighborhood, related_nodes)
        relation_types = sorted(
            {
                str(data.get("relation", "RELATED_TO"))
                for _, _, data in neighborhood.edges(data=True)
            }
        )
        critical_targets = [
            item
            for item in prioritized
            if neighborhood.nodes[item].get("node_type") in {"RiskEvent", "Recommendation", "Incident"}
        ][:5]
        critical_paths = []
        undirected = neighborhood.to_undirected()
        for target in critical_targets:
            try:
                critical_paths.append(nx.shortest_path(undirected, source=node_id, target=target))
            except nx.NetworkXNoPath:
                continue
        return GraphImpactAnalysis(
            root_node_id=node_id,
            reachable_node_count=len(related_nodes),
            affected_nodes=[self.builder.serialize_node(neighborhood, item) for item in prioritized[: self.settings.graph_sample_limit]],
            affected_relationships=relation_types,
            critical_paths=critical_paths,
        )

    @staticmethod
    def _prioritize_nodes(graph: nx.MultiDiGraph, node_ids: list[str]) -> list[str]:
        priority = {
            "RiskEvent": 5,
            "Recommendation": 4,
            "Incident": 4,
            "Equipment": 3,
            "Worker": 3,
            "Permit": 2,
            "Maintenance": 2,
            "Sensor": 1,
            "Zone": 1,
            "Plant": 1,
            "Weather": 1,
        }
        return sorted(
            node_ids,
            key=lambda item: (
                priority.get(str(graph.nodes[item].get("node_type")), 0),
                graph.degree(item),
            ),
            reverse=True,
        )

    @staticmethod
    def _load_weather_records(path: Path) -> list[dict]:
        if not path.exists():
            return []
        return json.loads(path.read_text(encoding="utf-8"))
