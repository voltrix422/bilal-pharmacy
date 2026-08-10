"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ApiResponse } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { PDFExport } from "@/components/reports/PDFExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SalesReportData = {
  range: { from: string; to: string };
  summary: {
    grossRevenue: number;
    netRevenue: number;
    completedCount: number;
    refundedCount: number;
    refundTotal: number;
    averageTicket: number;
  };
  chart: Array<{
    date: string;
    label: string;
    revenue: number;
    sales: number;
    refunds: number;
  }>;
  byPaymentMethod: Array<{ method: string; count: number; total: number }>;
  byCashier: Array<{ cashierId: string; name: string; count: number; total: number }>;
  topMedicines: Array<{
    medicineId: string;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
  }>;
  table: Array<{
    id: string;
    saleNumber: string;
    date: string;
    cashier: string;
    paymentMethod: string;
    status: string;
    total: number;
    itemCount: number;
  }>;
};

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchSalesReport(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`/api/reports/sales?${params}`, {
    credentials: "include",
  });
  const body = (await res.json()) as ApiResponse<SalesReportData>;
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Failed to load sales report");
  }
  return body.data;
}

export function SalesReport() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports", "sales", from, to],
    queryFn: () => fetchSalesReport(from, to),
  });

  const exportRows = useMemo(
    () =>
      (data?.table ?? []).map((row) => ({
        saleNumber: row.saleNumber,
        date: formatDate(row.date),
        cashier: row.cashier,
        payment: row.paymentMethod,
        status: row.status,
        items: row.itemCount,
        total: row.total,
      })),
    [data?.table]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <PDFExport
          title="Sales Report"
          subtitle={`${from} → ${to}`}
          columns={[
            { key: "saleNumber", header: "Sale #" },
            { key: "date", header: "Date" },
            { key: "cashier", header: "Cashier" },
            { key: "payment", header: "Payment" },
            { key: "status", header: "Status" },
            { key: "items", header: "Items" },
            { key: "total", header: "Total" },
          ]}
          rows={exportRows}
          filename={`sales-report-${from}-${to}`}
        />
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load report"}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Gross revenue",
            value: formatCurrency(data?.summary.grossRevenue),
          },
          {
            label: "Net revenue",
            value: formatCurrency(data?.summary.netRevenue),
          },
          {
            label: "Completed sales",
            value: formatNumber(data?.summary.completedCount),
          },
          {
            label: "Avg ticket",
            value: formatCurrency(data?.summary.averageTicket),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <p className="font-display text-2xl">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "sales"
                        ? [formatNumber(value), "Sales"]
                        : [formatCurrency(value), name === "refunds" ? "Refunds" : "Revenue"]
                    }
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#0f766e" name="revenue" radius={4} />
                  <Bar dataKey="refunds" fill="#f59e0b" name="refunds" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">By payment method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.byPaymentMethod ?? []).map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between text-sm"
              >
                <span>{row.method.replace("_", " ")}</span>
                <span className="font-medium">
                  {formatCurrency(row.total)} · {row.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Top medicines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topMedicines ?? []).slice(0, 8).map((row) => (
              <div
                key={row.medicineId}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate pr-2">{row.name}</span>
                <span className="shrink-0 font-medium">
                  {formatCurrency(row.revenue)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Sales detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.table ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.saleNumber}</TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.cashier}</TableCell>
                  <TableCell>{row.paymentMethod.replace("_", " ")}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
