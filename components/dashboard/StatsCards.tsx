"use client";

import {
  AlertTriangle,
  Clock3,
  FileText,
  PackageMinus,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import type { DashboardStats } from "@/types";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

type StatItem = {
  key: string;
  label: string;
  shortLabel: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "warn" | "danger";
};

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border">
            <CardContent className="space-y-2 p-3 sm:p-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items: StatItem[] = [
    {
      key: "revenue",
      label: "Today's Revenue",
      shortLabel: "Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: ShoppingBag,
    },
    {
      key: "sales",
      label: "Total Sales",
      shortLabel: "Sales",
      value: formatNumber(stats.totalSalesToday),
      icon: ShoppingBag,
    },
    {
      key: "lowStock",
      label: "Low Stock",
      shortLabel: "Low stock",
      value: formatNumber(stats.lowStockCount),
      icon: PackageMinus,
      tone: stats.lowStockCount > 0 ? "warn" : "default",
    },
    {
      key: "expiring",
      label: "Expiring Soon",
      shortLabel: "Expiring",
      value: formatNumber(stats.expiringSoonCount),
      icon: AlertTriangle,
      tone: stats.expiringSoonCount > 0 ? "danger" : "default",
    },
    {
      key: "rx",
      label: "Pending Prescriptions",
      shortLabel: "Rx pending",
      value: formatNumber(stats.pendingPrescriptions),
      icon: FileText,
    },
    {
      key: "customers",
      label: "Active Customers",
      shortLabel: "Customers",
      value: formatNumber(stats.activeCustomers),
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.key}
            className={cn(
              "border-border bg-card active:scale-[0.99] transition-transform",
              item.tone === "warn" && "border-amber-500/30",
              item.tone === "danger" && "border-[#d4322a]/30"
            )}
          >
            <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-2.5">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] text-muted-foreground sm:hidden">
                  {item.shortLabel}
                </p>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  {item.label}
                </p>
                <p className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-base">
                  {item.value}
                </p>
                {item.key === "sales" ? (
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 className="h-2.5 w-2.5" strokeWidth={1.5} />
                    {formatNumber(stats.totalSalesAllTime)} all-time
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stroke bg-muted/40 text-foreground sm:h-8 sm:w-8 sm:rounded-md sm:bg-transparent",
                  item.tone === "warn" && "text-amber-600",
                  item.tone === "danger" && "text-[#d4322a]"
                )}
              >
                <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={1.5} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
