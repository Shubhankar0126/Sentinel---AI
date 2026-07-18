import type { ApiListResult, ApiResponse } from "@/types/api";
import type { NotificationRead } from "@/types/domain";
import { apiClient, unwrapListResponse, unwrapResponse } from "@/services/api-client";

export interface NotificationUpdatePayload {
  title?: string;
  message?: string;
  type?: "info" | "warning" | "critical";
  priority?: "low" | "medium" | "high" | "critical";
  read?: boolean;
}

export const notificationService = {
  async list(params?: { skip?: number; limit?: number }) {
    const { data } = await apiClient.get<ApiResponse<NotificationRead[]>>("/notifications", { params });
    return unwrapListResponse<NotificationRead>(data) satisfies ApiListResult<NotificationRead>;
  },
  async listUnread() {
    const { data } = await apiClient.get<ApiResponse<NotificationRead[]>>("/notifications/unread");
    return unwrapResponse(data);
  },
  async update(notificationId: string, payload: NotificationUpdatePayload) {
    const { data } = await apiClient.put<ApiResponse<NotificationRead>>(`/notifications/${notificationId}`, payload);
    return unwrapResponse(data);
  },
  async remove(notificationId: string) {
    const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/notifications/${notificationId}`);
    return unwrapResponse(data);
  }
};

