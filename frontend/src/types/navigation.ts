import type { LucideIcon } from "lucide-react";

import type { UserRole } from "@/types/domain";

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  roles?: UserRole[];
}

