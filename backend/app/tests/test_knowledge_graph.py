from datetime import UTC, datetime
from types import SimpleNamespace
from unittest import TestCase

from app.knowledge_graph.builder import KnowledgeGraphBuilder


class KnowledgeGraphBuilderTests(TestCase):
    def test_build_graph_supports_path_and_statistics(self):
        builder = KnowledgeGraphBuilder()
        now = datetime.now(UTC)
        plant = SimpleNamespace(id="plant-1", name="Plant A", location="Mumbai", industry="Chemical", status="active")
        zone = SimpleNamespace(id="zone-1", plant_id="plant-1", zone_name="Reactor Zone", risk_level="moderate", description="Core reactor")
        equipment = SimpleNamespace(
            id="eq-1",
            plant_id="plant-1",
            zone_id="zone-1",
            equipment_name="Reactor Pump",
            equipment_type="pump",
            health_score=28.0,
            status="warning",
        )
        sensor = SimpleNamespace(id="sensor-1", equipment_id="eq-1", zone_id="zone-1", sensor_name="Gas Sensor", sensor_type="gas", status="active", unit="ppm")
        worker = SimpleNamespace(id="worker-1", worker_code="W-1", name="Worker One", department="Ops", status="active")
        worker_location = SimpleNamespace(id="loc-1", worker_id="worker-1", zone_id="zone-1", timestamp=now)
        permit = SimpleNamespace(id="permit-1", worker_id="worker-1", zone_id="zone-1", equipment_id="eq-1", permit_number="PTW-1", permit_type="hot_work", status="open")
        maintenance = SimpleNamespace(id="maint-1", equipment_id="eq-1", maintenance_type=SimpleNamespace(value="inspection"), status=SimpleNamespace(value="running"), assigned_to="Team A")
        incident = SimpleNamespace(id="incident-1", zone_id="zone-1", equipment_id="eq-1", worker_id="worker-1", title="Near Miss", incident_type="near_miss", severity="high", status="open")
        risk_event = SimpleNamespace(id="risk-1", zone_id="zone-1", risk_category="Explosion Risk", risk_score=88.0, severity="critical", confidence=0.94, status="open")
        recommendation = SimpleNamespace(id="rec-1", risk_event_id="risk-1", action="Evacuate Zone", priority="critical", status="open")

        graph = builder.build_graph(
            plants=[plant],
            zones=[zone],
            equipment=[equipment],
            sensors=[sensor],
            workers=[worker],
            worker_locations=[worker_location],
            permits=[permit],
            maintenance_records=[maintenance],
            incidents=[incident],
            weather_records=[{"date": "2026-07-16", "condition": "storm", "temperature_c": 29, "humidity": 85, "wind_kph": 20}],
            risk_events=[risk_event],
            recommendations=[recommendation],
        )

        stats = builder.graph_statistics(graph)
        self.assertGreaterEqual(stats.node_count, 10)
        self.assertIn("Plant", stats.node_types)
        self.assertIn("HAS_ZONE", stats.relationship_types)

        path = graph.to_undirected()
        self.assertTrue("rec-1" in path)
        self.assertEqual(path.number_of_nodes(), graph.number_of_nodes())
