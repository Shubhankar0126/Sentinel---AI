from __future__ import annotations

from typing import Any

from app.schemas.risk import (
    ExplainabilityReport,
    HistoricalSimilarityMatch,
    RecommendationAction,
    RuleMatch,
)


class ExplainabilityEngine:
    def build(
        self,
        *,
        risk_score: float,
        severity: str,
        evidence: list[dict[str, Any]],
        rules: list[RuleMatch],
        historical_similarity: list[HistoricalSimilarityMatch],
        recommended_actions: list[RecommendationAction],
        graph_insights: dict[str, Any] | None,
    ) -> ExplainabilityReport:
        contributing_factors = self._contributing_factors(evidence, rules)
        why = self._why_text(risk_score, severity, contributing_factors, historical_similarity)
        return ExplainabilityReport(
            why=why,
            evidence=evidence,
            contributing_factors=contributing_factors,
            applicable_rules=rules,
            historical_similarity=historical_similarity,
            recommended_actions=recommended_actions,
            impact_summary=graph_insights,
        )

    @staticmethod
    def _contributing_factors(
        evidence: list[dict[str, Any]], rules: list[RuleMatch]
    ) -> list[str]:
        factors = [item["reason"] for item in evidence if item.get("reason")]
        factors.extend(rule.reason for rule in rules)
        deduped: list[str] = []
        for factor in factors:
            if factor not in deduped:
                deduped.append(factor)
        return deduped[:8]

    @staticmethod
    def _why_text(
        risk_score: float,
        severity: str,
        contributing_factors: list[str],
        historical_similarity: list[HistoricalSimilarityMatch],
    ) -> str:
        factor_summary = "; ".join(contributing_factors[:3]) if contributing_factors else "no material hazard signals were detected"
        similarity_summary = ""
        if historical_similarity:
            similarity_summary = (
                f" Historical similarity reached {historical_similarity[0].similarity_score:.1f}% "
                f"against {historical_similarity[0].title}."
            )
        return (
            f"Risk score {risk_score:.2f} is classified as {severity} because {factor_summary}."
            f"{similarity_summary}"
        )
