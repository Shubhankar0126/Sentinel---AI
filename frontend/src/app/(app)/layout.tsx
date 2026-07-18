"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/common/loading-state";
import { useAuth } from "@/hooks/use-auth";

export default function ProtectedAppLayout({ children }: PropsWithChildren) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <LoadingState rows={5} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
