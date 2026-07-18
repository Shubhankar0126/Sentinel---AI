import type { ApiResponse } from "@/types/api";
import type {
  CopilotChatRequest,
  CopilotChatResponse,
  CopilotHistoryDeleteResponse
} from "@/types/copilot";
import type { ChatHistoryRead } from "@/types/domain";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const copilotService = {
  async chat(payload: CopilotChatRequest) {
    const { data } = await apiClient.post<ApiResponse<CopilotChatResponse>>("/copilot/chat", payload);
    return unwrapResponse(data);
  },
  async getHistory() {
    const { data } = await apiClient.get<ApiResponse<ChatHistoryRead[]>>("/copilot/history");
    return unwrapResponse(data);
  },
  async clearHistory() {
    const { data } = await apiClient.delete<ApiResponse<CopilotHistoryDeleteResponse>>("/copilot/history");
    return unwrapResponse(data);
  }
};

