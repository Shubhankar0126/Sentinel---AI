from typing import Any

from pydantic import BaseModel, Field

from app.schemas.domain import ChatHistoryRead


class CopilotConversationTurn(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str = Field(min_length=1)


class CopilotCitation(BaseModel):
    document_name: str
    section: str
    source: str
    page: str | None = None
    score: float
    snippet: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class CopilotChatRequest(BaseModel):
    question: str = Field(min_length=3)
    plant_id: str | None = None
    user_id: str | None = None
    metadata_filters: dict[str, str] | None = None
    conversation_history: list[CopilotConversationTurn] = Field(default_factory=list)


class CopilotHistoryDeleteResponse(BaseModel):
    deleted_count: int


class CopilotChatResponse(BaseModel):
    summary: str
    current_situation: str
    evidence: list[str] = Field(default_factory=list)
    applicable_regulations: list[str]
    recommendations: list[str]
    citations: list[CopilotCitation]
    confidence: float
    provider: str
    retrieved_documents: list[str] = Field(default_factory=list)
    saved_chat: ChatHistoryRead | None = None
