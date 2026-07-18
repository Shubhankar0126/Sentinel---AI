const defaultApiBaseUrl = "http://127.0.0.1:8000/api/v1";

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
  appName: "Sentinel AI",
  appVersion: "Sprint 1",
  supportEmail: "admin@sentinelai.com"
};

