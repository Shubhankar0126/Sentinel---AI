import Link from "next/link";

import { ForgotPasswordPanel } from "@/features/auth/forgot-password-panel";

export default function ForgotPasswordPage() {
  return (
    <div className="surface-panel p-8">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Credential Recovery</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Assisted password reset</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Request a secure password reset path while keeping enterprise access controls centralized.
      </p>
      <div className="mt-8">
        <ForgotPasswordPanel />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Remembered your credentials?{" "}
        <Link href="/login" className="text-primary hover:text-primary/80">
          Return to sign in
        </Link>
      </p>
    </div>
  );
}
