import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { env } from "@/lib/env";
import type { ApiListResult, ApiResponse } from "@/types/api";
import type { RefreshTokenResponse } from "@/types/auth";
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens
} from "@/store/auth-storage";

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _requestRetryCount?: number;
};

let refreshPromise: Promise<string | null> | null = null;

const shouldRefresh = (error: AxiosError) => {
  const requestUrl = error.config?.url ?? "";
  return error.response?.status === 401 && !requestUrl.includes("/auth/refresh");
};

const shouldRetryRequest = (error: AxiosError, config?: RetryableConfig) => {
  const retryCount = config?._requestRetryCount ?? 0;
  const isSafeMethod = (config?.method ?? "get").toLowerCase() === "get";
  const statusCode = error.response?.status ?? 0;
  return isSafeMethod && retryCount < 1 && (statusCode >= 500 || error.code === "ECONNABORTED");
};

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = axios
    .post<ApiResponse<RefreshTokenResponse>>(
      `${env.apiBaseUrl}/auth/refresh`,
      { refresh_token: getStoredRefreshToken() },
      { headers: { "Content-Type": "application/json" } }
    )
    .then(({ data }) => {
      const tokens = data.data;
      storeTokens(tokens);
      return tokens.access_token;
    })
    .catch(() => {
      clearStoredTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sentinel:auth-expired"));
      }
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    if (config && shouldRetryRequest(error, config)) {
      config._requestRetryCount = (config._requestRetryCount ?? 0) + 1;
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      return apiClient(config);
    }

    if (!config || config._retry || !shouldRefresh(error) || !getStoredRefreshToken()) {
      return Promise.reject(error);
    }

    config._retry = true;
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      return Promise.reject(error);
    }

    config.headers.set("Authorization", `Bearer ${refreshedToken}`);
    return apiClient(config);
  }
);

export const unwrapResponse = <T>(response: ApiResponse<T>) => response.data;

export const unwrapListResponse = <T>(response: ApiResponse<T[]>) => ({
  items: response.data,
  pagination: response.pagination ?? null
}) satisfies ApiListResult<T>;
