"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, OctagonAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type ToastTone = "info" | "success" | "warning" | "critical";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface NotificationContextValue {
  notify: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  info: "border-primary/30 bg-primary/10 text-foreground",
  success: "border-success/30 bg-success/10 text-foreground",
  warning: "border-warning/30 bg-warning/10 text-foreground",
  critical: "border-critical/30 bg-critical/10 text-foreground"
};

const toneIcons = {
  info: Bell,
  success: CheckCircle2,
  warning: OctagonAlert,
  critical: OctagonAlert
};

export function NotificationProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = toneIcons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn(
                  "pointer-events-auto rounded-xl border p-4 shadow-lift backdrop-blur",
                  toneStyles[toast.tone]
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{toast.title}</p>
                    {toast.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => dismiss(toast.id)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss toast</span>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider.");
  }
  return context;
}

