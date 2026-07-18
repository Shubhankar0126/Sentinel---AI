from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import BASE_DIR, get_settings
from app.rag.embeddings import SentenceTransformerEmbeddingService, get_embedding_service
from app.rag.loaders import DocumentChunk, ModularDocumentLoader, TextChunker
from app.vector_store.faiss_store import FaissVectorStore, VectorRecord

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RetrievalResult:
    chunk_id: str
    document_name: str
    section: str
    source: str
    page: str | None
    content: str
    score: float
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class RetrievalBundle:
    query: str
    results: list[RetrievalResult]
    diagnostics: dict[str, Any]


class ContextRetriever:
    def __init__(
        self,
        *,
        document_roots: list[Path] | None = None,
        index_dir: Path | None = None,
        embedding_service: SentenceTransformerEmbeddingService | None = None,
        vector_store: FaissVectorStore | None = None,
        document_loader: ModularDocumentLoader | None = None,
        chunker: TextChunker | None = None,
    ):
        settings = get_settings()
        self.settings = settings
        self.document_roots = document_roots or [BASE_DIR / "docs", settings.dataset_root]
        self.document_loader = document_loader or ModularDocumentLoader(self.document_roots)
        self.chunker = chunker or TextChunker(
            chunk_size=settings.rag_chunk_size,
            overlap=settings.rag_chunk_overlap,
        )
        self.embedding_service = embedding_service or get_embedding_service()
        self.vector_store = vector_store or FaissVectorStore(index_dir or settings.rag_index_dir)
        self._last_diagnostics: dict[str, Any] = {}

    async def retrieve(
        self,
        query: str,
        *,
        top_k: int | None = None,
        metadata_filters: dict[str, str] | None = None,
    ) -> RetrievalBundle:
        return await asyncio.to_thread(
            self.retrieve_sync,
            query,
            top_k=top_k,
            metadata_filters=metadata_filters,
        )

    def retrieve_sync(
        self,
        query: str,
        *,
        top_k: int | None = None,
        metadata_filters: dict[str, str] | None = None,
    ) -> RetrievalBundle:
        diagnostics = self.ensure_index()
        started = time.perf_counter()
        query_embedding = self.embedding_service.embed_query(query)
        hits = self._rank_hits(
            query,
            query_embedding=query_embedding,
            top_k=top_k or self.settings.rag_top_k,
            metadata_filters=metadata_filters,
        )
        results = [
            RetrievalResult(
                chunk_id=item["chunk_id"],
                document_name=item["document_name"],
                section=item["section"],
                source=item["source"],
                page=item["page"],
                content=item["content"],
                score=float(item["score"]),
                metadata=dict(item.get("metadata", {})),
            )
            for item in hits
        ]
        run_diagnostics = dict(diagnostics)
        run_diagnostics["search_elapsed_seconds"] = round(time.perf_counter() - started, 3)
        run_diagnostics["result_count"] = len(results)
        self._last_diagnostics = run_diagnostics
        return RetrievalBundle(query=query, results=results, diagnostics=run_diagnostics)

    def ensure_index(self) -> dict[str, Any]:
        started = time.perf_counter()
        files = self.document_loader.discover_files()
        manifest = self._build_manifest(files)
        if self.vector_store.exists():
            try:
                self.vector_store.load()
                if self.vector_store.manifest == manifest:
                    diagnostics = self.vector_store.stats()
                    diagnostics["documents_loaded"] = len(files)
                    diagnostics["build_elapsed_seconds"] = 0.0
                    diagnostics["source_roots"] = [str(path) for path in self.document_roots]
                    diagnostics["manifest_match"] = True
                    self._last_diagnostics = diagnostics
                    return diagnostics
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to load persisted RAG index, rebuilding: %s", exc)

        records, texts = self._build_records(files)
        embeddings = self.embedding_service.embed_texts(texts)
        self.vector_store.create(
            embeddings=embeddings,
            records=records,
            manifest=manifest,
            embedding_provider=self.embedding_service.provider_name,
            embedding_model=self.embedding_service.model_name,
        )
        diagnostics = self.vector_store.stats()
        diagnostics["documents_loaded"] = len(files)
        diagnostics["build_elapsed_seconds"] = round(time.perf_counter() - started, 3)
        diagnostics["source_roots"] = [str(path) for path in self.document_roots]
        diagnostics["manifest_match"] = False
        self._last_diagnostics = diagnostics
        return diagnostics

    def refresh_index(self) -> dict[str, Any]:
        if self.vector_store.exists():
            for path in (
                self.vector_store.index_path,
                self.vector_store.metadata_path,
                self.vector_store.embeddings_path,
            ):
                if path.exists():
                    path.unlink()
        return self.ensure_index()

    def delete_from_index(
        self,
        *,
        chunk_ids: list[str] | None = None,
        metadata_filters: dict[str, str] | None = None,
    ) -> int:
        self.ensure_index()
        return self.vector_store.delete(chunk_ids=chunk_ids, metadata_filters=metadata_filters)

    def diagnostics(self) -> dict[str, Any]:
        return self.ensure_index() if not self._last_diagnostics else dict(self._last_diagnostics)

    def _build_records(self, files: list[Path]) -> tuple[list[VectorRecord], list[str]]:
        sections = []
        for path in files:
            sections.extend(self.document_loader.load_sections(path))
        chunks: list[DocumentChunk] = self.chunker.chunk_sections(sections)
        records = [
            VectorRecord(
                chunk_id=chunk.chunk_id,
                document_name=chunk.document_name,
                section=chunk.section,
                source=chunk.source,
                page=chunk.page,
                content=chunk.content,
                metadata=dict(chunk.metadata),
            )
            for chunk in chunks
        ]
        texts = [chunk.content for chunk in chunks]
        return records, texts

    @staticmethod
    def _build_manifest(files: list[Path]) -> list[dict[str, Any]]:
        return [
            {
                "source": str(path.resolve()),
                "size": path.stat().st_size,
                "modified": int(path.stat().st_mtime),
            }
            for path in files
        ]

    def _rank_hits(
        self,
        query: str,
        *,
        query_embedding,
        top_k: int,
        metadata_filters: dict[str, str] | None,
    ) -> list[dict[str, Any]]:
        vector_hits = self.vector_store.search(
            query_embedding,
            top_k=top_k,
            metadata_filters=metadata_filters,
            candidate_limit=max(top_k * 25, 50),
        )
        vector_scores = {item["chunk_id"]: float(item["score"]) for item in vector_hits}
        query_tokens = self._tokenize(query)
        lexical_candidates: list[dict[str, Any]] = []
        for record in self.vector_store.records:
            if metadata_filters and not self._matches_filters(record, metadata_filters):
                continue
            lexical_score = self._lexical_score(query_tokens, query, record)
            if lexical_score <= 0 and record.chunk_id not in vector_scores:
                continue
            lexical_candidates.append(
                {
                    "chunk_id": record.chunk_id,
                    "document_name": record.document_name,
                    "section": record.section,
                    "source": record.source,
                    "page": record.page,
                    "content": record.content,
                    "metadata": record.metadata,
                    "score": lexical_score + vector_scores.get(record.chunk_id, 0.0),
                }
            )
        if not lexical_candidates:
            return vector_hits[:top_k]
        lexical_candidates.sort(key=lambda item: item["score"], reverse=True)
        return lexical_candidates[:top_k]

    @staticmethod
    def _tokenize(query: str) -> set[str]:
        return {token for token in re.findall(r"[a-z0-9_]+", query.lower()) if len(token) > 2}

    @staticmethod
    def _matches_filters(record: VectorRecord, filters: dict[str, str]) -> bool:
        for key, expected in filters.items():
            actual = record.metadata.get(key)
            if actual is None and hasattr(record, key):
                actual = getattr(record, key)
            if str(actual) != str(expected):
                return False
        return True

    @staticmethod
    def _lexical_score(query_tokens: set[str], raw_query: str, record: VectorRecord) -> float:
        haystack = " ".join(
            [
                record.document_name,
                record.section,
                record.metadata.get("relative_path", ""),
                record.content[:800],
            ]
        ).lower()
        overlap = sum(1 for token in query_tokens if token in haystack)
        score = float(overlap)
        if any(marker in raw_query.lower() for marker in ("osha", "iso", "oisd", "factory act", "regulation")):
            if any(marker in haystack for marker in ("osha", "iso", "oisd", "factory act", "regulation")):
                score += 6.0
            if record.metadata.get("extension") in {".txt", ".md", ".pdf", ".docx"}:
                score += 1.5
            if record.metadata.get("extension") in {".csv", ".xlsx"}:
                score -= 0.5
        if "incident" in raw_query.lower() and "incident" in haystack:
            score += 2.0
        if "permit" in raw_query.lower() and "permit" in haystack:
            score += 1.5
        if "procedure" in raw_query.lower() and "procedure" in haystack:
            score += 2.0
        return score


@lru_cache(maxsize=1)
def get_context_retriever() -> ContextRetriever:
    return ContextRetriever()
