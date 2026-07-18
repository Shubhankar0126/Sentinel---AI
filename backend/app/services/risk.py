from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path

from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.knowledge_graph.service import KnowledgeGraphService
from app.models.entities import Equipment, Incident, Maintenance, Permit, Recommendation, RiskEvent, Sensor, SensorReading, Worker, WorkerLocation, Zone
from app.models.enums import (
    MaintenanceStatus,
    PermitStatus,
    PriorityLevel,
    SeverityLevel,
    NotificationType,
)
from app.repositories.entities import ( NotificationRepository, RecommendationRepository, RiskEventRepository,ZoneRepository,)
from app.risk_engine.compound import CompoundRiskEngine
from app.risk_engine.explainability import ExplainabilityEngine
from app.risk_engine.recommendations import RecommendationEngine
from app.risk_engine.rules import RuleEngine
from app.risk_engine.similarity import HistoricalSimilarityEngine
from app.schemas.domain import   NotificationCreate, RecommendationCreate, RiskEventCreate
from app.schemas.risk import RiskAnalysisRequest, RiskAnalysisResult, SensorSignalInput


class RiskService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()
        self.rule_engine = RuleEngine()
        self.compound_engine = CompoundRiskEngine()
        self.recommendation_engine = RecommendationEngine()
        self.explainability_engine = ExplainabilityEngine()
        self.similarity_engine = HistoricalSimilarityEngine(session)
        self.graph_service = KnowledgeGraphService(session)
        self.zone_repository = ZoneRepository(session)
        self.risk_repository = RiskEventRepository(session)
        self.recommendation_repository = RecommendationRepository(session)
        self.notification_repository = NotificationRepository(session)

    async def analyze(self, payload: RiskAnalysisRequest) -> RiskAnalysisResult:
        context = await self._build_context(payload)
        historical_similarity = await self.similarity_engine.find_similar(
            context=context,
            sensor_signals=payload.sensor_readings,
        )
        computed_similarity = historical_similarity[0].similarity_score if historical_similarity else 0.0
        context["historical_similarity"] = max(float(payload.historical_similarity or 0.0), computed_similarity)

        matched_rules = self.rule_engine.evaluate(context)
        computation = self.compound_engine.calculate(
            context=context,
            matched_rules=matched_rules,
            historical_similarity=historical_similarity,
        )
        recommended_actions = self.recommendation_engine.generate(
            context=context,
            matched_rules=matched_rules,
            severity=computation["severity"],
            risk_score=computation["risk_score"],
        )
        top_recommendation = (
            recommended_actions[0].action
            if recommended_actions
            else "Continue monitoring and maintain current controls."
        )

        graph_insights = await self._graph_insights(context)
        explainability = self.explainability_engine.build(
            risk_score=computation["risk_score"],
            severity=computation["severity"].value,
            evidence=computation["evidence"],
            rules=[match.result for match in matched_rules],
            historical_similarity=historical_similarity,
            recommended_actions=recommended_actions,
            graph_insights=graph_insights,
        )

        risk_event = None
        recommendations_created = []
        if payload.persist_result:
            risk_event = await self.risk_repository.create(
                RiskEventCreate(
                    zone_id=context.get("zone_id") or None,
                    risk_score=computation["risk_score"],
                    severity=computation["severity"],
                    confidence=computation["confidence"],
                    risk_category=computation["risk_category"],
                    reason=computation["reason"],
                    recommendation=top_recommendation,
                    expected_consequence=computation["expected_consequence"],
                    evidence=computation["evidence"],
                    affected_assets=context.get("affected_assets", []),
                    affected_workers=context.get("affected_workers", []),
                ).model_dump()
            )
            for action in recommended_actions:
                recommendations_created.append(
                    await self.recommendation_repository.create(
                        RecommendationCreate(
                            risk_event_id=risk_event.id,
                            action=action.action,
                            priority=action.priority,
                            assigned_to="Safety Officer" if "Safety Officer" in action.action else None,
                        ).model_dump()
                    )
                )
            if computation["severity"] in (
                SeverityLevel.HIGH,
                SeverityLevel.CRITICAL,
            ):
                notification_type = (
                    NotificationType.CRITICAL
                    if computation["severity"] == SeverityLevel.CRITICAL
                    else NotificationType.WARNING
                )

                priority = (
                    PriorityLevel.CRITICAL
                    if computation["severity"] == SeverityLevel.CRITICAL
                    else PriorityLevel.HIGH
                )

                await self.notification_repository.create(
                    NotificationCreate(
                        user_id=None,
                        title=f"{computation['severity'].value.title()} Risk Detected",
                        message=(
                            f"{computation['reason']}\n\n"
                            f"Risk Score: {computation['risk_score']:.1f}\n"
                            f"Confidence: {computation['confidence']:.1f}%\n\n"
                            f"Recommended Action:\n"
                            f"{top_recommendation}"
                        ),
                        type=notification_type,
                        priority=priority,
                        read=False,
                    ).model_dump()
                )
            await self.session.commit()
            await self.session.refresh(risk_event)

        return RiskAnalysisResult(
            risk_score=computation["risk_score"],
            severity=computation["severity"],
            confidence=computation["confidence"],
            risk_category=computation["risk_category"],
            reason=computation["reason"],
            root_cause=computation["root_cause"],
            recommendation=top_recommendation,
            expected_consequence=computation["expected_consequence"],
            regulations=computation["regulations"],
            evidence=computation["evidence"],
            applicable_rules=[match.result for match in matched_rules],
            historical_similarity=historical_similarity,
            recommended_actions=recommended_actions,
            explainability=explainability,
            graph_insights=graph_insights,
            risk_event=risk_event,
            recommendations_created=recommendations_created,
        )

    async def history(self):
        return await self.risk_repository.history()

    async def live(self):
        return await self.risk_repository.live()

    async def _build_context(self, payload: RiskAnalysisRequest) -> dict:
        context = payload.model_dump()
        zone = await self.zone_repository.get(payload.zone_id) if payload.zone_id else None
        equipment = await self._get_equipment(payload.equipment_id) if payload.equipment_id else None

        if equipment and context.get("equipment_health") is None:
            context["equipment_health"] = equipment.health_score
        if zone:
            context["plant_id"] = zone.plant_id
        elif equipment:
            context["plant_id"] = equipment.plant_id

        zone_equipment = await self._zone_equipment(zone.id) if zone else ([] if not equipment else [equipment])
        if equipment and all(item.id != equipment.id for item in zone_equipment):
            zone_equipment.append(equipment)
        equipment_ids = {item.id for item in zone_equipment if item.id}
        if equipment and not context.get("equipment_id"):
            context["equipment_id"] = equipment.id

        sensors = await self._sensors_for_context(zone_id=payload.zone_id, equipment_ids=equipment_ids)
        latest_readings = await self._latest_sensor_readings([item.id for item in sensors])
        sensor_inputs = list(payload.sensor_readings)
        sensor_inputs.extend(self._sensor_inputs_from_db(sensors, latest_readings))
        context["sensor_readings"] = [item.model_dump(mode="json") for item in sensor_inputs]
        self._merge_sensor_signals(context, sensor_inputs)

        worker_locations = await self._worker_locations(payload.zone_id)
        latest_locations = self._latest_locations(worker_locations)
        workers = await self._workers_for_locations(latest_locations)
        context["worker_count"] = max(context.get("worker_count", 0), len(workers))
        context["worker_present"] = bool(context.get("worker_present")) or len(workers) > 0
        context["worker_ids"] = list({*context.get("worker_ids", []), *[worker.id for worker in workers]})
        context["affected_workers"] = [
            {
                "id": worker.id,
                "name": worker.name,
                "worker_code": worker.worker_code,
            }
            for worker in workers
        ]

        permits = await self._open_permits(zone_id=payload.zone_id, equipment_ids=equipment_ids)
        context["open_permit_count"] = len(permits)
        context["active_permit_id"] = permits[0].id if permits else None
        if context.get("permit_type") is None and permits:
            context["permit_type"] = permits[0].permit_type

        maintenance_records = await self._maintenance_records(equipment_ids)
        context["maintenance_running"] = bool(context.get("maintenance_running")) or any(
            item.status == MaintenanceStatus.RUNNING for item in maintenance_records
        )
        context["maintenance_overdue"] = bool(context.get("maintenance_overdue")) or any(
            item.status == MaintenanceStatus.OVERDUE for item in maintenance_records
        )
        context["affected_assets"] = [
            {
                "id": item.id,
                "name": item.equipment_name,
                "health_score": item.health_score,
                "zone_id": item.zone_id,
            }
            for item in zone_equipment
        ]

        incidents = await self._historical_incidents(zone_id=payload.zone_id, equipment_ids=equipment_ids)
        context["historical_incident_count"] = len(incidents)

        weather = self._current_weather()
        if context.get("weather_condition") is None:
            context["weather_condition"] = weather.get("condition")
        if context.get("weather_temperature_c") is None:
            context["weather_temperature_c"] = weather.get("temperature_c")
        if context.get("weather_humidity") is None:
            context["weather_humidity"] = weather.get("humidity")
        if context.get("wind_kph") is None:
            context["wind_kph"] = weather.get("wind_kph")

        return context

    async def _graph_insights(self, context: dict) -> dict | None:
        root_node_id = context.get("zone_id") or context.get("equipment_id")
        if not root_node_id:
            return None
        try:
            analysis = await self.graph_service.impact_analysis(
                root_node_id,
                depth=self.settings.graph_default_depth,
                plant_id=context.get("plant_id"),
            )
        except ValueError:
            return None
        return analysis.model_dump(mode="json")

    async def _get_equipment(self, equipment_id: str) -> Equipment | None:
        result = await self.session.execute(
            select(Equipment).where(Equipment.id == equipment_id, Equipment.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def _zone_equipment(self, zone_id: str) -> list[Equipment]:
        result = await self.session.execute(
            select(Equipment).where(Equipment.zone_id == zone_id, Equipment.deleted_at.is_(None))
        )
        return result.scalars().all()

    async def _sensors_for_context(self, *, zone_id: str | None, equipment_ids: set[str]) -> list[Sensor]:
        conditions = []
        if zone_id:
            conditions.append(Sensor.zone_id == zone_id)
        if equipment_ids:
            conditions.append(Sensor.equipment_id.in_(equipment_ids))
        if not conditions:
            return []
        result = await self.session.execute(
            select(Sensor).where(or_(*conditions), Sensor.deleted_at.is_(None))
        )
        return result.scalars().all()

    async def _latest_sensor_readings(self, sensor_ids: list[str]) -> dict[str, SensorReading]:
        if not sensor_ids:
            return {}
        result = await self.session.execute(
            select(SensorReading)
            .where(SensorReading.sensor_id.in_(sensor_ids))
            .order_by(desc(SensorReading.timestamp))
        )
        latest: dict[str, SensorReading] = {}
        for reading in result.scalars().all():
            latest.setdefault(reading.sensor_id, reading)
        return latest

    async def _worker_locations(self, zone_id: str | None) -> list[WorkerLocation]:
        if not zone_id:
            return []
        result = await self.session.execute(
            select(WorkerLocation)
            .where(WorkerLocation.zone_id == zone_id)
            .order_by(desc(WorkerLocation.timestamp))
        )
        return result.scalars().all()

    async def _workers_for_locations(self, locations: dict[str, WorkerLocation]) -> list[Worker]:
        worker_ids = list(locations)
        if not worker_ids:
            return []
        result = await self.session.execute(
            select(Worker).where(Worker.id.in_(worker_ids), Worker.deleted_at.is_(None))
        )
        return result.scalars().all()

    async def _open_permits(self, *, zone_id: str | None, equipment_ids: set[str]) -> list[Permit]:
        conditions = [Permit.status == PermitStatus.OPEN, Permit.deleted_at.is_(None)]
        scoped = []
        if zone_id:
            scoped.append(Permit.zone_id == zone_id)
        if equipment_ids:
            scoped.append(Permit.equipment_id.in_(equipment_ids))
        if scoped:
            conditions.append(or_(*scoped))
        result = await self.session.execute(select(Permit).where(*conditions))
        return result.scalars().all()

    async def _maintenance_records(self, equipment_ids: set[str]) -> list[Maintenance]:
        if not equipment_ids:
            return []
        result = await self.session.execute(
            select(Maintenance).where(
                Maintenance.equipment_id.in_(equipment_ids),
                Maintenance.deleted_at.is_(None),
            )
        )
        return result.scalars().all()

    async def _historical_incidents(self, *, zone_id: str | None, equipment_ids: set[str]) -> list[Incident]:
        conditions = [Incident.deleted_at.is_(None)]
        scoped = []
        if zone_id:
            scoped.append(Incident.zone_id == zone_id)
        if equipment_ids:
            scoped.append(Incident.equipment_id.in_(equipment_ids))
        if scoped:
            conditions.append(or_(*scoped))
        result = await self.session.execute(
            select(Incident).where(*conditions).order_by(desc(Incident.reported_at))
        )
        return result.scalars().all()

    @staticmethod
    def _latest_locations(locations: list[WorkerLocation]) -> dict[str, WorkerLocation]:
        latest: dict[str, WorkerLocation] = {}
        for location in locations:
            latest.setdefault(location.worker_id, location)
        return latest

    @staticmethod
    def _sensor_inputs_from_db(
        sensors: list[Sensor], latest_readings: dict[str, SensorReading]
    ) -> list[SensorSignalInput]:
        inputs: list[SensorSignalInput] = []
        for sensor in sensors:
            reading = latest_readings.get(sensor.id)
            if not reading:
                continue
            inputs.append(
                SensorSignalInput(
                    sensor_id=sensor.id,
                    sensor_name=sensor.sensor_name,
                    sensor_type=sensor.sensor_type,
                    value=reading.value,
                    unit=sensor.unit,
                    timestamp=reading.timestamp,
                )
            )
        return inputs

    @staticmethod
    def _merge_sensor_signals(context: dict, sensor_inputs: list[SensorSignalInput]) -> None:
        mappings = {
            "gas": "gas_level",
            "temperature": "temperature",
            "pressure": "pressure",
            "humidity": "humidity",
            "vibration": "vibration",
        }
        for item in sensor_inputs:
            haystack = f"{item.sensor_type or ''} {item.sensor_name or ''}".lower()
            for keyword, field_name in mappings.items():
                if keyword not in haystack or context.get(field_name) is not None:
                    continue
                context[field_name] = item.value

    def _current_weather(self) -> dict:
        weather_path = self.settings.dataset_root / "generated" / "weather.json"
        if not weather_path.exists():
            return {}
        records = json.loads(weather_path.read_text(encoding="utf-8"))
        today = datetime.now(UTC).date().isoformat()
        for item in records:
            if item.get("date") == today:
                return item
        return records[0] if records else {}
