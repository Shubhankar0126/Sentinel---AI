"use client";

import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavigationItemByHref } from "@/lib/navigation";
import { titleCase } from "@/utils/format";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (!segments.length) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/dashboard" className="transition-colors hover:text-foreground">
        Operations
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const label = getNavigationItemByHref(href)?.title ?? titleCase(segment.replaceAll("-", " "));
        const isLast = index === segments.length - 1;
        return (
          <div key={href} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="text-foreground">{label}</span>
            ) : (
              <Link href={href as Route} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
