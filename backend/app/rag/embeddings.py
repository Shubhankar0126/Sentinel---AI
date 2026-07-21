from __future__ import annotations

import hashlib
import logging
import re
import threading
from functools import lru_cache
from typing import Any

import numpy as np

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class HashingEmbeddingService:
    def __init__(self, *, dimension: int = 384):
        self.dimension = dimension
        self.model_name = "hashing-fallback"
        self.provider_name = "offline-fallback"

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        embeddings = np.zeros((len(texts), self.dimension), dtype="float32")
        for row_index, text in enumerate(texts):
            vector = np.zeros(self.dimension, dtype="float32")
            for token in re.findall(r"[a-z0-9_]+", text.lower()):
                digest = hashlib.sha256(token.encode("utf-8")).digest()
                position = int.from_bytes(digest[:4], "big") % self.dimension
                sign = 1.0 if digest[4] % 2 == 0 else -1.0
                vector[position] += sign
            norm = np.linalg.norm(vector)
            embeddings[row_index] = vector if norm == 0 else vector / norm
        return embeddings

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_texts([text])[0]


class SentenceTransformerEmbeddingService:
    _model_cache: dict[str, Any] = {}
    _dimension_cache: dict[str, int] = {}
    _failed_models: set[str] = set()
    _load_lock = threading.Lock()

    def __init__(self):
        self.settings = get_settings()
        self.model_name = self.settings.embedding_model_name
        self.provider_name = "sentence-transformers"
        self.dimension = 384
        self._model = None
        self._load_failed = False
        self._fallback = HashingEmbeddingService(dimension=self.dimension)

    @property
    def using_fallback(self) -> bool:
        self._load_model()
        return self._model is None

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimension), dtype="float32")
        self._load_model()
        if self._model is None:
            return self._fallback.embed_texts(texts)
        embeddings = self._model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return np.asarray(embeddings, dtype="float32")

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_texts([text])[0]

    def _load_model(self) -> None:
        if self._model is not None or self._load_failed:
            return
        cached_model = self._model_cache.get(self.model_name)
        if cached_model is not None:
            self._model = cached_model
            self.dimension = self._dimension_cache[self.model_name]
            return
        if self.model_name in self._failed_models:
            self._activate_fallback()
            return
        with self._load_lock:
            cached_model = self._model_cache.get(self.model_name)
            if cached_model is not None:
                self._model = cached_model
                self.dimension = self._dimension_cache[self.model_name]
                return
            if self.model_name in self._failed_models:
                self._activate_fallback()
                return
            try:
                from sentence_transformers import SentenceTransformer

                model = SentenceTransformer(self.model_name)
                self._model_cache[self.model_name] = model
                self._dimension_cache[self.model_name] = int(
                    model.get_sentence_embedding_dimension()
                )
                self._model = model
                self.dimension = self._dimension_cache[self.model_name]
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "SentenceTransformer model '%s' unavailable, using hashing fallback: %s",
                    self.model_name,
                    exc,
                )
                self._failed_models.add(self.model_name)
                self._activate_fallback()

    def _activate_fallback(self) -> None:
        self._load_failed = True
        self._model = None
        self.provider_name = self._fallback.provider_name
        self.model_name = self._fallback.model_name
        self.dimension = self._fallback.dimension


@lru_cache(maxsize=1)
def get_embedding_service() -> SentenceTransformerEmbeddingService:
    return SentenceTransformerEmbeddingService()
