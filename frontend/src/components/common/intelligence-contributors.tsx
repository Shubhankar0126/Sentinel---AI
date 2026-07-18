import { CheckCircle2 } from "lucide-react";

import type { IntelligenceContributor } from "@/utils/intelligence";

interface IntelligenceContributorsProps {
  items: IntelligenceContributor[];
  emptyDescription?: string;
}

export function IntelligenceContributors({
  items,
  emptyDescription = "No AI contributors are available for this view yet."
}: IntelligenceContributorsProps) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyDescription}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${item.label}-${index}`}
          className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/35 p-3"
        >
          <div className="mt-0.5 rounded-full bg-success/10 p-1 text-success">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
