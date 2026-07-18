"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/api";

interface PaginationProps {
  pagination?: PaginationMeta | null;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({ pagination, onPrevious, onNext }: PaginationProps) {
  if (!pagination) {
    return null;
  }

  const currentPage = Math.floor(pagination.skip / pagination.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border/70 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onPrevious} disabled={currentPage <= 1}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={onNext} disabled={currentPage >= totalPages}>
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

