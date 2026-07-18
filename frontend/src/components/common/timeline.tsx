import { formatDateTime } from "@/utils/format";

interface TimelineItem {
  title: string;
  timestamp?: string | null;
  description?: string | null;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full bg-accent" />
            {index < items.length - 1 ? <span className="mt-1 h-full w-px bg-border" /> : null}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium">{item.title}</p>
            {item.timestamp ? <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</p> : null}
            {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

