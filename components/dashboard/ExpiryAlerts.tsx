"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { DashboardExpiryAlert } from "@/types";

interface ExpiryAlertsProps {
  alerts?: DashboardExpiryAlert[];
  isLoading?: boolean;
}

const STATUS_STYLES: Record<
  DashboardExpiryAlert["status"],
  { label: string; className: string; row: string }
> = {
  expired: {
    label: "Expired",
    className: "border-stroke bg-transparent text-foreground",
    row: "",
  },
  critical: {
    label: "Critical",
    className: "border-stroke bg-transparent text-foreground",
    row: "",
  },
  warning: {
    label: "Warning",
    className: "border-border bg-transparent text-muted-foreground",
    row: "",
  },
  ok: {
    label: "OK",
    className: "border-border bg-transparent text-muted-foreground",
    row: "",
  },
};

export function ExpiryAlerts({ alerts = [], isLoading }: ExpiryAlertsProps) {
  return (
    <Card className="animate-fade-in border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base sm:font-display sm:text-xl">
            Expiry Alerts
          </CardTitle>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Within 30 days
          </p>
        </div>
        <Link
          href="/inventory/batches?expiryStatus=warning"
          className="shrink-0 text-xs font-medium text-[#1d9851] sm:text-sm sm:text-foreground sm:hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No expiry risk"
            description="No batches are approaching expiry in the next 30 days."
            className="py-8"
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const style = STATUS_STYLES[alert.status];
                  return (
                    <TableRow
                      key={alert.batchId}
                      className={cn(style.row)}
                    >
                      <TableCell>
                        <Link
                          href={`/medicines/${alert.medicineId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {alert.medicineName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {alert.batchNumber}
                      </TableCell>
                      <TableCell>{formatNumber(alert.remainingQuantity)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>{formatDate(alert.expiryDate)}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.daysUntilExpiry < 0
                              ? `${Math.abs(alert.daysUntilExpiry)}d overdue`
                              : `${alert.daysUntilExpiry}d left`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border-0", style.className)}>
                          {style.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
