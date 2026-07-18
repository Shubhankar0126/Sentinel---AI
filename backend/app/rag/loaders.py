from __future__ import annotations

import csv
import hashlib
import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

from app.core.config import BASE_DIR, get_settings
from app.services.ingestion import (
    inspect_te_file,
    iter_te_row_chunks,
    resolve_te_row_target,
    select_te_sample_indices,
    te_feature_names,
)

logger = logging.getLogger(__name__)

try:
    from docx import Document as DocxDocument
except Exception:  # noqa: BLE001
    DocxDocument = None

try:
    from pypdf import PdfReader
except Exception:  # noqa: BLE001
    PdfReader = None


SUPPORTED_EXTENSIONS = {
    ".csv",
    ".dat",
    ".docx",
    ".f",
    ".ini",
    ".json",
    ".md",
    ".pdf",
    ".txt",
    ".xlsx",
}


@dataclass(slots=True)
class DocumentSection:
    document_name: str
    source: str
    section: str
    text: str
    page: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class DocumentChunk:
    chunk_id: str
    document_name: str
    source: str
    section: str
    page: str | None
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class TextChunker:
    def __init__(self, *, chunk_size: int, overlap: int):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_sections(self, sections: list[DocumentSection]) -> list[DocumentChunk]:
        chunks: list[DocumentChunk] = []
        for section in sections:
            normalized = self._normalize(section.text)
            if not normalized:
                continue
            for index, content in enumerate(self._split(normalized)):
                chunk_id = hashlib.sha1(
                    f"{section.source}|{section.section}|{index}|{content}".encode("utf-8")
                ).hexdigest()
                chunks.append(
                    DocumentChunk(
                        chunk_id=chunk_id,
                        document_name=section.document_name,
                        source=section.source,
                        section=section.section,
                        page=section.page,
                        content=content,
                        metadata=dict(section.metadata),
                    )
                )
        return chunks

    def _split(self, text: str) -> list[str]:
        if len(text) <= self.chunk_size:
            return [text]
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(len(text), start + self.chunk_size)
            if end < len(text):
                split_at = text.rfind(" ", start + max(1, self.chunk_size // 2), end)
                if split_at > start:
                    end = split_at
            chunks.append(text[start:end].strip())
            if end >= len(text):
                break
            start = max(end - self.overlap, start + 1)
        return [chunk for chunk in chunks if chunk]

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value).strip()


class ModularDocumentLoader:
    def __init__(self, roots: list[Path] | None = None):
        settings = get_settings()
        self.settings = settings
        self.roots = roots or [BASE_DIR / "docs", settings.dataset_root]

    def discover_files(self) -> list[Path]:
        files: list[Path] = []
        for root in self.roots:
            if not root.exists():
                continue
            for path in root.rglob("*"):
                if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
                    files.append(path)
        return sorted(files)

    def load_sections(self, path: Path) -> list[DocumentSection]:
        suffix = path.suffix.lower()
        if suffix in {".txt", ".md", ".ini", ".f"}:
            return self._load_text(path)
        if suffix == ".json":
            return self._load_json(path)
        if suffix == ".csv":
            return self._load_csv(path)
        if suffix == ".xlsx":
            return self._load_xlsx(path)
        if suffix == ".dat":
            return self._load_te_dat(path)
        if suffix == ".pdf":
            return self._load_pdf(path)
        if suffix == ".docx":
            return self._load_docx(path)
        return []

    def _load_text(self, path: Path) -> list[DocumentSection]:
        text = path.read_text(encoding="utf-8", errors="replace")
        return [self._build_section(path, text=text, section="Body")]

    def _load_json(self, path: Path) -> list[DocumentSection]:
        payload = json.loads(path.read_text(encoding="utf-8"))
        sections: list[DocumentSection] = []
        if isinstance(payload, list):
            batch: list[str] = []
            batch_start = 1
            for index, item in enumerate(payload, start=1):
                batch.append(f"Record {index}: {json.dumps(item, ensure_ascii=True, default=str)}")
                if len(batch) >= self.settings.rag_structured_rows_per_section:
                    sections.append(
                        self._build_section(
                            path,
                            text="\n".join(batch),
                            section=f"Records {batch_start}-{index}",
                        )
                    )
                    batch = []
                    batch_start = index + 1
            if batch:
                sections.append(
                    self._build_section(
                        path,
                        text="\n".join(batch),
                        section=f"Records {batch_start}-{batch_start + len(batch) - 1}",
                    )
                )
        else:
            sections.append(
                self._build_section(
                    path,
                    text=json.dumps(payload, indent=2, ensure_ascii=True, default=str),
                    section="Document",
                )
            )
        return sections

    def _load_csv(self, path: Path) -> list[DocumentSection]:
        sections: list[DocumentSection] = []
        with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
            reader = csv.DictReader(handle)
            headers = reader.fieldnames or []
            sections.append(
                self._build_section(
                    path,
                    text=f"Dataset columns: {', '.join(headers)}",
                    section="Schema",
                    metadata={"document_type": "csv"},
                )
            )
            batch: list[str] = []
            batch_start = 1
            for index, row in enumerate(reader, start=1):
                batch.append(
                    f"Row {index}: "
                    + ", ".join(f"{key}={self._clean_scalar(value)}" for key, value in row.items())
                )
                if len(batch) >= self.settings.rag_structured_rows_per_section:
                    sections.append(
                        self._build_section(
                            path,
                            text="\n".join(batch),
                            section=f"Rows {batch_start}-{index}",
                            metadata={"document_type": "csv"},
                        )
                    )
                    batch = []
                    batch_start = index + 1
            if batch:
                sections.append(
                    self._build_section(
                        path,
                        text="\n".join(batch),
                        section=f"Rows {batch_start}-{batch_start + len(batch) - 1}",
                        metadata={"document_type": "csv"},
                    )
                )
        return sections

    def _load_xlsx(self, path: Path) -> list[DocumentSection]:
        sections: list[DocumentSection] = []
        workbook = load_workbook(filename=path, read_only=True, data_only=True)
        for sheet_name in workbook.sheetnames:
            worksheet = workbook[sheet_name]
            rows = worksheet.iter_rows(values_only=True)
            try:
                header_row = next(rows)
            except StopIteration:
                continue
            headers = [str(value) for value in header_row if value is not None]
            sections.append(
                self._build_section(
                    path,
                    text=f"Sheet '{sheet_name}' columns: {', '.join(headers)}",
                    section=f"{sheet_name} schema",
                    page=sheet_name,
                    metadata={"document_type": "xlsx", "sheet": sheet_name},
                )
            )
            batch: list[str] = []
            batch_start = 1
            for index, row in enumerate(rows, start=1):
                values = list(row)
                record = {
                    headers[column_index]: self._clean_scalar(values[column_index])
                    for column_index in range(min(len(headers), len(values)))
                }
                batch.append(f"Row {index}: {json.dumps(record, ensure_ascii=True, default=str)}")
                if len(batch) >= self.settings.rag_structured_rows_per_section:
                    sections.append(
                        self._build_section(
                            path,
                            text="\n".join(batch),
                            section=f"{sheet_name} rows {batch_start}-{index}",
                            page=sheet_name,
                            metadata={"document_type": "xlsx", "sheet": sheet_name},
                        )
                    )
                    batch = []
                    batch_start = index + 1
            if batch:
                sections.append(
                    self._build_section(
                        path,
                        text="\n".join(batch),
                        section=f"{sheet_name} rows {batch_start}-{batch_start + len(batch) - 1}",
                        page=sheet_name,
                        metadata={"document_type": "xlsx", "sheet": sheet_name},
                    )
                )
        workbook.close()
        return sections

    def _load_te_dat(self, path: Path) -> list[DocumentSection]:
        metadata = inspect_te_file(path)
        total_rows = int(metadata["total_rows"])
        preview_rows = min(self.settings.rag_te_preview_rows, total_rows)
        selected_rows = resolve_te_row_target(
            total_rows,
            sample_mode=True,
            sample_fraction=min(1.0, preview_rows / max(total_rows, 1)),
            explicit_limit=preview_rows,
        )
        selected_indices = (
            None if selected_rows >= total_rows else select_te_sample_indices(total_rows, selected_rows)
        )
        sample_lines: list[str] = []
        for chunk in iter_te_row_chunks(
            path,
            selected_indices=selected_indices,
            chunk_size=max(1, min(self.settings.rag_te_preview_rows, 8)),
        ):
            for row_index, row_values in chunk:
                pairs = [
                    f"{feature_name}={round(float(row_values[column_index]), 3)}"
                    for column_index, (feature_name, _) in enumerate(te_feature_names()[:8])
                ]
                sample_lines.append(f"Observation {row_index + 1}: " + ", ".join(pairs))
                if len(sample_lines) >= preview_rows:
                    break
            if len(sample_lines) >= preview_rows:
                break

        scenario_type = "testing" if path.stem.endswith("_te") else "training"
        text = (
            f"Tennessee Eastman scenario {path.stem} ({scenario_type}). "
            f"Rows={total_rows}. Columns=52. "
            "Feature vector contains 41 measured variables and 11 manipulated variables. "
            "Representative observations: "
            + " ".join(sample_lines)
        )
        return [
            self._build_section(
                path,
                text=text,
                section=f"{path.stem} summary",
                metadata={
                    "document_type": "tennessee_dat",
                    "scenario": path.stem,
                    "scenario_type": scenario_type,
                    "rows": total_rows,
                },
            )
        ]

    def _load_pdf(self, path: Path) -> list[DocumentSection]:
        if PdfReader is None:
            logger.warning("Skipping PDF document without pypdf installed: %s", path)
            return []
        reader = PdfReader(str(path))
        sections: list[DocumentSection] = []
        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                sections.append(
                    self._build_section(
                        path,
                        text=text,
                        section=f"Page {page_number}",
                        page=str(page_number),
                        metadata={"document_type": "pdf"},
                    )
                )
        return sections

    def _load_docx(self, path: Path) -> list[DocumentSection]:
        if DocxDocument is None:
            logger.warning("Skipping DOCX document without python-docx installed: %s", path)
            return []
        document = DocxDocument(str(path))
        paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
        return [
            self._build_section(
                path,
                text="\n".join(paragraphs),
                section="Document",
                metadata={"document_type": "docx"},
            )
        ]

    def _build_section(
        self,
        path: Path,
        *,
        text: str,
        section: str,
        page: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DocumentSection:
        source = str(path.resolve())
        return DocumentSection(
            document_name=path.name,
            source=source,
            section=section,
            text=text,
            page=page,
            metadata={
                "document_name": path.name,
                "relative_path": self._relative_source(path),
                "extension": path.suffix.lower(),
                **(metadata or {}),
            },
        )

    @staticmethod
    def _clean_scalar(value: Any) -> Any:
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except TypeError:
                return str(value)
        return value

    @staticmethod
    def _relative_source(path: Path) -> str:
        try:
            return str(path.resolve().relative_to(BASE_DIR))
        except ValueError:
            return str(path.resolve())
