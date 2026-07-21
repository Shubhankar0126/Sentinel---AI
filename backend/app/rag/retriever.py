from __future__ import annotations

import asyncio
import logging
import re
import threading
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
        self._embedding_service = embedding_service
        self.vector_store = vector_store or FaissVectorStore(index_dir or settings.rag_index_dir)
        self._last_diagnostics: dict[str, Any] = {}
        self._index_lock = threading.Lock()
        self._indexed_manifest_key: tuple[tuple[str, int, int], ...] | None = None

    @property
    def embedding_service(self) -> SentenceTransformerEmbeddingService:
        if self._embedding_service is None:
            self._embedding_service = get_embedding_service()
        return self._embedding_service

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
        manifest_key = self._manifest_key(manifest)
        with self._index_lock:
            if self.vector_store.is_loaded and self._indexed_manifest_key == manifest_key:
                diagnostics = self._compose_diagnostics(files, build_elapsed_seconds=0.0, manifest_match=True)
                self._last_diagnostics = diagnostics
                return diagnostics
            if self.vector_store.is_loaded and self.vector_store.manifest == manifest:
                self._indexed_manifest_key = manifest_key
                diagnostics = self._compose_diagnostics(files, build_elapsed_seconds=0.0, manifest_match=True)
                self._last_diagnostics = diagnostics
                return diagnostics
            if not self.vector_store.is_loaded and self.vector_store.exists():
                try:
                    self.vector_store.load()
                    if self.vector_store.manifest == manifest:
                        self._indexed_manifest_key = manifest_key
                        diagnostics = self._compose_diagnostics(
                            files,
                            build_elapsed_seconds=0.0,
                            manifest_match=True,
                        )
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
            self._indexed_manifest_key = manifest_key
            diagnostics = self._compose_diagnostics(
                files,
                build_elapsed_seconds=round(time.perf_counter() - started, 3),
                manifest_match=False,
            )
            self._last_diagnostics = diagnostics
            del embeddings, texts, records
            return diagnostics

    def refresh_index(self) -> dict[str, Any]:
        with self._index_lock:
            self._indexed_manifest_key = None
            self._last_diagnostics = {}
            for path in (
                self.vector_store.index_path,
                self.vector_store.metadata_path,
                self.vector_store.content_path,
                self.vector_store.embeddings_path,
            ):
                if path.exists():
                    path.unlink()
            self.vector_store._index = None
            self.vector_store.records = []
            self.vector_store.manifest = []
        return self.ensure_index()

    def delete_from_index(
        self,
        *,
        chunk_ids: list[str] | None = None,
        metadata_filters: dict[str, str] | None = None,
    ) -> int:
        self.ensure_index()
        deleted = self.vector_store.delete(chunk_ids=chunk_ids, metadata_filters=metadata_filters)
        self._last_diagnostics = {}
        return deleted

    def diagnostics(self) -> dict[str, Any]:
        return self.ensure_index() if not self._last_diagnostics else dict(self._last_diagnostics)

    def _build_records(self, files: list[Path]) -> tuple[list[VectorRecord], list[str]]:
        records: list[VectorRecord] = []
        texts: list[str] = []
        for path in files:
            sections = self.document_loader.load_sections(path)
            if not sections:
                continue
            chunks: list[DocumentChunk] = self.chunker.chunk_sections(sections)
            for chunk in chunks:
                records.append(
                    VectorRecord(
                        chunk_id=chunk.chunk_id,
                        document_name=chunk.document_name,
                        section=chunk.section,
                        source=chunk.source,
                        page=chunk.page,
                        content=chunk.content,
                        metadata=dict(chunk.metadata),
                    )
                )
                texts.append(chunk.content)
        return records, texts

    def _compose_diagnostics(
        self,
        files: list[Path],
        *,
        build_elapsed_seconds: float,
        manifest_match: bool,
    ) -> dict[str, Any]:
        diagnostics = self.vector_store.stats()
        diagnostics["documents_loaded"] = len(files)
        diagnostics["build_elapsed_seconds"] = build_elapsed_seconds
        diagnostics["source_roots"] = [str(path) for path in self.document_roots]
        diagnostics["manifest_match"] = manifest_match
        return diagnostics

    @staticmethod
    def _build_manifest(files: list[Path]) -> list[dict[str, Any]]:
        manifest: list[dict[str, Any]] = []
        for path in files:
            stat_result = path.stat()
            manifest.append(
                {
                    "source": str(path.resolve()),
                    "size": stat_result.st_size,
                    "modified": int(stat_result.st_mtime),
                }
            )
        return manifest

    @staticmethod
    def _manifest_key(manifest: list[dict[str, Any]]) -> tuple[tuple[str, int, int], ...]:
        return tuple((item["source"], int(item["size"]), int(item["modified"])) for item in manifest)

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
        if not vector_hits:
            return []
        query_lower = query.lower()
        query_tokens = self._tokenize(query)
        reranked_hits: list[dict[str, Any]] = []
        for item in vector_hits:
            lexical_score = self._lexical_score(query_tokens, query_lower, item)
            reranked_hit = dict(item)
            reranked_hit["metadata"] = dict(item.get("metadata", {}))
            reranked_hit["score"] = lexical_score + float(item["score"])
            reranked_hits.append(reranked_hit)
        reranked_hits.sort(key=lambda item: item["score"], reverse=True)
        return reranked_hits[:top_k]

    @staticmethod
    @lru_cache(maxsize=512)
    def _tokenize(query: str) -> frozenset[str]:
        return frozenset(
            token for token in re.findall(r"[a-z0-9_]+", query.lower()) if len(token) > 2
        )

    @staticmethod
    def _lexical_score(query_tokens: frozenset[str], raw_query_lower: str, item: dict[str, Any]) -> float:
        metadata = item.get("metadata", {})
        haystack = " ".join(
            [
                str(item.get("document_name", "")),
                str(item.get("section", "")),
                str(metadata.get("relative_path", "")),
                str(item.get("content", ""))[:800],
            ]
        ).lower()
        overlap = sum(1 for token in query_tokens if token in haystack)
        score = float(overlap)
        if any(marker in raw_query_lower for marker in ("osha", "iso", "oisd", "factory act", "regulation")):
            if any(marker in haystack for marker in ("osha", "iso", "oisd", "factory act", "regulation")):
                score += 6.0
            if metadata.get("extension") in {".txt", ".md", ".pdf", ".docx"}:
                score += 1.5
            if metadata.get("extension") in {".csv", ".xlsx"}:
                score -= 0.5
        if "incident" in raw_query_lower and "incident" in haystack:
            score += 2.0
        if "permit" in raw_query_lower and "permit" in haystack:
            score += 1.5
        if "procedure" in raw_query_lower and "procedure" in haystack:
            score += 2.0
        return score


@lru_cache(maxsize=1)
def get_context_retriever() -> ContextRetriever:
    return ContextRetriever()
