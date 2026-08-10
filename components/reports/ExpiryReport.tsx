"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ApiResponse } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { FilterPanel } from "@/components/shared/FilterPanel";
import { PDFExport } from "@/components/reports/PDFExport";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExpiryReportData = {
  thresholds: { warnDays: number; criticalDays: number; windowDays: number };
  summary: {
    batchCount: number;
    expiredCount: number;
    criticalCount: number;
    warningCount: number;
    atRiskUnits: number;
    atRiskValue: number;
  };
  statusChart: Array<{ status: string; count: number }>;
  monthlyChart: Array<{ month: string; units: number; value: number }>;
  table: Array<{
    batchId: string;
    batchNumber: string;
    medicineName: string;
    sku: string;
    category: string;
    supplierName: string;
    remainingQuantity: number;
    value: number;
    expiryDate: string;
    daysUntilExpiry: number;
    status: string;
  }>;
};

const STATUS_COLORS: Record<string, string> = {
  expired: "#d4322a",
  critical: "#f59e0b",
  warning: "#eab308",
  ok: "#1d9851",
};

const STATUS_BADGE: Record<
  string,
  "destructive" | "warning" | "secondary" | "success" | "outline"
> = {
  expired: "destructive",
  critical: "warning",
  warning: "secondary",
  ok: "success",
};

async function fetchExpiryReport(days: string, status: string) {
  const params = new URLSearchParams({ days: days || "90" });
  if (status) params.set("status", status);
  const res = await fetch(`/api/reports/expiry?${params}`, {
    credentials: "include",
  });
  const body = (await res.json()) as ApiResponse<ExpiryReportData>;
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Failed to load expiry report");
  }
  return body.data;
}

export function ExpiryReport() {
  const [filters, setFilters] = useState<Record<string, string>>({
    days: "",
    status: "",
  });

  const windowDays = filters.days || "90";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports", "expiry", windowDays, filters.status],
    queryFn: () => fetchExpiryReport(windowDays, filters.status),
  });

  const tableRows = useMemo(() => {
    const rows = data?.table ?? [];
    if (!filters.status) return rows;
    return rows.filter((row) => row.status === filters.status);
  }, [data?.table, filters.status]);

  const exportRows = useMemo(
    () =>
      tableRows.map((row) => ({
        medicine: row.medicineName,
        batch: row.batchNumber,
        sku: row.sku,
        supplier: row.supplierName,
        qty: row.remainingQuantity,
        value: row.value,
        expiry: formatDate(row.expiryDate),
        days: row.daysUntilExpiry,
        status: row.status,
      })),
    [tableRows]
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPanel
            values={filters}
            onChange={setFilters}
            fields={[
              {
                id: "days",
                label: "Date window",
                options: [
                  { label: "Next 30 days", value: "30" },
                  { label: "Next 60 days", value: "60" },
                  { label: "Next 90 days", value: "90" },
                  { label: "Next 180 days", value: "180" },
                ],
              },
              {
                id: "status",
                label: "Status",
                options: [
                  { label: "Expired", value: "expired" },
                  { label: "Critical", value: "critical" },
                  { label: "Warning", value: "warning" },
                  { label: "OK", value: "ok" },
                ],
              },
            ]}
          />
          <p className="text-[11px] text-muted-foreground">
            Critical ≤ {data?.thresholds.criticalDays ?? 7}d · Warning ≤{" "}
            {data?.thresholds.warnDays ?? 30}d
          </p>
        </div>
        <PDFExport
          title="Expiry Report"
          subtitle="Batches nearing expiry"
          columns={[
            { key: "medicine", header: "Medicine" },
            { key: "batch", header: "Batch" },
            { key: "sku", header: "SKU" },
            { key: "supplier", header: "Supplier" },
            { key: "qty", header: "Qty" },
            { key: "value", header: "Value" },
            { key: "expiry", header: "Expiry" },
            { key: "days", header: "Days" },
            { key: "status", header: "Status" },
          ]}
          rows={exportRows}
          filename="expiry-report"
        />
      </div>

      {isError ? (
        <p className="text-xs text-destructive">
          {error instanceof Error ? error.message : "Failed to load report"}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Batches in window", value: formatNumber(data?.summary.batchCount) },
          { label: "Expired", value: formatNumber(data?.summary.expiredCount) },
          { label: "Critical", value: formatNumber(data?.summary.criticalCount) },
          { label: "Warning", value: formatNumber(data?.summary.warningCount) },
          { label: "At-risk units", value: formatNumber(data?.summary.atRiskUnits) },
          {
            label: "At-risk value",
            value: formatCurrency(data?.summary.atRiskValue),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Status mix</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.statusChart ?? []}
                      dataKey="count"
                      nameKey="status"
                      outerRadius={70}
                    >
                      {(data?.statusChart ?? []).map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Expiring by month</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.monthlyChart ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "value"
                          ? [formatCurrency(value), "Value"]
                          : [formatNumber(value), "Units"]
                      }
                    />
                    <Bar dataKey="units" fill="#1d9851" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Batch expiry detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-xs text-muted-foreground"
                  >
                    No batches in this window
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row) => (
                  <TableRow key={row.batchId}>
                    <TableCell className="font-medium">{row.medicineName}</TableCell>
                    <TableCell>{row.batchNumber}</TableCell>
                    <TableCell>{row.supplierName}</TableCell>
                    <TableCell>{row.remainingQuantity}</TableCell>
                    <TableCell>{formatDate(row.expiryDate)}</TableCell>
                    <TableCell>{row.daysUntilExpiry}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[row.status] ?? "outline"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.value)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
