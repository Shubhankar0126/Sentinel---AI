const defaultPrimaryApi = "http://127.0.0.1:8000/api/v1";
const defaultSecondaryApi = "https://sentinel-ai-v5dy.onrender.com/api/v1";

export const env = {
  primaryApiBaseUrl:
    process.env.NEXT_PUBLIC_PRIMARY_API ?? defaultPrimaryApi,

  secondaryApiBaseUrl:
    process.env.NEXT_PUBLIC_SECONDARY_API ?? defaultSecondaryApi,

  appName: "Sentinel AI",
  appVersion: "Sprint 1",
  supportEmail: "admin@sentinelai.com",
};
