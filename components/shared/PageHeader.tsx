"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Kept for API compat — title lives in the topbar only */
  title?: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** Compact page toolbar: actions only (no repeated titles / breadcrumbs). */
export function PageHeader({
  actions,
  className,
  children,
}: PageHeaderProps) {
  if (!actions && !children) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
        className
      )}
    >
      {children ? (
        <div className="min-w-0 flex-1 sm:order-first">{children}</div>
      ) : null}
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto [&_button]:min-h-9 [&_button]:flex-1 sm:[&_button]:flex-none">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
