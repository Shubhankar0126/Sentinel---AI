from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np


@lru_cache(maxsize=512)
def _read_content_slice(path_str: str, offset: int, length: int) -> str:
    if length <= 0:
        return ""
    with Path(path_str).open("rb") as handle:
        handle.seek(offset)
        return handle.read(length).decode("utf-8")


@dataclass(slots=True)
class VectorRecord:
    chunk_id: str
    document_name: str
    section: str
    source: str
    page: str | None
    content: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    content_offset: int = 0
    content_length: int = 0


class FaissVectorStore:
    def __init__(self, index_dir: Path):
        self.index_dir = Path(index_dir)
        self.index_path = self.index_dir / "rag.index"
        self.metadata_path = self.index_dir / "rag.metadata.json"
        self.content_path = self.index_dir / "rag.content.bin"
        self.embeddings_path = self.index_dir / "rag.embeddings.npy"
        self.dimension = 384
        self.records: list[VectorRecord] = []
        self.manifest: list[dict[str, Any]] = []
        self.embedding_provider = "unknown"
        self.embedding_model = "unknown"
        self._index = None
        self._faiss = None
        self._stats_cache: dict[str, Any] | None = None

    @property
    def is_loaded(self) -> bool:
        return self._index is not None

    def exists(self) -> bool:
        return self.index_path.exists() and self.metadata_path.exists()

    def create(
        self,
        *,
        embeddings: np.ndarray,
        records: list[VectorRecord],
        manifest: list[dict[str, Any]],
        embedding_provider: str,
        embedding_model: str,
    ) -> None:
        prepared_embeddings = self._prepare_embeddings(embeddings)
        if prepared_embeddings.size:
            self.dimension = int(prepared_embeddings.shape[1])
        self.records = records if isinstance(records, list) else list(records)
        self.manifest = manifest if isinstance(manifest, list) else list(manifest)
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self._rebuild_index(prepared_embeddings)
        self.persist()

    def upsert(
        self,
        *,
        embeddings: np.ndarray,
        records: list[VectorRecord],
        manifest: list[dict[str, Any]],
        embedding_provider: str,
        embedding_model: str,
    ) -> None:
        self._ensure_loaded()
        new_embeddings = self._prepare_embeddings(embeddings)
        existing_embeddings = self._reconstruct_embeddings()
        existing = {
            record.chunk_id: (record, existing_embeddings[index])
            for index, record in enumerate(self.records)
        }
        for index, record in enumerate(records):
            existing[record.chunk_id] = (record, new_embeddings[index])
        merged_records = [item[0] for item in existing.values()]
        merged_embeddings = (
            np.ascontiguousarray([item[1] for item in existing.values()], dtype="float32")
            if existing
            else np.zeros((0, self.dimension), dtype="float32")
        )
        if merged_embeddings.size:
            self.dimension = int(merged_embeddings.shape[1])
        self.records = merged_records
        self.manifest = manifest if isinstance(manifest, list) else list(manifest)
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self._rebuild_index(merged_embeddings)
        self.persist()

    def delete(
        self,
        *,
        chunk_ids: list[str] | None = None,
        metadata_filters: dict[str, str] | None = None,
    ) -> int:
        self._ensure_loaded()
        chunk_id_set = set(chunk_ids or [])
        retained_indices: list[int] = []
        retained_records: list[VectorRecord] = []
        deleted = 0
        for index, record in enumerate(self.records):
            matches_chunk = record.chunk_id in chunk_id_set
            matches_filter = bool(metadata_filters) and self._matches_filters(record, metadata_filters)
            if matches_chunk or matches_filter:
                deleted += 1
                continue
            retained_indices.append(index)
            retained_records.append(record)
        if deleted == 0:
            return 0
        retained_embeddings = self._reconstruct_embeddings(retained_indices)
        self.records = retained_records
        self._rebuild_index(retained_embeddings)
        self.persist()
        return deleted

    def search(
        self,
        query_embedding: np.ndarray,
        *,
        top_k: int,
        metadata_filters: dict[str, str] | None = None,
        candidate_limit: int | None = None,
    ) -> list[dict[str, Any]]:
        self._ensure_loaded()
        if not self.records:
            return []
        query = self._prepare_query_embedding(query_embedding)
        search_limit = min(max(candidate_limit or top_k, top_k), len(self.records))
        distances, indices = self._index.search(query, search_limit)
        matches: list[dict[str, Any]] = []
        limit = candidate_limit or top_k
        for score, row_index in zip(distances[0], indices[0], strict=False):
            if row_index < 0 or row_index >= len(self.records):
                continue
            record = self.records[int(row_index)]
            if metadata_filters and not self._matches_filters(record, metadata_filters):
                continue
            matches.append(
                {
                    "chunk_id": record.chunk_id,
                    "document_name": record.document_name,
                    "section": record.section,
                    "source": record.source,
                    "page": record.page,
                    "content": self._materialize_record_content(record),
                    "metadata": dict(record.metadata),
                    "score": float(score),
                }
            )
            if len(matches) >= limit:
                break
        return matches

    def load(self) -> None:
        if self.is_loaded:
            return
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        self.dimension = int(metadata["dimension"])
        self.records = [self._deserialize_record(item) for item in metadata.get("records", [])]
        self.manifest = list(metadata.get("manifest", []))
        self.embedding_provider = metadata.get("embedding_provider", "unknown")
        self.embedding_model = metadata.get("embedding_model", "unknown")
        self._index = self._get_faiss().read_index(str(self.index_path))
        if any(record.content for record in self.records):
            self.persist()
        elif self.embeddings_path.exists():
            self.embeddings_path.unlink()
        self._update_stats_cache()

    def persist(self) -> None:
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_loaded()
        temp_index_path = self.index_dir / f"{self.index_path.name}.tmp"
        temp_metadata_path = self.index_dir / f"{self.metadata_path.name}.tmp"
        self._get_faiss().write_index(self._index, str(temp_index_path))
        temp_index_path.replace(self.index_path)
        self.records = self._write_content_store(self.records)
        temp_metadata_path.write_text(
            json.dumps(
                {
                    "dimension": self.dimension,
                    "records": [self._serialize_record(record) for record in self.records],
                    "manifest": self.manifest,
                    "embedding_provider": self.embedding_provider,
                    "embedding_model": self.embedding_model,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        temp_metadata_path.replace(self.metadata_path)
        if self.embeddings_path.exists():
            self.embeddings_path.unlink()
        _read_content_slice.cache_clear()
        self._update_stats_cache()

    def stats(self) -> dict[str, Any]:
        self._ensure_loaded_if_present()
        if self._stats_cache is None:
            self._update_stats_cache()
        return dict(self._stats_cache or {})

    def _rebuild_index(self, embeddings: np.ndarray) -> None:
        self._index = self._get_faiss().IndexFlatIP(self.dimension)
        if embeddings.size:
            self._index.add(embeddings)
        self._stats_cache = None

    def _ensure_loaded(self) -> None:
        if not self.is_loaded:
            if self.exists():
                self.load()
            else:
                self._rebuild_index(np.zeros((0, self.dimension), dtype="float32"))

    def _ensure_loaded_if_present(self) -> None:
        if not self.is_loaded and self.exists():
            self.load()

    def _prepare_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        prepared = np.asarray(embeddings)
        if prepared.ndim == 1:
            prepared = prepared.reshape(1, -1)
        prepared = prepared.astype("float32", copy=False)
        return np.ascontiguousarray(prepared)

    def _prepare_query_embedding(self, query_embedding: np.ndarray) -> np.ndarray:
        prepared = np.asarray(query_embedding).astype("float32", copy=False).reshape(1, -1)
        return np.ascontiguousarray(prepared)

    def _reconstruct_embeddings(self, indices: list[int] | None = None) -> np.ndarray:
        if self._index is None or not self.records:
            return np.zeros((0, self.dimension), dtype="float32")
        if indices is None:
            indices = list(range(len(self.records)))
        if not indices:
            return np.zeros((0, self.dimension), dtype="float32")
        reconstructed = np.empty((len(indices), self.dimension), dtype="float32")
        for output_index, record_index in enumerate(indices):
            reconstructed[output_index] = self._index.reconstruct(int(record_index))
        return reconstructed

    def _write_content_store(self, records: list[VectorRecord]) -> list[VectorRecord]:
        temp_content_path = self.index_dir / f"{self.content_path.name}.tmp"
        slim_records: list[VectorRecord] = []
        with temp_content_path.open("wb") as handle:
            for record in records:
                content = self._materialize_record_content(record)
                encoded = content.encode("utf-8")
                offset = handle.tell()
                handle.write(encoded)
                slim_records.append(
                    VectorRecord(
                        chunk_id=record.chunk_id,
                        document_name=record.document_name,
                        section=record.section,
                        source=record.source,
                        page=record.page,
                        content="",
                        metadata=dict(record.metadata),
                        content_offset=offset,
                        content_length=len(encoded),
                    )
                )
        temp_content_path.replace(self.content_path)
        return slim_records

    def _materialize_record_content(self, record: VectorRecord) -> str:
        if record.content:
            return record.content
        if record.content_length <= 0 or not self.content_path.exists():
            return ""
        return _read_content_slice(str(self.content_path), record.content_offset, record.content_length)

    def _serialize_record(self, record: VectorRecord) -> dict[str, Any]:
        return {
            "chunk_id": record.chunk_id,
            "document_name": record.document_name,
            "section": record.section,
            "source": record.source,
            "page": record.page,
            "metadata": dict(record.metadata),
            "content_offset": record.content_offset,
            "content_length": record.content_length,
        }

    @staticmethod
    def _deserialize_record(payload: dict[str, Any]) -> VectorRecord:
        return VectorRecord(
            chunk_id=payload["chunk_id"],
            document_name=payload["document_name"],
            section=payload["section"],
            source=payload["source"],
            page=payload.get("page"),
            content=payload.get("content", ""),
            metadata=dict(payload.get("metadata", {})),
            content_offset=int(payload.get("content_offset", 0)),
            content_length=int(payload.get("content_length", 0)),
        )

    def _update_stats_cache(self) -> None:
        self._stats_cache = {
            "vector_count": len(self.records),
            "document_count": len({record.source for record in self.records}),
            "dimension": self.dimension,
            "embedding_provider": self.embedding_provider,
            "embedding_model": self.embedding_model,
        }

    @staticmethod
    def _matches_filters(record: VectorRecord, filters: dict[str, str]) -> bool:
        for key, expected in filters.items():
            actual = record.metadata.get(key)
            if actual is None and hasattr(record, key):
                actual = getattr(record, key)
            if str(actual) != str(expected):
                return False
        return True

    def _get_faiss(self):
        if self._faiss is None:
            import faiss

            self._faiss = faiss
        return self._faiss
