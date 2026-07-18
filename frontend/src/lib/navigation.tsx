import {
  Activity,
  Bell,
  Bot,
  ClipboardCheck,
  Gauge,
  HardHat,
  LayoutDashboard,
  Map,
  ShieldCheck,
  Settings,
  Users,
  Wrench
} from "lucide-react";

import type { UserRole } from "@/types/domain";
import type { NavigationItem } from "@/types/navigation";

export const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Mission control and live operational health.",
    roles: ["admin", "plant_manager", "safety_officer", "maintenance", "viewer"]
  },
  {
    title: "Plant Overview",
    href: "/plant-overview",
    icon: Gauge,
    description: "Plants, zones, and operational footprint.",
    roles: ["admin", "plant_manager", "safety_officer", "viewer"]
  },
  {
    title: "Plant Map",
    href: "/plant-map",
    icon: Map,
    description: "Spatial view of plants and zone hotspots.",
    roles: ["admin", "plant_manager", "safety_officer", "viewer"]
  },
  {
    title: "Risk Center",
    href: "/risk-center",
    icon: Activity,
    description: "Compound risk feed and explainability.",
    roles: ["admin", "plant_manager", "safety_officer", "maintenance"]
  },
  {
    title: "Incident Center",
    href: "/incident-center",
    icon: ClipboardCheck,
    description: "Historical incidents and AI-generated reports.",
    roles: ["admin", "plant_manager", "safety_officer", "maintenance", "viewer"]
  },
  {
    title: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    description: "Schedules, overdue items, and execution status.",
    roles: ["admin", "plant_manager", "maintenance", "safety_officer"]
  },
  {
    title: "Workers",
    href: "/workers",
    icon: Users,
    description: "Workforce visibility and safety posture.",
    roles: ["admin", "plant_manager", "safety_officer", "viewer"]
  },
  {
    title: "Equipment",
    href: "/equipment",
    icon: ShieldCheck,
    description: "Asset health and failure posture.",
    roles: ["admin", "plant_manager", "maintenance", "safety_officer", "viewer"]
  },
  {
    title: "Permits",
    href: "/permits",
    icon: HardHat,
    description: "Permit-to-work control and conflict detection.",
    roles: ["admin", "plant_manager", "safety_officer", "viewer"]
  },
  {
    title: "Compliance",
    href: "/compliance",
    icon: ShieldCheck,
    description: "Framework reports and corrective actions.",
    roles: ["admin", "plant_manager", "safety_officer"]
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: Activity,
    description: "Safety performance and breakdown analysis.",
    roles: ["admin", "plant_manager", "safety_officer", "viewer"]
  },
  {
    title: "AI Copilot",
    href: "/ai-copilot",
    icon: Bot,
    description: "Grounded safety copilot with cited guidance.",
    roles: ["admin", "plant_manager", "safety_officer", "maintenance", "viewer"]
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    description: "Alert center and escalation visibility.",
    roles: ["admin", "plant_manager", "safety_officer", "maintenance", "viewer"]
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Session preferences and theme controls.",
    roles: ["admin", "plant_manager", "safety_officer", "maintenance", "viewer"]
  }
];

function normalizeNavigationPath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function getNavigationItemsForRole(role?: UserRole | null) {
  return navigationItems.filter((item) => !item.roles || (role ? item.roles.includes(role) : false));
}

export function isNavigationItemActive(pathname: string, href: string) {
  const normalizedPathname = normalizeNavigationPath(pathname);
  const normalizedHref = normalizeNavigationPath(href);

  return (
    normalizedPathname === normalizedHref ||
    (normalizedHref !== "/" && normalizedPathname.startsWith(`${normalizedHref}/`))
  );
}

export function getNavigationItemByHref(href: string) {
  const normalizedHref = normalizeNavigationPath(href);
  return navigationItems.find((item) => normalizeNavigationPath(item.href) === normalizedHref);
}
