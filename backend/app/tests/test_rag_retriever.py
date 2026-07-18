import json
import tempfile
from pathlib import Path
from unittest import TestCase

from app.rag.embeddings import HashingEmbeddingService
from app.rag.retriever import ContextRetriever


class RAGRetrieverTests(TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.docs_dir = self.root / "docs"
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        self.index_dir = self.root / "vector_store"

        (self.docs_dir / "osha_hot_work.txt").write_text(
            (
                "OSHA hot work regulation guidance requires gas testing, fire watch, ventilation, "
                "permit controls, and worker evacuation when combustible gas is present."
            ),
            encoding="utf-8",
        )
        (self.docs_dir / "incident_report.json").write_text(
            json.dumps(
                [
                    {
                        "title": "Gas leak near Reactor Zone",
                        "summary": "A gas leak occurred during maintenance with an active hot work permit.",
                    }
                ]
            ),
            encoding="utf-8",
        )
        (self.docs_dir / "maintenance.csv").write_text(
            "equipment,status,remark\nPump-1,overdue,Maintenance overdue in Utility Bay\n",
            encoding="utf-8",
        )

        self.retriever = ContextRetriever(
            document_roots=[self.docs_dir],
            index_dir=self.index_dir,
            embedding_service=HashingEmbeddingService(),
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_retriever_builds_index_and_returns_ranked_results(self):
        bundle = self.retriever.retrieve_sync("Which OSHA hot work rule applies to gas testing?", top_k=3)

        self.assertTrue(bundle.results)
        self.assertIn("osha_hot_work", bundle.results[0].document_name.lower())
        self.assertGreater(bundle.diagnostics["vector_count"], 0)
        self.assertGreaterEqual(bundle.diagnostics["documents_loaded"], 3)

    def test_retriever_supports_persistence_filters_and_delete(self):
        first_build = self.retriever.ensure_index()
        self.assertGreater(first_build["vector_count"], 0)

        reloaded = ContextRetriever(
            document_roots=[self.docs_dir],
            index_dir=self.index_dir,
            embedding_service=HashingEmbeddingService(),
        )
        filtered = reloaded.retrieve_sync(
            "Show the incident report for the gas leak",
            top_k=2,
            metadata_filters={"extension": ".json"},
        )
        self.assertTrue(filtered.results)
        self.assertTrue(all(item.metadata["extension"] == ".json" for item in filtered.results))

        deleted = reloaded.delete_from_index(metadata_filters={"document_name": "osha_hot_work.txt"})
        self.assertGreaterEqual(deleted, 1)
        after_delete = reloaded.retrieve_sync("OSHA hot work gas testing", top_k=3)
        self.assertTrue(all(item.document_name != "osha_hot_work.txt" for item in after_delete.results))
