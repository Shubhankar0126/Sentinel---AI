import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from unittest import IsolatedAsyncioTestCase

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.base import Base
from app.models.entities import Incident, Plant, Recommendation, RiskEvent, User, Zone
from app.models.enums import (
    IncidentStatus,
    IncidentType,
    LifecycleStatus,
    PriorityLevel,
    RecommendationStatus,
    RiskStatus,
    SeverityLevel,
    UserRole,
)
from app.rag.embeddings import HashingEmbeddingService
from app.rag.retriever import ContextRetriever
from app.schemas.copilot import CopilotChatRequest, CopilotConversationTurn
from app.services.copilot import CopilotService


class CopilotServiceTests(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.temp_db.close()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.docs_dir = Path(self.temp_dir.name) / "docs"
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        self.index_dir = Path(self.temp_dir.name) / "vector_store"

        (self.docs_dir / "osha_regulation.txt").write_text(
            (
                "OSHA hot work controls require atmospheric testing, ventilation, "
                "continuous permit review, and fire watch coverage near combustible gas."
            ),
            encoding="utf-8",
        )
        (self.docs_dir / "emergency_procedure.md").write_text(
            (
                "Emergency procedure: evacuate the zone, isolate ignition sources, "
                "and notify the safety officer when gas readings rise during work."
            ),
            encoding="utf-8",
        )

        database_url = f"sqlite+aiosqlite:///{self.temp_db.name}"
        self.engine = create_async_engine(database_url, future=True)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False, class_=AsyncSession)
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

        self.retriever = ContextRetriever(
            document_roots=[self.docs_dir],
            index_dir=self.index_dir,
            embedding_service=HashingEmbeddingService(),
        )
        await self._seed()

    async def asyncTearDown(self):
        await self.engine.dispose()
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)
        self.temp_dir.cleanup()

    async def _seed(self):
        async with self.session_factory() as session:
            plant = Plant(
                name="Copilot Plant",
                location="Mumbai",
                industry="Chemical",
                status=LifecycleStatus.ACTIVE,
            )
            session.add(plant)
            await session.flush()

            zone = Zone(
                plant_id=plant.id,
                zone_name="Reactor Zone",
                risk_level=SeverityLevel.HIGH,
                description="High energy process zone",
            )
            session.add(zone)
            await session.flush()

            user = User(
                name="Copilot User",
                email="copilot@test.local",
                password_hash="hashed",
                role=UserRole.SAFETY_OFFICER,
                plant_id=plant.id,
                status=LifecycleStatus.ACTIVE,
            )
            session.add(user)
            await session.flush()

            risk = RiskEvent(
                zone_id=zone.id,
                risk_score=86.0,
                severity=SeverityLevel.CRITICAL,
                confidence=0.91,
                risk_category="explosion",
                reason="Gas concentration exceeded threshold during active hot work.",
                recommendation="Suspend hot work permit and evacuate the zone.",
                status=RiskStatus.OPEN,
            )
            session.add(risk)
            await session.flush()

            session.add(
                Recommendation(
                    risk_event_id=risk.id,
                    action="Dispatch the safety officer and increase ventilation.",
                    priority=PriorityLevel.CRITICAL,
                    status=RecommendationStatus.OPEN,
                )
            )

            session.add(
                Incident(
                    title="Historical gas leak",
                    description="Gas leak during maintenance with a hot work permit in Reactor Zone.",
                    severity=SeverityLevel.HIGH,
                    zone_id=zone.id,
                    incident_type=IncidentType.GAS_LEAK,
                    status=IncidentStatus.CLOSED,
                    reported_at=datetime.now(UTC),
                    source_dataset="test",
                )
            )
            await session.commit()

            self.user_id = user.id
            self.plant_id = plant.id

    async def test_copilot_chat_returns_citations_and_persists_memory(self):
        async with self.session_factory() as session:
            service = CopilotService(session, retriever=self.retriever)
            response = await service.chat(
                CopilotChatRequest(
                    user_id=self.user_id,
                    plant_id=self.plant_id,
                    question="Which OSHA regulation applies to hot work near a gas leak in Reactor Zone?",
                    conversation_history=[
                        CopilotConversationTurn(
                            role="user",
                            content="We are reviewing a hot work permit in the reactor area.",
                        )
                    ],
                )
            )

            self.assertTrue(response.summary)
            self.assertEqual(response.provider, "offline-fallback")
            self.assertTrue(response.citations)
            self.assertTrue(any("osha" in citation.document_name.lower() for citation in response.citations))
            self.assertTrue(response.applicable_regulations)
            self.assertTrue(response.recommendations)

            history = await service.history(self.user_id)
            self.assertEqual(len(history), 1)
            cleared = await service.clear_history(self.user_id)
            self.assertEqual(cleared.deleted_count, 1)
            self.assertEqual(len(await service.history(self.user_id)), 0)
