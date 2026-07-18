import type { ChatHistoryRead } from "@/types/domain";

export interface CopilotConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CopilotCitation {
  document_name: string;
  section: string;
  source: string;
  page?: string | null;
  score: number;
  snippet: string;
  metadata: Record<string, unknown>;
}

export interface CopilotChatRequest {
  question: string;
  plant_id?: string | null;
  metadata_filters?: Record<string, string> | null;
  conversation_history?: CopilotConversationTurn[];
}

export interface CopilotChatResponse {
  summary: string;
  current_situation: string;
  evidence: string[];
  applicable_regulations: string[];
  recommendations: string[];
  citations: CopilotCitation[];
  confidence: number;
  provider: string;
  retrieved_documents: string[];
  saved_chat?: ChatHistoryRead | null;
}

export interface CopilotHistoryDeleteResponse {
  deleted_count: number;
}

