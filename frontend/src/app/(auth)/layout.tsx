"use client";

import { useEffect } from "react";
import { ShieldCheck, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";

import { AppBrand } from "@/components/common/app-brand";
import { useAuth } from "@/hooks/use-auth";

export default function AuthLayout({ children }: PropsWithChildren) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative hidden overflow-hidden border-r border-border/70 bg-slate-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_30%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1))]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div>
            <AppBrand
              size="md"
              subtitle="AI-Powered Industrial Safety"
              className="max-w-max"
              priority
            />
            <h1 className="mt-5 max-w-lg text-5xl font-semibold leading-tight text-balance">
              Industrial AI operations for live risk, safety, and compliance.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300">
              A command surface built for hazardous operations, connected equipment, incident investigation, and
              explainable AI decision support.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="surface-panel p-5">
              <div className="flex items-start gap-4">
                <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Role-aware operational access</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Secure, role-aware sessions aligned with plant-specific permissions and enterprise access controls.
                  </p>
                </div>
              </div>
            </div>
            <div className="surface-panel p-5">
              <div className="flex items-start gap-4">
                <Waves className="mt-1 h-6 w-6 text-accent" />
                <div>
                  <p className="font-medium">Explainable risk intelligence</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Navigate live risks, knowledge graph relationships, and grounded operational reasoning from one
                    enterprise control surface.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
