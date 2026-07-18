from __future__ import annotations

from typing import Any

from app.models.enums import SeverityLevel
from app.risk_engine.rules import MatchedRule
from app.schemas.risk import HistoricalSimilarityMatch


class CompoundRiskEngine:
    def calculate(
        self,
        *,
        context: dict[str, Any],
        matched_rules: list[MatchedRule],
        historical_similarity: list[HistoricalSimilarityMatch],
    ) -> dict[str, Any]:
        component_evidence = self._component_evidence(context)
        component_score = sum(item["score"] for item in component_evidence)
        rule_score = sum(item.config.score_delta for item in matched_rules)
        similarity_score = min(
            max((historical_similarity[0].similarity_score if historical_similarity else 0.0) * 0.08, 0.0),
            10.0,
        )
        total_score = min(round(component_score + rule_score + similarity_score, 2), 100.0)
        severity = self._severity_for_score(total_score)
        dominant_rule = matched_rules[0].result if matched_rules else None
        category = dominant_rule.risk_category if dominant_rule else self._resolve_fallback_category(context)
        reason = dominant_rule.reason if dominant_rule else self._fallback_reason(component_evidence)
        regulations = list(
            dict.fromkeys(reg for match in matched_rules for reg in match.result.regulations)
        )
        confidence = self._confidence(context, matched_rules, historical_similarity)
        evidence = [
            {
                "signal": item["signal"],
                "value": item["value"],
                "score": round(item["score"], 2),
                "reason": item["reason"],
            }
            for item in component_evidence
            if item["score"] > 0
        ]
        for match in matched_rules:
            evidence.append(
                {
                    "signal": f"rule:{match.result.rule_id}",
                    "value": match.result.score_delta,
                    "score": match.result.score_delta,
                    "reason": match.result.reason,
                }
            )

        return {
            "risk_score": total_score,
            "severity": severity,
            "confidence": confidence,
            "risk_category": category,
            "reason": reason,
            "root_cause": reason,
            "expected_consequence": self._expected_consequence(severity, category),
            "regulations": regulations,
            "evidence": evidence,
        }

    def _component_evidence(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        return [
            self._scale_component(
                "gas_level",
                context.get("gas_level"),
                low=45.0,
                high=100.0,
                weight=22.0,
                reason="Gas concentration is increasing ignition and exposure risk.",
            ),
            self._scale_component(
                "temperature",
                context.get("temperature"),
                low=45.0,
                high=100.0,
                weight=12.0,
                reason="Elevated temperature increases thermal escalation risk.",
            ),
            self._scale_component(
                "pressure",
                context.get("pressure"),
                low=55.0,
                high=100.0,
                weight=12.0,
                reason="Elevated pressure increases rupture and release risk.",
            ),
            self._scale_component(
                "humidity",
                context.get("humidity"),
                low=70.0,
                high=100.0,
                weight=4.0,
                reason="Humidity is contributing to unstable operating conditions.",
            ),
            self._scale_component(
                "vibration",
                context.get("vibration"),
                low=35.0,
                high=100.0,
                weight=6.0,
                reason="Vibration indicates potential mechanical instability.",
            ),
            self._inverse_component(
                "equipment_health",
                context.get("equipment_health"),
                low=100.0,
                high=0.0,
                weight=15.0,
                reason="Equipment health is degrading the operating safety margin.",
            ),
            self._boolean_component(
                "worker_presence",
                bool(context.get("worker_present")) or int(context.get("worker_count") or 0) > 0,
                weight=8.0,
                value=context.get("worker_count", 0),
                reason="Workers are exposed inside the affected operating area.",
            ),
            self._boolean_component(
                "maintenance_running",
                bool(context.get("maintenance_running")),
                weight=8.0,
                value=True,
                reason="Concurrent maintenance is increasing interaction complexity.",
            ),
            self._boolean_component(
                "maintenance_overdue",
                bool(context.get("maintenance_overdue")),
                weight=10.0,
                value=True,
                reason="Overdue maintenance increases latent equipment failure risk.",
            ),
            self._scale_component(
                "open_permit_count",
                float(context.get("open_permit_count", 0)),
                low=1.0,
                high=5.0,
                weight=5.0,
                reason="Multiple concurrent permits increase control complexity.",
            ),
            self._scale_component(
                "historical_incident_count",
                float(context.get("historical_incident_count", 0)),
                low=1.0,
                high=8.0,
                weight=6.0,
                reason="The area has a recurring incident history.",
            ),
            self._boolean_component(
                "weather_condition",
                str(context.get("weather_condition", "")).lower() in {"rain", "storm"},
                weight=5.0,
                value=context.get("weather_condition"),
                reason="Weather conditions are reducing the safety buffer around the operation.",
            ),
        ]

    @staticmethod
    def _scale_component(
        signal: str,
        value: float | None,
        *,
        low: float,
        high: float,
        weight: float,
        reason: str,
    ) -> dict[str, Any]:
        if value is None:
            return {"signal": signal, "value": None, "score": 0.0, "reason": reason}
        bounded = max(min((float(value) - low) / max(high - low, 1e-6), 1.0), 0.0)
        return {"signal": signal, "value": value, "score": bounded * weight, "reason": reason}

    @staticmethod
    def _inverse_component(
        signal: str,
        value: float | None,
        *,
        low: float,
        high: float,
        weight: float,
        reason: str,
    ) -> dict[str, Any]:
        if value is None:
            return {"signal": signal, "value": None, "score": 0.0, "reason": reason}
        span = max(low - high, 1e-6)
        bounded = max(min((low - float(value)) / span, 1.0), 0.0)
        return {"signal": signal, "value": value, "score": bounded * weight, "reason": reason}

    @staticmethod
    def _boolean_component(
        signal: str,
        triggered: bool,
        *,
        weight: float,
        value: Any,
        reason: str,
    ) -> dict[str, Any]:
        return {"signal": signal, "value": value, "score": weight if triggered else 0.0, "reason": reason}

    @staticmethod
    def _severity_for_score(score: float) -> SeverityLevel:
        if score < 20:
            return SeverityLevel.SAFE
        if score < 45:
            return SeverityLevel.LOW
        if score < 70:
            return SeverityLevel.MODERATE
        if score < 85:
            return SeverityLevel.HIGH
        return SeverityLevel.CRITICAL

    @staticmethod
    def _resolve_fallback_category(context: dict[str, Any]) -> str:
        if (context.get("gas_level") or 0) >= 70:
            return "Toxic Release"
        if (context.get("pressure") or 0) >= 75 or (context.get("temperature") or 0) >= 70:
            return "Process Upset"
        if (context.get("equipment_health") or 100) <= 25:
            return "Equipment Failure"
        return "Operational Safety"

    @staticmethod
    def _fallback_reason(component_evidence: list[dict[str, Any]]) -> str:
        active = [item["reason"] for item in component_evidence if item["score"] > 0]
        if not active:
            return "No elevated compound hazard pattern was detected."
        return active[0]

    @staticmethod
    def _expected_consequence(severity: SeverityLevel, category: str) -> str:
        consequences = {
            SeverityLevel.SAFE: "No immediate compound hazard is expected if current controls remain in place.",
            SeverityLevel.LOW: "Localized disruption or limited exposure is possible without corrective action.",
            SeverityLevel.MODERATE: "Operational incident escalation is possible if controls degrade further.",
            SeverityLevel.HIGH: "Serious injury, process upset, or major equipment damage is likely without intervention.",
            SeverityLevel.CRITICAL: "A major accident scenario such as explosion, fire, or toxic exposure is imminent.",
        }
        return f"{consequences[severity]} Category: {category}."

    @staticmethod
    def _confidence(
        context: dict[str, Any],
        matched_rules: list[MatchedRule],
        historical_similarity: list[HistoricalSimilarityMatch],
    ) -> float:
        available_sources = 0
        for field in (
            "gas_level",
            "temperature",
            "pressure",
            "humidity",
            "vibration",
            "equipment_health",
            "weather_condition",
        ):
            if context.get(field) is not None:
                available_sources += 1
        if context.get("worker_present") or context.get("worker_count", 0) > 0:
            available_sources += 1
        if context.get("maintenance_running") or context.get("maintenance_overdue"):
            available_sources += 1
        if context.get("open_permit_count", 0) > 0:
            available_sources += 1

        similarity_factor = (historical_similarity[0].similarity_score / 100) if historical_similarity else 0.0
        confidence = 0.35 + (available_sources * 0.05) + (len(matched_rules) * 0.06) + (similarity_factor * 0.18)
        return round(min(confidence, 0.99), 2)
