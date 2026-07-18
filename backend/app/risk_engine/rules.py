from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.models.enums import PriorityLevel, SeverityLevel
from app.schemas.risk import RuleConditionResult, RuleMatch


class RuleConditionConfig(BaseModel):
    field: str
    operator: str
    value: Any = None
    label: str | None = None


class RuleRecommendationTemplate(BaseModel):
    action: str
    priority: PriorityLevel = PriorityLevel.MEDIUM
    rationale: str
    target_type: str | None = None


class ConfiguredRule(BaseModel):
    id: str
    name: str
    description: str
    severity: SeverityLevel
    risk_category: str
    score_delta: float
    reason: str
    match: str = "all"
    regulations: list[str] = Field(default_factory=list)
    conditions: list[RuleConditionConfig] = Field(default_factory=list)
    recommendations: list[RuleRecommendationTemplate] = Field(default_factory=list)


@dataclass(slots=True)
class MatchedRule:
    config: ConfiguredRule
    result: RuleMatch


class RuleEngine:
    def __init__(self, rules_path: Path | None = None):
        settings = get_settings()
        self.rules_path = rules_path or settings.risk_rules_path
        self._rules = self._load_rules(self.rules_path)

    @property
    def rules(self) -> list[ConfiguredRule]:
        return self._rules

    def available_rules(self) -> list[ConfiguredRule]:
        return list(self._rules)

    def evaluate(self, context: dict[str, Any]) -> list[MatchedRule]:
        matches: list[MatchedRule] = []
        for rule in self._rules:
            conditions = [self._evaluate_condition(condition, context) for condition in rule.conditions]
            is_match = all(item.matched for item in conditions)
            if rule.match == "any":
                is_match = any(item.matched for item in conditions)
            if not is_match:
                continue
            matches.append(
                MatchedRule(
                    config=rule,
                    result=RuleMatch(
                        rule_id=rule.id,
                        name=rule.name,
                        description=rule.description,
                        severity=rule.severity,
                        risk_category=rule.risk_category,
                        score_delta=rule.score_delta,
                        reason=rule.reason,
                        regulations=rule.regulations,
                        conditions=conditions,
                    ),
                )
            )
        matches.sort(
            key=lambda item: (self._severity_rank(item.config.severity), item.config.score_delta),
            reverse=True,
        )
        return matches

    def _evaluate_condition(
        self, condition: RuleConditionConfig, context: dict[str, Any]
    ) -> RuleConditionResult:
        observed = context.get(condition.field)
        matched = self._compare(observed, condition.operator, condition.value)
        return RuleConditionResult(
            field=condition.field,
            operator=condition.operator,
            expected=condition.value,
            observed=self._normalize(observed),
            matched=matched,
            label=condition.label,
        )

    def _compare(self, observed: Any, operator: str, expected: Any) -> bool:
        observed_value = self._normalize(observed)
        expected_value = self._normalize(expected)

        if operator == "exists":
            return observed is not None
        if operator == "is_true":
            return bool(observed_value) is True
        if operator == "is_false":
            return bool(observed_value) is False
        if observed_value is None:
            return False

        if operator == "==":
            return observed_value == expected_value
        if operator == "!=":
            return observed_value != expected_value
        if operator == ">":
            return float(observed_value) > float(expected_value)
        if operator == ">=":
            return float(observed_value) >= float(expected_value)
        if operator == "<":
            return float(observed_value) < float(expected_value)
        if operator == "<=":
            return float(observed_value) <= float(expected_value)
        if operator == "in":
            if isinstance(expected_value, list):
                return observed_value in expected_value
            return observed_value == expected_value
        if operator == "contains_any":
            observed_items = observed_value if isinstance(observed_value, list) else [observed_value]
            expected_items = expected_value if isinstance(expected_value, list) else [expected_value]
            return any(item in observed_items for item in expected_items)
        raise ValueError(f"Unsupported rule operator: {operator}")

    @staticmethod
    def _severity_rank(severity: SeverityLevel) -> int:
        order = {
            SeverityLevel.SAFE: 0,
            SeverityLevel.LOW: 1,
            SeverityLevel.MODERATE: 2,
            SeverityLevel.HIGH: 3,
            SeverityLevel.CRITICAL: 4,
        }
        return order[severity]

    @staticmethod
    def _normalize(value: Any) -> Any:
        if hasattr(value, "value"):
            return getattr(value, "value")
        if isinstance(value, tuple):
            return [RuleEngine._normalize(item) for item in value]
        if isinstance(value, list):
            return [RuleEngine._normalize(item) for item in value]
        if isinstance(value, set):
            return [RuleEngine._normalize(item) for item in sorted(value)]
        return value

    @staticmethod
    def _load_rules(path: Path) -> list[ConfiguredRule]:
        if not path.exists():
            raise FileNotFoundError(f"Risk rule configuration not found: {path}")
        raw_rules = json.loads(path.read_text(encoding="utf-8"))
        return [ConfiguredRule.model_validate(item) for item in raw_rules]
