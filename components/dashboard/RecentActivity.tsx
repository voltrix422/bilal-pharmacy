"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { DashboardRecentSale } from "@/types";

interface RecentActivityProps {
  sales?: DashboardRecentSale[];
  isLoading?: boolean;
}

export function RecentActivity({ sales = [], isLoading }: RecentActivityProps) {
  return (
    <Card className="animate-fade-in h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Latest sales
          </p>
        </div>
        <Link
          href="/sales"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No recent sales"
            description="Completed sales will show up here."
            className="py-6"
          />
        ) : (
          <ul className="divide-y divide-border">
            {sales.map((sale) => (
              <li
                key={sale.id}
                className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-medium">{sale.saleNumber}</p>
                    <Badge variant="outline" className="h-4 px-1 text-[9px]">
                      {sale.status}
                    </Badge>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {sale.customerName || "Walk-in"} · {sale.itemCount} item
                    {sale.itemCount === 1 ? "" : "s"} ·{" "}
                    {formatDateTime(sale.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-semibold tabular-nums">
                  {formatCurrency(sale.total)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
