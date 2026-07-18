"use client";

import { useEffect, useRef } from "react";
import type { Route } from "next";
import Link from "next/link";

import { AppBrand } from "@/components/common/app-brand";
import { Drawer } from "@/components/ui/drawer";
import { getNavigationItemsForRole, isNavigationItemActive } from "@/lib/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/utils/cn";

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

export function MobileNavigation({ open, onClose, pathname }: MobileNavigationProps) {
  const { user } = useAuth();
  const previousPathname = useRef(pathname);
  const items = getNavigationItemsForRole(user?.role);

  useEffect(() => {
    if (open && previousPathname.current !== pathname) {
      onClose();
    }
    previousPathname.current = pathname;
  }, [open, onClose, pathname]);

  return (
    <Drawer open={open} onClose={onClose} title="Navigation" description="Operational modules available for the current role.">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
          <AppBrand size="md" subtitle="Industrial operations platform" />
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-2xl border px-4 py-3 transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 bg-background/40 text-foreground"
              )}
              onClick={onClose}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Drawer>
  );
}
