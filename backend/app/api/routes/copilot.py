from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.schemas.copilot import CopilotChatRequest, CopilotChatResponse, CopilotHistoryDeleteResponse
from app.schemas.domain import ChatHistoryRead
from app.services.copilot import CopilotService

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/chat", response_model=APIResponse[CopilotChatResponse])
async def chat(payload: CopilotChatRequest, current_user=Depends(get_current_user), session=Depends(get_db_session)):
    item = await CopilotService(session).chat(payload.model_copy(update={"user_id": current_user.id}))
    return build_response(item, message="Copilot response generated successfully.")


@router.get("/history", response_model=APIResponse[list[ChatHistoryRead]])
async def history(current_user=Depends(get_current_user), session=Depends(get_db_session)):
    items = await CopilotService(session).history(current_user.id)
    return build_response(list(items), message="Copilot history retrieved successfully.")


@router.delete("/history", response_model=APIResponse[CopilotHistoryDeleteResponse])
async def clear_history(current_user=Depends(get_current_user), session=Depends(get_db_session)):
    item = await CopilotService(session).clear_history(current_user.id)
    return build_response(item, message="Copilot history cleared successfully.")
