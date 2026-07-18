from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import numpy as np


@dataclass(slots=True)
class VectorRecord:
    chunk_id: str
    document_name: str
    section: str
    source: str
    page: str | None
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class FaissVectorStore:
    def __init__(self, index_dir: Path):
        self.index_dir = Path(index_dir)
        self.index_path = self.index_dir / "rag.index"
        self.metadata_path = self.index_dir / "rag.metadata.json"
        self.embeddings_path = self.index_dir / "rag.embeddings.npy"
        self.dimension = 384
        self.records: list[VectorRecord] = []
        self.manifest: list[dict[str, Any]] = []
        self.embedding_provider = "unknown"
        self.embedding_model = "unknown"
        self._embeddings = np.zeros((0, self.dimension), dtype="float32")
        self._index = None
        self._faiss = None

    def exists(self) -> bool:
        return self.index_path.exists() and self.metadata_path.exists() and self.embeddings_path.exists()

    def create(
        self,
        *,
        embeddings: np.ndarray,
        records: list[VectorRecord],
        manifest: list[dict[str, Any]],
        embedding_provider: str,
        embedding_model: str,
    ) -> None:
        self.records = list(records)
        self.manifest = list(manifest)
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self._embeddings = np.asarray(embeddings, dtype="float32")
        if self._embeddings.ndim == 1:
            self._embeddings = self._embeddings.reshape(1, -1)
        if self._embeddings.size:
            self.dimension = int(self._embeddings.shape[1])
        self._rebuild_index()
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
        existing = {record.chunk_id: (record, self._embeddings[index]) for index, record in enumerate(self.records)}
        for index, record in enumerate(records):
            existing[record.chunk_id] = (record, np.asarray(embeddings[index], dtype="float32"))
        self.records = [item[0] for item in existing.values()]
        self._embeddings = np.asarray([item[1] for item in existing.values()], dtype="float32")
        if self._embeddings.size:
            self.dimension = int(self._embeddings.shape[1])
        self.manifest = list(manifest)
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self._rebuild_index()
        self.persist()

    def delete(
        self,
        *,
        chunk_ids: list[str] | None = None,
        metadata_filters: dict[str, str] | None = None,
    ) -> int:
        self._ensure_loaded()
        chunk_ids = chunk_ids or []
        retained_records: list[VectorRecord] = []
        retained_embeddings: list[np.ndarray] = []
        deleted = 0
        for index, record in enumerate(self.records):
            matches_chunk = record.chunk_id in chunk_ids
            matches_filter = metadata_filters and self._matches_filters(record, metadata_filters)
            if matches_chunk or matches_filter:
                deleted += 1
                continue
            retained_records.append(record)
            retained_embeddings.append(self._embeddings[index])
        self.records = retained_records
        self._embeddings = (
            np.asarray(retained_embeddings, dtype="float32")
            if retained_embeddings
            else np.zeros((0, self.dimension), dtype="float32")
        )
        self._rebuild_index()
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
        query = np.asarray(query_embedding, dtype="float32").reshape(1, -1)
        distances, indices = self._index.search(query, len(self.records))
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
                    "content": record.content,
                    "metadata": record.metadata,
                    "score": float(score),
                }
            )
            if len(matches) >= limit:
                break
        return matches

    def load(self) -> None:
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        self.dimension = int(metadata["dimension"])
        self.records = [VectorRecord(**item) for item in metadata["records"]]
        self.manifest = list(metadata.get("manifest", []))
        self.embedding_provider = metadata.get("embedding_provider", "unknown")
        self.embedding_model = metadata.get("embedding_model", "unknown")
        self._embeddings = np.load(self.embeddings_path).astype("float32")
        self._index = self._get_faiss().read_index(str(self.index_path))

    def persist(self) -> None:
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self._get_faiss().write_index(self._index, str(self.index_path))
        self.metadata_path.write_text(
            json.dumps(
                {
                    "dimension": self.dimension,
                    "records": [asdict(record) for record in self.records],
                    "manifest": self.manifest,
                    "embedding_provider": self.embedding_provider,
                    "embedding_model": self.embedding_model,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        np.save(self.embeddings_path, self._embeddings)

    def stats(self) -> dict[str, Any]:
        self._ensure_loaded_if_present()
        return {
            "vector_count": len(self.records),
            "document_count": len({record.source for record in self.records}),
            "dimension": self.dimension,
            "embedding_provider": self.embedding_provider,
            "embedding_model": self.embedding_model,
        }

    def _rebuild_index(self) -> None:
        self._index = self._get_faiss().IndexFlatIP(self.dimension)
        if self._embeddings.size:
            self._index.add(np.ascontiguousarray(self._embeddings, dtype="float32"))

    def _ensure_loaded(self) -> None:
        if self._index is None:
            if self.exists():
                self.load()
            else:
                self._rebuild_index()

    def _ensure_loaded_if_present(self) -> None:
        if self._index is None and self.exists():
            self.load()

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
