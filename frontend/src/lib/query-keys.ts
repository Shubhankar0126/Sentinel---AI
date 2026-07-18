export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: ["auth", "me"] as const
  },
  dashboard: {
    all: ["dashboard"] as const
  },
  plants: {
    all: ["plants"] as const
  },
  zones: {
    all: ["zones"] as const,
    summary: (zoneId: string) => ["zones", zoneId, "summary"] as const
  },
  equipment: {
    all: ["equipment"] as const,
    health: (equipmentId: string) => ["equipment", equipmentId, "health"] as const
  },
  workers: {
    all: ["workers"] as const,
    safety: (workerId: string) => ["workers", workerId, "safety"] as const
  },
  permits: {
    all: ["permits"] as const,
    conflicts: (permitId: string) => ["permits", permitId, "conflicts"] as const
  },
  maintenance: {
    all: ["maintenance"] as const,
    overdue: ["maintenance", "overdue"] as const
  },
  incidents: {
    all: ["incidents"] as const,
    report: (incidentId: string) => ["incidents", incidentId, "report"] as const
  },
  risk: {
    live: ["risk", "live"] as const,
    history: ["risk", "history"] as const
  },
  analytics: {
    all: ["analytics"] as const
  },
  graph: {
    all: ["graph"] as const
  },
  compliance: {
    all: ["compliance"] as const
  },
  notifications: {
    all: ["notifications"] as const,
    unread: ["notifications", "unread"] as const
  },
  actions: {
    all: ["actions"] as const,
    pending: ["actions", "pending"] as const
  },
  copilot: {
    history: ["copilot", "history"] as const
  },
  simulation: {
    scenarios: ["simulation", "scenarios"] as const
  }
};
