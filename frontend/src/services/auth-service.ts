import type { AuthResponse, LoginRequest, RefreshTokenResponse, RegisterRequest } from "@/types/auth";
import type { UserRead } from "@/types/domain";
import type { ApiResponse } from "@/types/api";
import { apiClient, unwrapResponse } from "@/services/api-client";

export const authService = {
  async login(payload: LoginRequest) {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login", payload);
    return unwrapResponse(data);
  },
  async register(payload: RegisterRequest) {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/register", payload);
    return unwrapResponse(data);
  },
  async refresh(refreshToken: string) {
    const { data } = await apiClient.post<ApiResponse<RefreshTokenResponse>>("/auth/refresh", {
      refresh_token: refreshToken
    });
    return unwrapResponse(data);
  },
  async me() {
    const { data } = await apiClient.get<ApiResponse<UserRead>>("/auth/me");
    return unwrapResponse(data);
  }
};

