import os
import tempfile
from datetime import UTC, datetime, timedelta
from unittest import IsolatedAsyncioTestCase

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.base import Base
from app.models.entities import Equipment, Incident, Maintenance, Permit, Plant, Sensor, SensorReading, Worker, WorkerLocation, Zone
from app.models.enums import EquipmentStatus, IncidentStatus, IncidentType, LifecycleStatus, MaintenanceStatus, MaintenanceType, PermitStatus, PermitType, SensorStatus, SeverityLevel
from app.services.risk import RiskService
from app.knowledge_graph.service import KnowledgeGraphService
from app.schemas.risk import RiskAnalysisRequest, SensorSignalInput


class AIEngineIntegrationTests(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.temp_file.close()
        database_url = f"sqlite+aiosqlite:///{self.temp_file.name}"
        self.engine = create_async_engine(database_url, future=True)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False, class_=AsyncSession)
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        await self._seed()

    async def asyncTearDown(self):
        await self.engine.dispose()
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    async def _seed(self):
        async with self.session_factory() as session:
            now = datetime.now(UTC)
            plant = Plant(
                name="Integration Plant",
                location="Mumbai",
                industry="Chemical",
                status=LifecycleStatus.ACTIVE,
            )
            session.add(plant)
            await session.flush()

            zone = Zone(
                plant_id=plant.id,
                zone_name="Reactor Zone",
                risk_level=SeverityLevel.MODERATE,
                description="Integration zone",
            )
            session.add(zone)
            await session.flush()

            equipment = Equipment(
                plant_id=plant.id,
                zone_id=zone.id,
                equipment_name="Reactor Pump",
                equipment_type="pump",
                health_score=22.0,
                status=EquipmentStatus.WARNING,
                external_id="INT-EQ-1",
            )
            session.add(equipment)
            await session.flush()

            gas_sensor = Sensor(
                equipment_id=equipment.id,
                zone_id=zone.id,
                sensor_name="Gas Sensor",
                sensor_type="gas",
                unit="ppm",
                status=SensorStatus.ACTIVE,
            )
            temp_sensor = Sensor(
                equipment_id=equipment.id,
                zone_id=zone.id,
                sensor_name="Temperature Sensor",
                sensor_type="temperature",
                unit="C",
                status=SensorStatus.ACTIVE,
            )
            session.add_all([gas_sensor, temp_sensor])
            await session.flush()

            session.add_all(
                [
                    SensorReading(sensor_id=gas_sensor.id, timestamp=now, value=91.0, quality="good", status="ok", scenario="d05"),
                    SensorReading(sensor_id=temp_sensor.id, timestamp=now, value=78.0, quality="good", status="ok", scenario="d05"),
                    SensorReading(sensor_id=gas_sensor.id, timestamp=now - timedelta(hours=1), value=73.0, quality="good", status="ok", scenario="d03"),
                ]
            )

            worker = Worker(
                worker_code="INT-W-1",
                name="Integration Worker",
                department="Operations",
                designation="Operator",
                status=LifecycleStatus.ACTIVE,
            )
            session.add(worker)
            await session.flush()

            session.add(
                WorkerLocation(
                    worker_id=worker.id,
                    zone_id=zone.id,
                    timestamp=now,
                )
            )

            session.add(
                Permit(
                    permit_number="INT-PTW-1",
                    permit_type=PermitType.HOT_WORK,
                    worker_id=worker.id,
                    zone_id=zone.id,
                    equipment_id=equipment.id,
                    start_time=now,
                    end_time=now + timedelta(hours=2),
                    status=PermitStatus.OPEN,
                    approved_by="Sentinel Admin",
                )
            )

            session.add(
                Maintenance(
                    equipment_id=equipment.id,
                    maintenance_type=MaintenanceType.INSPECTION,
                    status=MaintenanceStatus.RUNNING,
                    assigned_to="Team A",
                    scheduled_date=now,
                    remarks="Integration maintenance",
                )
            )

            session.add(
                Incident(
                    title="Gas release near reactor",
                    description="Gas leak and hot work near reactor pump.",
                    severity=SeverityLevel.HIGH,
                    zone_id=zone.id,
                    equipment_id=equipment.id,
                    worker_id=worker.id,
                    incident_type=IncidentType.GAS_LEAK,
                    root_cause="Gas release during maintenance",
                    status=IncidentStatus.OPEN,
                    reported_at=now - timedelta(days=1),
                    source_dataset="manual",
                )
            )
            await session.commit()

            self.zone_id = zone.id
            self.plant_id = plant.id
            self.equipment_id = equipment.id
            self.gas_sensor_id = gas_sensor.id

    async def test_risk_service_generates_explainable_result(self):
        async with self.session_factory() as session:
            service = RiskService(session)
            result = await service.analyze(
                RiskAnalysisRequest(
                    zone_id=self.zone_id,
                    equipment_id=self.equipment_id,
                    gas_level=92.0,
                    pressure=83.0,
                    temperature=79.0,
                    worker_present=True,
                    maintenance_running=True,
                    equipment_health=22.0,
                    sensor_readings=[
                        SensorSignalInput(sensor_id=self.gas_sensor_id, sensor_type="gas", value=92.0)
                    ],
                    persist_result=True,
                )
            )

        self.assertGreaterEqual(result.risk_score, 80.0)
        self.assertEqual(result.severity.value, "critical")
        self.assertTrue(result.applicable_rules)
        self.assertTrue(result.recommended_actions)
        self.assertTrue(result.historical_similarity)
        self.assertIn("Risk score", result.explainability.why)

    async def test_graph_service_supports_neighbors_and_path(self):
        async with self.session_factory() as session:
            service = KnowledgeGraphService(session)
            overview = await service.overview(plant_id=self.plant_id)
            neighbors = await service.neighbors(self.zone_id, depth=2, plant_id=self.plant_id)

        self.assertGreaterEqual(overview.statistics.node_count, 6)
        self.assertEqual(neighbors.center.id, self.zone_id)
        self.assertGreater(neighbors.impact_analysis.reachable_node_count, 0)
