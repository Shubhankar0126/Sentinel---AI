import type { TokenPair } from "@/types/auth";

const storageKeys = {
  accessToken: "sentinel.access-token",
  refreshToken: "sentinel.refresh-token"
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getStoredAccessToken() {
  return canUseStorage() ? window.localStorage.getItem(storageKeys.accessToken) : null;
}

export function getStoredRefreshToken() {
  return canUseStorage() ? window.localStorage.getItem(storageKeys.refreshToken) : null;
}

export function storeTokens(tokens: TokenPair) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(storageKeys.accessToken, tokens.access_token);
  window.localStorage.setItem(storageKeys.refreshToken, tokens.refresh_token);
}

export function clearStoredTokens() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(storageKeys.accessToken);
  window.localStorage.removeItem(storageKeys.refreshToken);
}
