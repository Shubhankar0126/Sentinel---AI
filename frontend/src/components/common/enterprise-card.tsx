import type { PropsWithChildren } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface EnterpriseCardProps extends PropsWithChildren {
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
}

export function EnterpriseCard({
  title,
  description,
  className,
  contentClassName,
  children
}: EnterpriseCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/20 hover:shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
        className
      )}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
