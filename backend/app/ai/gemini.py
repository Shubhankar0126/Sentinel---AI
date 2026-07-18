from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class GeminiGenerationRequest:
    question: str
    current_situation: str
    evidence: list[str]
    applicable_regulations: list[str]
    recommendations: list[str]
    conversation_history: list[dict[str, str]]
    citations: list[dict[str, Any]]
    supporting_context: dict[str, Any]


@dataclass(slots=True)
class GeminiGenerationResult:
    summary: str
    evidence: list[str]
    applicable_regulations: list[str]
    recommendations: list[str]
    confidence: float
    provider: str


class GeminiClient:
    def __init__(self):
        self.settings = get_settings()

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.gemini_api_key)

    @property
    def provider_label(self) -> str:
        return f"gemini:{self.settings.gemini_model}"

    def build_context(self, request: GeminiGenerationRequest) -> str:
        evidence_block = "\n".join(f"- {item}" for item in request.evidence) or "- No direct evidence."
        recommendations_block = (
            "\n".join(f"- {item}" for item in request.recommendations)
            or "- No recommendation candidates supplied."
        )
        regulations_block = (
            "\n".join(f"- {item}" for item in request.applicable_regulations)
            or "- No regulation candidates supplied."
        )
        citations_block = (
            "\n".join(
                f"- {citation['document_name']} | {citation['section']} | {citation['snippet']}"
                for citation in request.citations[:5]
            )
            or "- No retrieved citations."
        )
        history_block = (
            "\n".join(f"- {item['role']}: {item['content']}" for item in request.conversation_history[-6:])
            or "- No prior conversation history."
        )
        return (
            f"Question:\n{request.question}\n\n"
            f"Current situation:\n{request.current_situation}\n\n"
            f"Evidence:\n{evidence_block}\n\n"
            f"Applicable regulation candidates:\n{regulations_block}\n\n"
            f"Candidate recommendations:\n{recommendations_block}\n\n"
            f"Conversation memory:\n{history_block}\n\n"
            f"Retrieved citations:\n{citations_block}\n\n"
            f"Supporting context:\n{json.dumps(request.supporting_context, ensure_ascii=True, default=str)}"
        )

    def build_prompt(self, request: GeminiGenerationRequest) -> str:
        return (
            "You are Sentinel AI Copilot.\n"
            "Follow these guardrails strictly:\n"
            "1. Never calculate or invent a new numerical risk score.\n"
            "2. Numerical risk belongs only to the Compound Risk Engine.\n"
            "3. Use only the supplied evidence, citations, and context.\n"
            "4. If regulations are unavailable, say so explicitly.\n"
            "5. Return JSON with keys: summary, evidence, applicable_regulations, recommendations, confidence.\n\n"
            f"{self.build_context(request)}"
        )

    async def generate(self, request: GeminiGenerationRequest) -> GeminiGenerationResult:
        if not self.is_configured:
            return self._fallback_response(request, provider="offline-fallback")

        try:
            async with httpx.AsyncClient(timeout=self.settings.gemini_request_timeout_seconds) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.gemini_model}:generateContent",
                    params={"key": self.settings.gemini_api_key},
                    json={
                        "systemInstruction": {
                            "parts": [
                                {
                                    "text": (
                                        "You are Sentinel AI Copilot. Never calculate numerical risk. "
                                        "Use only the supplied evidence and citations."
                                    )
                                }
                            ]
                        },
                        "contents": [{"role": "user", "parts": [{"text": self.build_prompt(request)}]}],
                        "generationConfig": {
                            "temperature": 0.2,
                            "responseMimeType": "application/json",
                        },
                    },
                )
                response.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini request failed, using offline fallback: %s", exc)
            return self._fallback_response(request, provider=f"{self.provider_label}:fallback")

        try:
            payload = response.json()
            text = payload["candidates"][0]["content"]["parts"][0]["text"]
            structured = json.loads(self._strip_code_fence(text))
            return GeminiGenerationResult(
                summary=str(structured.get("summary") or request.current_situation),
                evidence=[str(item) for item in structured.get("evidence", [])][:5] or request.evidence[:5],
                applicable_regulations=[
                    str(item) for item in structured.get("applicable_regulations", [])
                ][:5]
                or request.applicable_regulations[:5],
                recommendations=[str(item) for item in structured.get("recommendations", [])][:5]
                or request.recommendations[:5],
                confidence=self._clamp_confidence(structured.get("confidence", 0.74)),
                provider=self.provider_label,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini response parsing failed, using offline fallback: %s", exc)
            return self._fallback_response(request, provider=f"{self.provider_label}:fallback")

    def _fallback_response(
        self, request: GeminiGenerationRequest, *, provider: str
    ) -> GeminiGenerationResult:
        question_lower = request.question.lower()
        if "risk score" in question_lower or "calculate" in question_lower:
            summary = (
                "Numerical risk scoring is produced only by the Compound Risk Engine. "
                "This copilot can explain the current risk drivers, supporting evidence, "
                "applicable regulations, and recommended actions."
            )
        else:
            summary = request.current_situation

        evidence = request.evidence[:5] or [
            "No direct supporting evidence was retrieved from the current repository inventory."
        ]
        applicable_regulations = request.applicable_regulations[:5] or [
            "No matching regulation documents are currently available in docs/ or datasets/."
        ]
        recommendations = request.recommendations[:5] or [
            "Escalate to a safety officer for manual review because supporting evidence is limited."
        ]
        confidence_seed = 0.45 + min(len(request.citations), 5) * 0.08
        return GeminiGenerationResult(
            summary=summary,
            evidence=evidence,
            applicable_regulations=applicable_regulations,
            recommendations=recommendations,
            confidence=self._clamp_confidence(confidence_seed),
            provider=provider,
        )

    @staticmethod
    def _clamp_confidence(value: Any) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            numeric = 0.5
        return max(0.0, min(1.0, round(numeric, 2)))

    @staticmethod
    def _strip_code_fence(value: str) -> str:
        text = value.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text[:-3]
        return text.strip()
