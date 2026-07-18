from __future__ import annotations

from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.entities import Incident, SensorReading
from app.models.enums import IncidentType
from app.schemas.risk import HistoricalSimilarityMatch, SensorSignalInput


class HistoricalSimilarityEngine:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()

    async def find_similar(
        self,
        *,
        context: dict[str, Any],
        sensor_signals: list[SensorSignalInput],
    ) -> list[HistoricalSimilarityMatch]:
        matches = []
        matches.extend(await self._incident_matches(context))
        matches.extend(await self._tennessee_matches(context, sensor_signals))
        matches.sort(key=lambda item: item.similarity_score, reverse=True)
        return matches[: self.settings.similarity_match_limit]

    async def _incident_matches(self, context: dict[str, Any]) -> list[HistoricalSimilarityMatch]:
        candidate_limit = max(self.settings.similarity_match_limit * 12, 60)
        result = await self.session.execute(
            select(Incident).order_by(desc(Incident.reported_at)).limit(candidate_limit)
        )
        incidents = result.scalars().all()
        matches: list[HistoricalSimilarityMatch] = []
        for incident in incidents:
            similarity = self._incident_similarity(context, incident)
            if similarity <= 0:
                continue
            source = "OSHA" if (incident.source_dataset or "").lower() == "osha" else "Historical Incident"
            matches.append(
                HistoricalSimilarityMatch(
                    source=source,
                    reference_id=incident.id,
                    title=incident.title,
                    similarity_score=round(similarity, 2),
                    summary=incident.ai_summary or incident.description[:180],
                    evidence=[
                        factor
                        for factor in (
                            incident.incident_type.value if isinstance(incident.incident_type, IncidentType) else str(incident.incident_type),
                            incident.root_cause or "",
                            incident.source_dataset or "",
                        )
                        if factor
                    ],
                )
            )
        matches.sort(key=lambda item: item.similarity_score, reverse=True)
        return matches[: self.settings.similarity_match_limit]

    async def _tennessee_matches(
        self,
        context: dict[str, Any],
        sensor_signals: list[SensorSignalInput],
    ) -> list[HistoricalSimilarityMatch]:
        if sensor_signals:
            matches = await self._tennessee_vector_matches(sensor_signals)
            if matches:
                return matches[: self.settings.similarity_match_limit]

        result = await self.session.execute(
            select(
                SensorReading.scenario,
                func.avg(func.abs(SensorReading.value)),
                func.max(SensorReading.value),
                func.count(SensorReading.id),
            )
            .where(SensorReading.scenario.is_not(None))
            .group_by(SensorReading.scenario)
        )
        rows = result.all()
        if not rows:
            return []

        max_intensity = max(float(row[1] or 1.0) for row in rows) or 1.0
        target_intensity = self._target_intensity(context)
        matches = []
        for scenario, avg_abs, max_value, count in rows:
            normalized = min(float(avg_abs or 0.0) / max_intensity, 1.0)
            similarity = max(0.0, 100 - abs((target_intensity * 100) - (normalized * 100)))
            if str(scenario).lower() == "d00" and target_intensity > 0.35:
                similarity = max(0.0, similarity - 25)
            matches.append(
                HistoricalSimilarityMatch(
                    source="Tennessee Fault",
                    reference_id=str(scenario),
                    title=f"Tennessee Eastman Scenario {str(scenario).upper()}",
                    similarity_score=round(similarity, 2),
                    summary=(
                        f"Processed benchmark pattern with average absolute signal intensity "
                        f"{float(avg_abs or 0.0):.2f} across {int(count or 0)} readings."
                    ),
                    evidence=[
                        f"scenario={scenario}",
                        f"max_value={float(max_value or 0.0):.2f}",
                    ],
                )
            )
        matches.sort(key=lambda item: item.similarity_score, reverse=True)
        return matches[: self.settings.similarity_match_limit]

    async def _tennessee_vector_matches(
        self, sensor_signals: list[SensorSignalInput]
    ) -> list[HistoricalSimilarityMatch]:
        sensor_ids = [item.sensor_id for item in sensor_signals if item.sensor_id]
        if not sensor_ids:
            return []
        result = await self.session.execute(
            select(
                SensorReading.scenario,
                SensorReading.sensor_id,
                func.avg(SensorReading.value),
            )
            .where(
                SensorReading.scenario.is_not(None),
                SensorReading.sensor_id.in_(sensor_ids),
            )
            .group_by(SensorReading.scenario, SensorReading.sensor_id)
        )
        rows = result.all()
        if not rows:
            return []

        target_vector = {item.sensor_id: item.value for item in sensor_signals if item.sensor_id}
        scenarios: dict[str, dict[str, float]] = {}
        for scenario, sensor_id, avg_value in rows:
            scenarios.setdefault(str(scenario), {})[str(sensor_id)] = float(avg_value or 0.0)

        matches = []
        for scenario, vector in scenarios.items():
            similarity = self._vector_similarity(target_vector, vector)
            matches.append(
                HistoricalSimilarityMatch(
                    source="Tennessee Fault",
                    reference_id=scenario,
                    title=f"Tennessee Eastman Scenario {scenario.upper()}",
                    similarity_score=round(similarity, 2),
                    summary="Similarity derived from processed Tennessee sensor vectors.",
                    evidence=[f"sensor_count={len(vector)}"],
                )
            )
        matches.sort(key=lambda item: item.similarity_score, reverse=True)
        return matches

    @staticmethod
    def _incident_similarity(context: dict[str, Any], incident: Incident) -> float:
        score = 0.0
        text = " ".join(
            filter(
                None,
                [
                    incident.title,
                    incident.description,
                    incident.root_cause,
                    incident.incident_type.value if hasattr(incident.incident_type, "value") else str(incident.incident_type),
                ],
            )
        ).lower()

        if (context.get("gas_level") or 0) >= 70 and any(token in text for token in ("gas", "leak", "vapor", "fume")):
            score += 34
        if (context.get("temperature") or 0) >= 70 and any(token in text for token in ("fire", "heat", "burn", "thermal")):
            score += 22
        if (context.get("pressure") or 0) >= 75 and any(token in text for token in ("pressure", "rupture", "explosion")):
            score += 20
        if context.get("maintenance_running") or context.get("maintenance_overdue"):
            if any(token in text for token in ("maintenance", "inspection", "repair", "equipment")):
                score += 10
        if HistoricalSimilarityEngine._normalized(context.get("permit_type")) == "hot_work" and any(
            token in text for token in ("hot work", "welding", "spark", "fire")
        ):
            score += 14
        if context.get("worker_present") and incident.worker_id:
            score += 8
        if context.get("zone_id") and incident.zone_id == context.get("zone_id"):
            score += 8
        if context.get("equipment_id") and incident.equipment_id == context.get("equipment_id"):
            score += 8
        if incident.severity.value in {"high", "critical"}:
            score += 6
        return min(score, 100.0)

    @staticmethod
    def _target_intensity(context: dict[str, Any]) -> float:
        components = []
        for key in ("gas_level", "temperature", "pressure", "humidity", "vibration"):
            if context.get(key) is not None:
                components.append(min(max(float(context[key]) / 100.0, 0.0), 1.0))
        if context.get("equipment_health") is not None:
            components.append(min(max((100 - float(context["equipment_health"])) / 100.0, 0.0), 1.0))
        return sum(components) / len(components) if components else 0.35

    @staticmethod
    def _vector_similarity(target_vector: dict[str, float], reference_vector: dict[str, float]) -> float:
        shared = sorted(set(target_vector) & set(reference_vector))
        if not shared:
            return 0.0
        numerator = sum(target_vector[key] * reference_vector[key] for key in shared)
        target_norm = sum(target_vector[key] ** 2 for key in shared) ** 0.5
        reference_norm = sum(reference_vector[key] ** 2 for key in shared) ** 0.5
        if not target_norm or not reference_norm:
            return 0.0
        cosine = numerator / (target_norm * reference_norm)
        return max(0.0, min(cosine * 100, 100.0))

    @staticmethod
    def _normalized(value):
        return getattr(value, "value", value)
