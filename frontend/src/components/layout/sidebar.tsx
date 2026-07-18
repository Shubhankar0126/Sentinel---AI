"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppBrand, BrandMark } from "@/components/common/app-brand";
import { Button } from "@/components/ui/button";
import { getNavigationItemsForRole, isNavigationItemActive } from "@/lib/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/utils/cn";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = getNavigationItemsForRole(user?.role);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border/70 bg-slate-950/90 px-3 py-4 backdrop-blur xl:flex xl:flex-col",
        collapsed ? "w-[92px]" : "w-[300px]"
      )}
    >
      <div
        className={cn(
          "mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 px-3 py-3",
          collapsed && "px-2.5"
        )}
      >
        {collapsed ? (
          <div className="flex min-w-0 flex-1 justify-center">
            <BrandMark size="sm" />
          </div>
        ) : (
          <AppBrand
            size="md"
            subtitle="Industrial operations platform"
            className="min-w-0 flex-1"
          />
        )}
        <Button variant="ghost" size="icon" onClick={onToggle}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {items.map((item) => {
          const active = isNavigationItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.title : undefined}
              className={cn(
                "group flex items-start gap-3 rounded-2xl border px-3 py-3 transition-all",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-card/70 hover:text-foreground"
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground group-hover:text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
        <p className={cn("text-xs uppercase tracking-[0.18em] text-primary", collapsed && "sr-only")}>Live posture</p>
        <p className={cn("mt-2 text-sm text-muted-foreground", collapsed && "hidden")}>
          Monitor risk, response, and compliance from a single operating surface.
        </p>
      </div>
    </aside>
  );
}
