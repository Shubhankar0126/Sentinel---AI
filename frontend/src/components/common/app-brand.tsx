"use client";

import Image from "next/image";

import { cn } from "@/utils/cn";

type BrandSize = "sm" | "md" | "lg";
type BrandVariant = "horizontal" | "vertical";

interface BrandMarkProps {
  size?: BrandSize;
  className?: string;
  priority?: boolean;
}

interface AppBrandProps {
  variant?: BrandVariant;
  size?: BrandSize;
  className?: string;
  title?: string;
  subtitle?: string;
  showSubtitle?: boolean;
  uppercaseTitle?: boolean;
  center?: boolean;
  priority?: boolean;
}

const markSizeClasses: Record<BrandSize, string> = {
  sm: "h-10 w-10 rounded-2xl",
  md: "h-12 w-12 rounded-[1.25rem]",
  lg: "h-24 w-24 rounded-[1.75rem]"
};

const titleSizeClasses: Record<BrandSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl"
};

const subtitleSizeClasses: Record<BrandSize, string> = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm"
};

export function BrandMark({ size = "md", className, priority = false }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-white/10 bg-slate-950/90 shadow-[0_14px_30px_rgba(15,23,42,0.32)]",
        markSizeClasses[size],
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="Sentinel AI logo"
        fill
        priority={priority}
        sizes={size === "lg" ? "96px" : size === "md" ? "48px" : "40px"}
        className="object-cover"
        style={{ objectPosition: "center 62%", transform: "scale(1.12)" }}
      />
    </div>
  );
}

export function AppBrand({
  variant = "horizontal",
  size = "md",
  className,
  title = "Sentinel AI",
  subtitle = "AI-Powered Industrial Safety",
  showSubtitle = true,
  uppercaseTitle = false,
  center = false,
  priority = false
}: AppBrandProps) {
  return (
    <div
      className={cn(
        "flex",
        variant === "vertical" ? "flex-col" : "items-center",
        center ? "items-center text-center" : "items-start text-left",
        variant === "vertical" ? "gap-4" : "gap-3",
        className
      )}
    >
      <BrandMark size={size} priority={priority} />
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold tracking-tight text-foreground",
            titleSizeClasses[size],
            uppercaseTitle && "uppercase tracking-[0.18em]"
          )}
        >
          {title}
        </p>
        {showSubtitle ? (
          <p className={cn("mt-1 text-muted-foreground", subtitleSizeClasses[size])}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
