import Link from "next/link";
import { Shield } from "lucide-react";

import { AppBrand } from "@/components/common/app-brand";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <div className="surface-panel p-7 sm:p-8 lg:p-10">
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          <AppBrand
            variant="vertical"
            size="lg"
            title="SENTINEL AI"
            subtitle="AI-Powered Industrial Safety"
            uppercaseTitle
            center
            priority
          />
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-accent">Secure Access</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
          Sign in to the operations console
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
          Use your Sentinel AI enterprise account to access the industrial operations console.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          Password issue?{" "}
          <Link
            href="/forgot-password"
            className="focus-ring rounded-md text-primary transition-colors hover:text-primary/80"
          >
            Open assisted reset
          </Link>
        </p>
      </div>

      <section
        aria-labelledby="enterprise-access-heading"
        className="mt-8 rounded-2xl border border-border/70 bg-background/35 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-border/70 bg-background/60 p-2 text-primary">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="enterprise-access-heading" className="text-sm font-semibold tracking-[0.02em] text-foreground">
              Enterprise Access
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Sentinel AI is an enterprise industrial safety platform.</p>
              <p>User accounts are created and managed by authorized system administrators.</p>
              <p>If you require access, please contact your organization&apos;s administrator.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
