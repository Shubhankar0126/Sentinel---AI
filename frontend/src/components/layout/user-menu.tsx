"use client";

import { MonitorCog, Moon, Sun, UserCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="secondary" className="gap-2" onClick={() => setOpen((current) => !current)}>
        <UserCircle2 className="h-4 w-4" />
        <span className="hidden sm:inline">{user?.name ?? "Operator"}</span>
      </Button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-card p-3 shadow-lift">
          <div className="rounded-xl bg-background/50 p-3">
            <p className="font-medium">{user?.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-accent">{user?.role?.replaceAll("_", " ")}</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button variant={theme === "light" ? "primary" : "secondary"} size="sm" onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </Button>
            <Button variant={theme === "dark" ? "primary" : "secondary"} size="sm" onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </Button>
            <Button variant={theme === "system" ? "primary" : "secondary"} size="sm" onClick={() => setTheme("system")}>
              <MonitorCog className="mr-2 h-4 w-4" />
              Auto
            </Button>
          </div>
          <Button className="mt-3 w-full" variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
}

