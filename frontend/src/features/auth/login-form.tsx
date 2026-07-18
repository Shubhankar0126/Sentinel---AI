"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/providers/notification-provider";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { notify } = useNotifications();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      notify({ title: "Authentication successful", description: "Operator session restored.", tone: "success" });
      router.replace("/dashboard");
    } catch (error) {
      notify({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "The platform could not complete sign-in.",
        tone: "critical"
      });
    }
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit} aria-busy={isSubmitting}>
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="operator@plant.com"
            className="h-11 rounded-2xl pl-11"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={isSubmitting}
            {...register("email")}
          />
        </div>
        {errors.email ? (
          <p id="email-error" className="text-sm text-critical" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Minimum 8 characters"
            className="h-11 rounded-2xl pl-11"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={isSubmitting}
            {...register("password")}
          />
        </div>
        {errors.password ? (
          <p id="password-error" className="text-sm text-critical" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 focus-visible:translate-y-0 disabled:hover:translate-y-0"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Authenticating...
          </>
        ) : (
          "Sign in to Sentinel AI"
        )}
      </Button>
    </form>
  );
}
