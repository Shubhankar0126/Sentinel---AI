from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gemini import GeminiClient, GeminiGenerationRequest
from app.knowledge_graph.builder import KnowledgeGraphBuilder
from app.repositories.entities import (
    ChatHistoryRepository,
    IncidentRepository,
    PlantRepository,
    RecommendationRepository,
    RiskEventRepository,
)
from app.rag.citations import build_citations, build_evidence, extract_applicable_regulations
from app.rag.retriever import ContextRetriever, get_context_retriever
from app.schemas.copilot import (
    CopilotChatRequest,
    CopilotChatResponse,
    CopilotCitation,
    CopilotHistoryDeleteResponse,
)


class CopilotService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        retriever: ContextRetriever | None = None,
        gemini_client: GeminiClient | None = None,
    ):
        self.session = session
        self.chat_repository = ChatHistoryRepository(session)
        self.incident_repository = IncidentRepository(session)
        self.risk_repository = RiskEventRepository(session)
        self.recommendation_repository = RecommendationRepository(session)
        self.plant_repository = PlantRepository(session)
        self.gemini_client = gemini_client or GeminiClient()
        self.graph_builder = KnowledgeGraphBuilder()
        self.retriever = retriever or get_context_retriever()

    async def chat(self, payload: CopilotChatRequest) -> CopilotChatResponse:
        history = list(await self.chat_repository.for_user(payload.user_id, limit=5)) if payload.user_id else []
        retrieval = await self.retriever.retrieve(
            payload.question,
            metadata_filters=payload.metadata_filters,
        )
        live_risks = list(await self.risk_repository.live(limit=5))
        incidents = list(await self.incident_repository.search_context(payload.question, limit=5))
        recommendations = list(await self.recommendation_repository.pending(limit=5))
        plant = await self.plant_repository.get(payload.plant_id) if payload.plant_id else None

        graph = self.graph_builder.build_summary(
            zone=None,
            risks=live_risks,
            incidents=incidents,
            permits=[],
            workers=[],
            recommendations=recommendations,
        )
        current_situation = self._build_current_situation(
            plant=plant,
            live_risks=live_risks,
            incidents=incidents,
            recommendations=recommendations,
            graph=graph,
            retrieval_diagnostics=retrieval.diagnostics,
        )
        citation_dicts = build_citations(retrieval.results)
        citations = [CopilotCitation(**item) for item in citation_dicts]
        evidence = build_evidence(
            retrieval.results,
            risk_reasons=[risk.reason for risk in live_risks],
            incident_titles=[incident.title for incident in incidents],
        )
        applicable_regulations = extract_applicable_regulations(retrieval.results)
        deterministic_recommendations = self._collect_recommendations(live_risks, recommendations)
        llm_result = await self.gemini_client.generate(
            GeminiGenerationRequest(
                question=payload.question,
                current_situation=current_situation,
                evidence=evidence,
                applicable_regulations=applicable_regulations,
                recommendations=deterministic_recommendations,
                conversation_history=self._build_conversation_history(history, payload),
                citations=citation_dicts,
                supporting_context={
                    "graph": graph,
                    "retrieval": retrieval.diagnostics,
                    "live_risks": [self._serialize_risk(item) for item in live_risks],
                    "related_incidents": [self._serialize_incident(item) for item in incidents],
                    "pending_recommendations": [item.action for item in recommendations],
                },
            )
        )

        saved_chat = await self.chat_repository.create(
            {
                "user_id": payload.user_id,
                "question": payload.question,
                "response": self._format_saved_response(
                    summary=llm_result.summary,
                    evidence=llm_result.evidence,
                    applicable_regulations=llm_result.applicable_regulations or applicable_regulations,
                    recommendations=llm_result.recommendations or deterministic_recommendations,
                ),
                "citations": citation_dicts,
                "timestamp": datetime.now(UTC),
            }
        )
        await self.session.commit()

        return CopilotChatResponse(
            summary=llm_result.summary,
            current_situation=current_situation,
            evidence=llm_result.evidence or evidence,
            applicable_regulations=llm_result.applicable_regulations
            or applicable_regulations
            or ["No matching regulation documents are currently available in docs/ or datasets/."],
            recommendations=llm_result.recommendations or deterministic_recommendations,
            citations=citations,
            confidence=llm_result.confidence,
            provider=llm_result.provider,
            retrieved_documents=[item.document_name for item in retrieval.results],
            saved_chat=saved_chat,
        )

    async def history(self, user_id: str):
        return await self.chat_repository.for_user(user_id)

    async def clear_history(self, user_id: str) -> CopilotHistoryDeleteResponse:
        deleted_count = await self.chat_repository.clear_for_user(user_id)
        await self.session.commit()
        return CopilotHistoryDeleteResponse(deleted_count=deleted_count)

    @staticmethod
    def _build_conversation_history(history: list[Any], payload: CopilotChatRequest) -> list[dict[str, str]]:
        turns: list[dict[str, str]] = []
        for item in history:
            turns.append({"role": "user", "content": item.question})
            turns.append({"role": "assistant", "content": item.response})
        for item in payload.conversation_history:
            turns.append({"role": item.role, "content": item.content})
        return turns[-8:]

    @staticmethod
    def _build_current_situation(
        *,
        plant: Any,
        live_risks: list[Any],
        incidents: list[Any],
        recommendations: list[Any],
        graph: dict[str, Any],
        retrieval_diagnostics: dict[str, Any],
    ) -> str:
        parts: list[str] = []
        if plant:
            parts.append(f"Plant context: {plant.name} in {plant.location} ({plant.industry}).")
        if live_risks:
            highest_risk = live_risks[0]
            parts.append(
                "Live risk posture: "
                f"{len(live_risks)} active risks with highest severity "
                f"{highest_risk.severity.value} in category {highest_risk.risk_category}."
            )
        if incidents:
            parts.append(f"Related incident context: {len(incidents)} historical incidents matched the question.")
        if recommendations:
            parts.append(f"Open recommendation load: {len(recommendations)} pending actions are available.")
        parts.append(
            "Knowledge graph context: "
            f"{graph['nodes']} nodes and {graph['edges']} edges in the local impact neighborhood."
        )
        parts.append(
            "RAG inventory: "
            f"{retrieval_diagnostics.get('documents_loaded', 0)} documents loaded and "
            f"{retrieval_diagnostics.get('vector_count', 0)} vector chunks indexed."
        )
        return " ".join(parts)

    @staticmethod
    def _collect_recommendations(live_risks: list[Any], recommendations: list[Any]) -> list[str]:
        actions = [item.action for item in recommendations]
        if not actions:
            for risk in live_risks:
                if risk.recommendation not in actions:
                    actions.append(risk.recommendation)
        if not actions:
            actions = [
                "Escalate to the plant safety officer for manual review.",
                "Verify active permits and worker presence before resuming operations.",
            ]
        return actions[:5]

    @staticmethod
    def _serialize_risk(risk: Any) -> dict[str, Any]:
        return {
            "id": risk.id,
            "risk_score": risk.risk_score,
            "severity": getattr(risk.severity, "value", risk.severity),
            "risk_category": risk.risk_category,
            "reason": risk.reason,
            "recommendation": risk.recommendation,
        }

    @staticmethod
    def _serialize_incident(incident: Any) -> dict[str, Any]:
        return {
            "id": incident.id,
            "title": incident.title,
            "description": incident.description,
            "incident_type": getattr(incident.incident_type, "value", incident.incident_type),
            "severity": getattr(incident.severity, "value", incident.severity),
        }

    @staticmethod
    def _format_saved_response(
        *,
        summary: str,
        evidence: list[str],
        applicable_regulations: list[str],
        recommendations: list[str],
    ) -> str:
        lines = [
            "Summary:",
            summary,
            "",
            "Evidence:",
            *[f"- {item}" for item in evidence],
            "",
            "Applicable Regulations:",
            *[f"- {item}" for item in applicable_regulations],
            "",
            "Recommendations:",
            *[f"- {item}" for item in recommendations],
        ]
        return "\n".join(lines)
