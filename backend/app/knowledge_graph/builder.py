from __future__ import annotations

from datetime import date, datetime
from typing import Any, Iterable

import networkx as nx

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
from app.schemas.graph import GraphEdge, GraphNode, GraphStatistics


class KnowledgeGraphBuilder:
    def build_graph(
        self,
        *,
        plants: Iterable[Plant] = (),
        zones: Iterable[Zone] = (),
        equipment: Iterable[Equipment] = (),
        sensors: Iterable[Sensor] = (),
        workers: Iterable[Worker] = (),
        worker_locations: Iterable[WorkerLocation] = (),
        permits: Iterable[Permit] = (),
        maintenance_records: Iterable[Maintenance] = (),
        incidents: Iterable[Incident] = (),
        weather_records: Iterable[dict[str, Any]] = (),
        risk_events: Iterable[RiskEvent] = (),
        recommendations: Iterable[Recommendation] = (),
    ) -> nx.MultiDiGraph:
        graph = nx.MultiDiGraph()

        latest_locations: dict[str, WorkerLocation] = {}
        for location in sorted(worker_locations, key=lambda item: item.timestamp, reverse=True):
            latest_locations.setdefault(location.worker_id, location)

        for plant in plants:
            self._add_node(
                graph,
                plant.id,
                "Plant",
                plant.name,
                {"location": plant.location, "industry": plant.industry, "status": plant.status},
            )

        for zone in zones:
            self._add_node(
                graph,
                zone.id,
                "Zone",
                zone.zone_name,
                {"risk_level": zone.risk_level, "description": zone.description},
            )
            self._add_edge(graph, zone.plant_id, zone.id, "HAS_ZONE")

        for item in equipment:
            self._add_node(
                graph,
                item.id,
                "Equipment",
                item.equipment_name,
                {"equipment_type": item.equipment_type, "health_score": item.health_score, "status": item.status},
            )
            self._add_edge(graph, item.plant_id, item.id, "HAS_EQUIPMENT")
            if item.zone_id:
                self._add_edge(graph, item.zone_id, item.id, "CONTAINS_EQUIPMENT")

        for sensor in sensors:
            self._add_node(
                graph,
                sensor.id,
                "Sensor",
                sensor.sensor_name,
                {"sensor_type": sensor.sensor_type, "status": sensor.status, "unit": sensor.unit},
            )
            if sensor.equipment_id:
                self._add_edge(graph, sensor.equipment_id, sensor.id, "HAS_SENSOR")
            if sensor.zone_id:
                self._add_edge(graph, sensor.zone_id, sensor.id, "MONITORS_ZONE")

        for worker in workers:
            self._add_node(
                graph,
                worker.id,
                "Worker",
                worker.name,
                {"worker_code": worker.worker_code, "department": worker.department, "status": worker.status},
            )
            latest_location = latest_locations.get(worker.id)
            if latest_location:
                self._add_edge(graph, worker.id, latest_location.zone_id, "PRESENT_IN")

        for permit in permits:
            self._add_node(
                graph,
                permit.id,
                "Permit",
                permit.permit_number,
                {"permit_type": permit.permit_type, "status": permit.status},
            )
            if permit.worker_id:
                self._add_edge(graph, permit.worker_id, permit.id, "HOLDS_PERMIT")
            if permit.zone_id:
                self._add_edge(graph, permit.id, permit.zone_id, "ACTIVE_IN")
            if permit.equipment_id:
                self._add_edge(graph, permit.id, permit.equipment_id, "COVERS_EQUIPMENT")

        for record in maintenance_records:
            self._add_node(
                graph,
                record.id,
                "Maintenance",
                f"{record.maintenance_type.value}:{record.status.value}",
                {"maintenance_type": record.maintenance_type, "status": record.status, "assigned_to": record.assigned_to},
            )
            self._add_edge(graph, record.id, record.equipment_id, "MAINTAINS")

        for incident in incidents:
            self._add_node(
                graph,
                incident.id,
                "Incident",
                incident.title,
                {"incident_type": incident.incident_type, "severity": incident.severity, "status": incident.status},
            )
            if incident.zone_id:
                self._add_edge(graph, incident.zone_id, incident.id, "HAS_INCIDENT")
            if incident.equipment_id:
                self._add_edge(graph, incident.equipment_id, incident.id, "INVOLVED_IN")
            if incident.worker_id:
                self._add_edge(graph, incident.worker_id, incident.id, "AFFECTED_BY")

        for risk_event in risk_events:
            self._add_node(
                graph,
                risk_event.id,
                "RiskEvent",
                f"{risk_event.risk_category}:{risk_event.risk_score:.1f}",
                {
                    "severity": risk_event.severity,
                    "confidence": risk_event.confidence,
                    "status": risk_event.status,
                },
            )
            if risk_event.zone_id:
                self._add_edge(graph, risk_event.zone_id, risk_event.id, "HAS_RISK")

        for action in recommendations:
            self._add_node(
                graph,
                action.id,
                "Recommendation",
                action.action,
                {"priority": action.priority, "status": action.status},
            )
            if action.risk_event_id:
                self._add_edge(graph, action.risk_event_id, action.id, "REQUIRES_ACTION")

        for weather in weather_records:
            node_id = f"weather:{weather.get('date', 'unknown')}"
            label = f"{weather.get('condition', 'unknown')}:{weather.get('date', 'unknown')}"
            self._add_node(
                graph,
                node_id,
                "Weather",
                label,
                {
                    "condition": weather.get("condition"),
                    "temperature_c": weather.get("temperature_c"),
                    "humidity": weather.get("humidity"),
                    "wind_kph": weather.get("wind_kph"),
                },
            )
            for plant in plants:
                self._add_edge(graph, node_id, plant.id, "AFFECTS_PLANT")
            for zone in zones:
                self._add_edge(graph, node_id, zone.id, "AFFECTS_ZONE")

        return graph

    def build_summary(
        self,
        *,
        zone: Zone | None,
        risks: list[RiskEvent],
        incidents: list[Incident],
        permits: list[Permit],
        workers: list[Worker],
        recommendations: list[Recommendation],
    ) -> dict:
        graph = self.build_graph(
            zones=[zone] if zone else [],
            workers=workers,
            permits=permits,
            incidents=incidents,
            risk_events=risks,
            recommendations=recommendations,
        )
        return {
            "nodes": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "summary": " -> ".join(data["label"] for _, data in graph.nodes(data=True))
            or "No graph context available.",
        }

    def graph_statistics(self, graph: nx.MultiDiGraph) -> GraphStatistics:
        node_types: dict[str, int] = {}
        relationship_types: dict[str, int] = {}
        for _, data in graph.nodes(data=True):
            node_type = str(data.get("node_type", "Unknown"))
            node_types[node_type] = node_types.get(node_type, 0) + 1
        for _, _, data in graph.edges(data=True):
            relation = str(data.get("relation", "RELATED_TO"))
            relationship_types[relation] = relationship_types.get(relation, 0) + 1
        return GraphStatistics(
            node_count=graph.number_of_nodes(),
            edge_count=graph.number_of_edges(),
            node_types=node_types,
            relationship_types=relationship_types,
        )

    def serialize_node(self, graph: nx.MultiDiGraph, node_id: str) -> GraphNode:
        data = graph.nodes[node_id]
        return GraphNode(
            id=node_id,
            node_type=str(data.get("node_type", "Unknown")),
            label=str(data.get("label", node_id)),
            attributes=dict(data.get("attributes", {})),
        )

    def serialize_edge(
        self, source: str, target: str, relation: str, attributes: dict[str, Any] | None = None
    ) -> GraphEdge:
        return GraphEdge(
            source=source,
            target=target,
            relation=relation,
            attributes=attributes or {},
        )

    def extract_edges(self, graph: nx.MultiDiGraph, node_ids: set[str]) -> list[GraphEdge]:
        edges: list[GraphEdge] = []
        for source, target, data in graph.edges(data=True):
            if source not in node_ids or target not in node_ids:
                continue
            edges.append(
                self.serialize_edge(
                    source,
                    target,
                    str(data.get("relation", "RELATED_TO")),
                    dict(data.get("attributes", {})),
                )
            )
        return edges

    def _add_node(
        self,
        graph: nx.MultiDiGraph,
        node_id: str,
        node_type: str,
        label: str,
        attributes: dict[str, Any] | None = None,
    ) -> None:
        graph.add_node(
            node_id,
            node_type=node_type,
            label=label,
            attributes={key: self._normalize(value) for key, value in (attributes or {}).items()},
        )

    @staticmethod
    def _add_edge(graph: nx.MultiDiGraph, source: str | None, target: str | None, relation: str) -> None:
        if source and target and graph.has_node(source) and graph.has_node(target):
            graph.add_edge(source, target, relation=relation)

    @staticmethod
    def _normalize(value: Any) -> Any:
        if hasattr(value, "value"):
            return getattr(value, "value")
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, dict):
            return {key: KnowledgeGraphBuilder._normalize(item) for key, item in value.items()}
        if isinstance(value, list):
            return [KnowledgeGraphBuilder._normalize(item) for item in value]
        return value
