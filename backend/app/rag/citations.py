from __future__ import annotations

from typing import Any


REGULATION_MARKERS = ("osha", "iso", "factory act", "oisd", "regulation", "manual", "procedure")


def build_citations(results: list[Any]) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    for item in results:
        citations.append(
            {
                "document_name": item.document_name,
                "section": item.section,
                "source": item.source,
                "page": item.page,
                "score": round(float(item.score), 4),
                "snippet": item.content[:240],
                "metadata": dict(item.metadata),
            }
        )
    return citations


def build_evidence(results: list[Any], *, risk_reasons: list[str], incident_titles: list[str]) -> list[str]:
    evidence: list[str] = []
    for reason in risk_reasons[:2]:
        evidence.append(reason)
    for title in incident_titles[:2]:
        evidence.append(f"Historical incident context: {title}")
    for item in results[:3]:
        evidence.append(f"{item.document_name} / {item.section}: {item.content[:160]}")
    return evidence


def extract_applicable_regulations(results: list[Any]) -> list[str]:
    regulations: list[str] = []
    for item in results:
        document_name = item.document_name.lower()
        snippet = item.content.lower()
        if any(marker in document_name or marker in snippet for marker in REGULATION_MARKERS):
            label = item.document_name
            if item.section:
                label = f"{label} - {item.section}"
            if label not in regulations:
                regulations.append(label)
    return regulations
