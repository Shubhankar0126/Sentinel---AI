"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";

export function AppErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="surface-panel max-w-lg p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-critical/10 text-critical">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold">Operational console error</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The frontend hit an unexpected state. You can retry this view without losing the rest of the session.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-xl border border-border/70 bg-background/80 p-4 text-left text-xs text-muted-foreground">
              {error.message}
            </pre>
            <Button className="mt-5" onClick={resetErrorBoundary}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry view
            </Button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

