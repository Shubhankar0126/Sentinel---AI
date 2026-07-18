"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPanel() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  const email = watch("email");

  const submit = handleSubmit(({ email: requestedEmail }) => {
    if (typeof window !== "undefined") {
      const subject = encodeURIComponent("Sentinel AI Password Reset Request");
      const body = encodeURIComponent(
        `Please assist with a password reset for ${requestedEmail}.\n\nRequested from the Sentinel AI sign-in experience on ${new Date().toISOString()}.`
      );
      window.location.href = `mailto:${env.supportEmail}?subject=${subject}&body=${body}`;
    }
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
        Password reset requests are routed through the configured support contact so identity can be verified before
        access is restored.
      </div>
      <form className="space-y-5" onSubmit={submit}>
        <div>
          <label htmlFor="reset-email" className="mb-2 block text-sm font-medium">
            Work email
          </label>
          <Input id="reset-email" type="email" placeholder="operator@plant.com" {...register("email")} />
          {errors.email ? <p className="mt-2 text-sm text-critical">{errors.email.message}</p> : null}
        </div>
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-accent" />
            <p>Submitting opens a structured email to <strong>{env.supportEmail}</strong> with the requested address.</p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-accent" />
            <p>Support can validate identity before changing credentials in Sentinel AI.</p>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={!email}>
          Request assisted reset
        </Button>
      </form>
    </div>
  );
}
