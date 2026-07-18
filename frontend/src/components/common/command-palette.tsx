"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Search, Workflow } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { VirtualizedList } from "@/components/common/virtualized-list";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSavedState } from "@/hooks/use-saved-state";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import { getNavigationItemsForRole } from "@/lib/navigation";
import { entitiesService } from "@/services/entities-service";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  title: string;
  subtitle: string;
  href: string;
  category: string;
  keywords?: string[];
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  const [recentQueries, setRecentQueries] = useSavedState<string[]>("sentinel-command-recents", []);
  const { user } = useAuth();
  const availableNavigationItems = useMemo(() => getNavigationItemsForRole(user?.role), [user?.role]);

  const { data } = useQuery({
    queryKey: [...queryKeys.dashboard.all, "global-search"],
    queryFn: async () => {
      const [plants, equipment, workers, incidents] = await Promise.all([
        entitiesService.listPlants(),
        entitiesService.listEquipment(),
        entitiesService.listWorkers(),
        entitiesService.listIncidents()
      ]);

      return {
        plants: plants.items,
        equipment: equipment.items,
        workers: workers.items,
        incidents: incidents.items
      };
    },
    enabled: open,
    staleTime: 60_000
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const quickActions = useMemo<SearchResult[]>(
    () => [
      {
        title: "Open live dashboard",
        subtitle: "Jump to the command center and live KPI view.",
        href: "/dashboard",
        category: "Quick action",
        keywords: ["dashboard", "live", "command center"]
      },
      {
        title: "Review active incidents",
        subtitle: "Open the incident investigation queue.",
        href: "/incident-center",
        category: "Quick action",
        keywords: ["incidents", "timeline", "escalation"]
      },
      {
        title: "Check notifications",
        subtitle: "Open alerts and workflow updates.",
        href: "/notifications",
        category: "Quick action",
        keywords: ["notifications", "alerts", "mark read"]
      },
      {
        title: "Launch AI Copilot",
        subtitle: "Open the AI Copilot workbench.",
        href: "/ai-copilot",
        category: "Quick action",
        keywords: ["copilot", "gemini", "rag"]
      },
      {
        title: "Inspect risk feed",
        subtitle: "Open live risk events and explainability.",
        href: "/risk-center",
        category: "Quick action",
        keywords: ["risk", "actions", "recommendations"]
      }
    ],
    []
  );

  const results = useMemo<SearchResult[]>(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) {
      return [
        ...quickActions,
        ...availableNavigationItems.map((item) => ({
          title: item.title,
          subtitle: item.description,
          href: item.href,
          category: "Navigate"
        }))
      ];
    }

    const recentMatches = recentQueries
      .filter((item) => item.toLowerCase().includes(normalized))
      .map((item) => ({
        title: item,
        subtitle: "Recent command search",
        href: "/dashboard",
        category: "Recent"
      }));

    const navMatches = availableNavigationItems
      .filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(normalized))
      .map((item) => ({
        title: item.title,
        subtitle: item.description,
        href: item.href,
        category: "Navigate"
      }));

    const quickMatches = quickActions.filter((item) =>
      `${item.title} ${item.subtitle} ${(item.keywords ?? []).join(" ")}`.toLowerCase().includes(normalized)
    );

    const plantMatches =
      data?.plants
        .filter((item) => `${item.name} ${item.location} ${item.industry}`.toLowerCase().includes(normalized))
        .map((item) => ({
          title: item.name,
          subtitle: `${item.location} | ${item.industry}`,
          href: "/plant-overview",
          category: "Plant"
        })) ?? [];

    const equipmentMatches =
      data?.equipment
        .filter((item) => `${item.equipment_name} ${item.equipment_type}`.toLowerCase().includes(normalized))
        .map((item) => ({
          title: item.equipment_name,
          subtitle: `${item.equipment_type} | ${item.status}`,
          href: "/equipment",
          category: "Equipment"
        })) ?? [];

    const workerMatches =
      data?.workers
        .filter((item) => `${item.name} ${item.department} ${item.designation}`.toLowerCase().includes(normalized))
        .map((item) => ({
          title: item.name,
          subtitle: `${item.department} | ${item.designation}`,
          href: "/workers",
          category: "Worker"
        })) ?? [];

    const incidentMatches =
      data?.incidents
        .filter((item) => `${item.title} ${item.description} ${item.incident_type}`.toLowerCase().includes(normalized))
        .map((item) => ({
          title: item.title,
          subtitle: `${item.incident_type} | ${item.status}`,
          href: "/incident-center",
          category: "Incident"
        })) ?? [];

    return [...quickMatches, ...recentMatches, ...navMatches, ...plantMatches, ...equipmentMatches, ...workerMatches, ...incidentMatches].slice(0, 20);
  }, [availableNavigationItems, data, debouncedQuery, quickActions, recentQueries]);

  const groupedResults = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((accumulator, item) => {
      accumulator[item.category] = [...(accumulator[item.category] ?? []), item];
      return accumulator;
    }, {});
  }, [results]);

  const persistRecentQuery = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    setRecentQueries((current) => [trimmed, ...current.filter((entry) => entry !== trimmed)].slice(0, 8));
  };

  return (
    <Modal open={open} onClose={onClose} title="Command palette" description="Search modules, assets, and recent operational entities.">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plants, equipment, incidents, workers..."
            aria-label="Search the Sentinel AI command palette"
            className="pl-9"
          />
        </div>
        {!debouncedQuery.trim() && recentQueries.length ? (
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium">Recent searches</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentQueries.map((item, index) => (
                <button
                  key={`recent-query-${item}-${index}`}
                  type="button"
                  className="focus-ring rounded-full border border-border/70 bg-background/60 px-3 py-1 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  onClick={() => setQuery(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {results.length ? (
          <div className="space-y-4">
            {Object.entries(groupedResults).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{category}</div>
                <VirtualizedList
                  items={items}
                  itemHeight={76}
                  height={Math.min(items.length, 4) * 76}
                  renderItem={(result) => (
                    <Link
                      key={`${result.href}-${result.title}-${result.subtitle}`}
                      href={result.href as Route}
                      className="block rounded-2xl border border-border/70 bg-background/40 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => {
                        persistRecentQuery(query || result.title);
                        onClose();
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{result.title}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">{result.subtitle}</p>
                        </div>
                        <Badge variant="neutral">{result.category}</Badge>
                      </div>
                    </Link>
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Workflow}
            title="No matching results"
            description="Try searching by asset name, incident type, or module name."
          />
        )}
      </div>
    </Modal>
  );
}
