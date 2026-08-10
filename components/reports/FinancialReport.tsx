"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
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

type FinancialReportData = {
  range: { from: string; to: string };
  summary: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    refunds: number;
    discounts: number;
    tax: number;
    netProfit: number;
    purchaseSpend: number;
    marginPct: number;
  };
  chart: Array<{
    date: string;
    label: string;
    revenue: number;
    cogs: number;
    profit: number;
    refunds: number;
  }>;
  paymentBreakdown: Array<{ method: string; total: number }>;
  purchasesTable: Array<{
    id: string;
    poNumber: string;
    supplier: string;
    status: string;
    totalAmount: number;
    date: string;
  }>;
  returnsTable: Array<{
    id: string;
    returnNumber: string;
    totalRefund: number;
    date: string;
  }>;
  salesTable: Array<{
    id: string;
    saleNumber: string;
    status: string;
    paymentMethod: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    date: string;
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

async function fetchFinancialReport(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`/api/reports/financial?${params}`, {
    credentials: "include",
  });
  const body = (await res.json()) as ApiResponse<FinancialReportData>;
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Failed to load financial report");
  }
  return body.data;
}

export function FinancialReport() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports", "financial", from, to],
    queryFn: () => fetchFinancialReport(from, to),
  });

  const exportRows = useMemo(
    () =>
      (data?.salesTable ?? []).map((row) => ({
        saleNumber: row.saleNumber,
        date: formatDate(row.date),
        status: row.status,
        payment: row.paymentMethod,
        subtotal: row.subtotal,
        discount: row.discount,
        tax: row.tax,
        total: row.total,
      })),
    [data?.salesTable]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label htmlFor="fin-from">From</Label>
            <Input
              id="fin-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fin-to">To</Label>
            <Input
              id="fin-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <PDFExport
          title="Financial Report"
          subtitle={`${from} → ${to}`}
          columns={[
            { key: "saleNumber", header: "Sale #" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
            { key: "payment", header: "Payment" },
            { key: "subtotal", header: "Subtotal" },
            { key: "discount", header: "Discount" },
            { key: "tax", header: "Tax" },
            { key: "total", header: "Total" },
          ]}
          rows={exportRows}
          filename={`financial-report-${from}-${to}`}
        />
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load report"}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue", value: formatCurrency(data?.summary.revenue) },
          { label: "COGS", value: formatCurrency(data?.summary.cogs) },
          {
            label: "Gross profit",
            value: formatCurrency(data?.summary.grossProfit),
          },
          {
            label: "Net profit",
            value: formatCurrency(data?.summary.netProfit),
          },
          { label: "Refunds", value: formatCurrency(data?.summary.refunds) },
          {
            label: "Purchase spend",
            value: formatCurrency(data?.summary.purchaseSpend),
          },
          {
            label: "Discounts",
            value: formatCurrency(data?.summary.discounts),
          },
          {
            label: "Margin",
            value: `${formatNumber(data?.summary.marginPct)}%`,
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
          <CardTitle className="font-display text-xl">
            Profit & loss trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chart ?? []}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0f766e"
                    fill="url(#revFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#059669"
                    fill="url(#profitFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="cogs"
                    stroke="#f59e0b"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Payment mix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.paymentBreakdown ?? []).map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between text-sm"
              >
                <span>{row.method.replace("_", " ")}</span>
                <span className="font-medium">{formatCurrency(row.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Customer refunds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.returnsTable ?? []).slice(0, 8).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {row.returnNumber} · {formatDate(row.date)}
                </span>
                <span className="font-medium">
                  {formatCurrency(row.totalRefund)}
                </span>
              </div>
            ))}
            {(data?.returnsTable ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No refunds in range</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Sales ledger</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.salesTable ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.saleNumber}</TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.paymentMethod.replace("_", " ")}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.discount)}
                  </TableCell>
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
