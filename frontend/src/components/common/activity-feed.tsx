import { formatDateTime } from "@/utils/format";

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
