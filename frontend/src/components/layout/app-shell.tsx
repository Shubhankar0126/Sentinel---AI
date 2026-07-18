"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { usePathname } from "next/navigation";

import { CommandPalette } from "@/components/common/command-palette";
import { NotificationCenter } from "@/components/common/notification-center";
import { Footer } from "@/components/layout/footer";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNavigation } from "@/components/layout/top-navigation";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen xl:flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopNavigation
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenNotifications={() => setNotificationOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        <Footer />
      </div>
      <MobileNavigation open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} pathname={pathname} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <NotificationCenter open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </div>
  );
}
