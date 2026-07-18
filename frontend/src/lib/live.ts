export const liveIntervals = {
  dashboard: 20_000,
  incidents: 15_000,
  notifications: 12_000,
  notificationDrawer: 10_000,
  assets: 25_000,
  map: 20_000,
  analytics: 45_000,
  copilotHistory: 20_000
} as const;

export function getLiveRefetchInterval(enabled: boolean, interval: number) {
  return enabled ? interval : false;
}

export function formatLastUpdated(timestamp?: string | Date | null) {
  if (!timestamp) {
    return "Awaiting first sync";
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return `Last synced ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })}`;
}
