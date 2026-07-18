"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, HardDrive, HeartPulse, Shield, UserCircle2 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { EnterpriseCard } from "@/components/common/enterprise-card";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { healthService } from "@/services/health-service";
import { formatDateTime, titleCase } from "@/utils/format";

export default function SettingsPage() {
  const { user } = useAuth();
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => healthService.getHealth()
  });
  const versionQuery = useQuery({
    queryKey: ["version"],
    queryFn: () => healthService.getVersion()
  });

  const datasetEntries = useMemo(
    () => Object.entries(healthQuery.data?.datasets ?? {}),
    [healthQuery.data?.datasets]
  );

  if (healthQuery.isLoading || versionQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (healthQuery.isError || versionQuery.isError || !healthQuery.data) {
    return (
      <ErrorState
        title="Settings unavailable"
        description="Platform health or version metadata could not be loaded."
        onRetry={() => void Promise.all([healthQuery.refetch(), versionQuery.refetch()])}
      />
    );
  }

  return (
    <div className="panel-grid">
      <PageHeader
        eyebrow="Platform Settings"
        title="Settings"
        description="Inspect session identity, platform health, and runtime dataset visibility."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Application" value={1} icon={HeartPulse} tone="success" trend={titleCase(healthQuery.data.application)} />
        <MetricCard title="Datasets exposed" value={datasetEntries.length} icon={HardDrive} tone="primary" />
        <MetricCard title="Environment" value={1} icon={Shield} tone="warning" trend={titleCase(healthQuery.data.environment)} />
        <MetricCard title="Database" value={1} icon={Database} tone="success" trend={titleCase(healthQuery.data.database)} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.8fr_1.2fr]">
        <EnterpriseCard title="Current session" description="Operator identity for the current signed-in session.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <UserCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Signed in as</p>
                  <p className="text-lg font-semibold">{user?.name ?? "Unknown operator"}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="mt-2 text-sm font-medium">{user?.email ?? "Unavailable"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">Role</p>
                <div className="mt-3">
                  <StatusBadge status={user?.role ?? "unknown"} />
                </div>
              </div>
            </div>
          </div>
        </EnterpriseCard>

        <EnterpriseCard title="Platform health" description="Live platform metadata from the health and version services.">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Application</p>
              <p className="mt-2 text-lg font-semibold">{healthQuery.data.application}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Database</p>
              <p className="mt-2 text-lg font-semibold">{healthQuery.data.database}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Environment</p>
              <p className="mt-2 text-lg font-semibold">{healthQuery.data.environment}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="mt-2 text-lg font-semibold">{healthQuery.data.version}</p>
            </div>
          </div>

          <div className="mt-5">
            <EnterpriseCard title="Dataset exposure" contentClassName="pt-5">
              {datasetEntries.length ? (
                <div className="space-y-3">
                  {datasetEntries.map(([datasetName, metadata]) => (
                    <div key={datasetName} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      <p className="font-medium">{datasetName}</p>
                      <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                        {JSON.stringify(metadata, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={HardDrive}
                  title="No dataset metadata exposed"
                  description="Dataset-level metadata is not currently exposed in the health response."
                />
              )}
            </EnterpriseCard>
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">Version details</p>
            <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
              {JSON.stringify(versionQuery.data, null, 2)}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Verified locally on {formatDateTime(new Date().toISOString())}
            </p>
          </div>
        </EnterpriseCard>
      </div>
    </div>
  );
}
