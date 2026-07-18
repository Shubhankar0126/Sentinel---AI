"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";

interface DrawerProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
}

export function Drawer({ open, onClose, title, description, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-background/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="h-full w-full max-w-xl border-l border-border bg-card p-6 shadow-lift"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close drawer</span>
              </Button>
            </div>
            <div className="mt-6 h-[calc(100%-4rem)] overflow-y-auto pr-1">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

