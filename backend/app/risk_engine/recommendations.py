from __future__ import annotations

from typing import Any

from app.models.enums import PriorityLevel, SeverityLevel
from app.risk_engine.rules import MatchedRule
from app.schemas.risk import RecommendationAction


class RecommendationEngine:
    def generate(
        self,
        *,
        context: dict[str, Any],
        matched_rules: list[MatchedRule],
        severity: SeverityLevel,
        risk_score: float,
    ) -> list[RecommendationAction]:
        action_map: dict[str, RecommendationAction] = {}

        def upsert(action: RecommendationAction) -> None:
            existing = action_map.get(action.action)
            if existing is None or self._priority_rank(action.priority) > self._priority_rank(existing.priority):
                action_map[action.action] = action

        for match in matched_rules:
            for template in match.config.recommendations:
                upsert(
                    RecommendationAction(
                        action=template.action,
                        priority=template.priority,
                        rationale=template.rationale,
                        target_type=template.target_type,
                        target_id=self._resolve_target_id(template.target_type, context),
                        source_rules=[match.config.id],
                    )
                )

        if severity in {SeverityLevel.HIGH, SeverityLevel.CRITICAL} and (
            context.get("worker_present") or context.get("worker_count", 0) > 0
        ):
            upsert(
                RecommendationAction(
                    action="Evacuate Zone",
                    priority=PriorityLevel.CRITICAL,
                    rationale="Workers are currently exposed to an elevated compound hazard in the affected zone.",
                    target_type="zone",
                    target_id=context.get("zone_id"),
                    source_rules=[match.config.id for match in matched_rules],
                )
            )

        if self._normalized(context.get("permit_type")) == "hot_work" and risk_score >= 65:
            upsert(
                RecommendationAction(
                    action="Suspend Permit",
                    priority=PriorityLevel.HIGH,
                    rationale="Hot work should be suspended while ignition-related risk remains elevated.",
                    target_type="permit",
                    target_id=context.get("active_permit_id"),
                    source_rules=[match.config.id for match in matched_rules],
                )
            )

        if (
            context.get("equipment_health") is not None
            and float(context["equipment_health"]) <= 35
        ) or context.get("maintenance_overdue"):
            upsert(
                RecommendationAction(
                    action="Dispatch Maintenance",
                    priority=PriorityLevel.HIGH,
                    rationale="Maintenance intervention is needed to restore equipment safety margin.",
                    target_type="equipment",
                    target_id=context.get("equipment_id"),
                    source_rules=[match.config.id for match in matched_rules],
                )
            )

        if (
            context.get("equipment_health") is not None
            and float(context["equipment_health"]) <= 25
        ) or severity == SeverityLevel.CRITICAL:
            upsert(
                RecommendationAction(
                    action="Shutdown Equipment",
                    priority=PriorityLevel.CRITICAL if severity == SeverityLevel.CRITICAL else PriorityLevel.HIGH,
                    rationale="Equipment shutdown reduces the chance of escalation while controls are restored.",
                    target_type="equipment",
                    target_id=context.get("equipment_id"),
                    source_rules=[match.config.id for match in matched_rules],
                )
            )

        if (context.get("gas_level") or 0) >= 75 or (context.get("pressure") or 0) >= 80:
            upsert(
                RecommendationAction(
                    action="Increase Ventilation",
                    priority=PriorityLevel.HIGH,
                    rationale="Additional ventilation helps reduce flammable or toxic accumulation risk.",
                    target_type="zone",
                    target_id=context.get("zone_id"),
                    source_rules=[match.config.id for match in matched_rules],
                )
            )

        if severity in {SeverityLevel.MODERATE, SeverityLevel.HIGH, SeverityLevel.CRITICAL}:
            upsert(
                RecommendationAction(
                    action="Notify Safety Officer",
                    priority=PriorityLevel.HIGH if severity != SeverityLevel.CRITICAL else PriorityLevel.CRITICAL,
                    rationale="A responsible safety lead should coordinate risk mitigation and escalation decisions.",
                    target_type="zone",
                    target_id=context.get("zone_id"),
                    source_rules=[match.config.id for match in matched_rules],
                )
            )

        return sorted(
            action_map.values(),
            key=lambda item: (self._priority_rank(item.priority), item.action),
            reverse=True,
        )

    @staticmethod
    def _priority_rank(priority: PriorityLevel) -> int:
        return {
            PriorityLevel.LOW: 1,
            PriorityLevel.MEDIUM: 2,
            PriorityLevel.HIGH: 3,
            PriorityLevel.CRITICAL: 4,
        }[priority]

    @staticmethod
    def _resolve_target_id(target_type: str | None, context: dict[str, Any]) -> str | None:
        if target_type == "zone":
            return context.get("zone_id")
        if target_type == "equipment":
            return context.get("equipment_id")
        if target_type == "permit":
            return context.get("active_permit_id")
        return None

    @staticmethod
    def _normalized(value):
        return getattr(value, "value", value)
