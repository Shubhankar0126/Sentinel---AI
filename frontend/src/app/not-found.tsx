import Link from "next/link";
import { Radar } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface-panel max-w-xl p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Radar className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">Operational view not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This route is not available in the current Sentinel AI platform view. Return to the command center to continue.
        </p>
        <Link href="/dashboard">
          <Button className="mt-6">Open dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
