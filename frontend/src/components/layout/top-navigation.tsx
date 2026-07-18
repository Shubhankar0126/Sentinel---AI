"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Command, Menu, Search } from "lucide-react";

import { AppBrand, BrandMark } from "@/components/common/app-brand";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { liveIntervals } from "@/lib/live";
import { queryKeys } from "@/lib/query-keys";
import { notificationService } from "@/services/notification-service";

interface TopNavigationProps {
  onOpenPalette: () => void;
  onOpenNotifications: () => void;
  onOpenMobileNav?: () => void;
}

export function TopNavigation({
  onOpenPalette,
  onOpenNotifications,
  onOpenMobileNav
}: TopNavigationProps) {
  const unreadQuery = useQuery({
    queryKey: [...queryKeys.notifications.unread, "nav"],
    queryFn: () => notificationService.listUnread(),
    refetchInterval: liveIntervals.notifications
  });

  const unreadCount = unreadQuery.data?.length ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onOpenMobileNav ? (
            <Button variant="ghost" size="icon" className="xl:hidden" onClick={onOpenMobileNav}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
          ) : null}
          <div className="md:hidden">
            <BrandMark size="sm" />
          </div>
          <div className="hidden md:block">
            <AppBrand size="sm" showSubtitle={false} />
          </div>
          <div className="min-w-0">
            <Breadcrumbs />
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">Industrial AI Operations Platform</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="icon" className="md:hidden" onClick={onOpenPalette}>
            <Search className="h-4 w-4" />
            <span className="sr-only">Open search</span>
          </Button>
          <Button variant="secondary" className="hidden md:inline-flex" onClick={onOpenPalette}>
            <Search className="mr-2 h-4 w-4" />
            Global search
            <span className="ml-3 rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
              <Command className="mr-1 inline h-3 w-3" />K
            </span>
          </Button>
          <Button variant="secondary" size="icon" onClick={onOpenNotifications} className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-critical px-1.5 py-0.5 text-[10px] font-semibold text-critical-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
            <span className="sr-only">Open notifications</span>
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
