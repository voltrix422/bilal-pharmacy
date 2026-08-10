"use client";

import { useMemo } from "react";
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
import { formatCurrency, formatNumber } from "@/lib/utils/format";
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

type InventoryReportData = {
  summary: {
    medicineCount: number;
    totalUnits: number;
    inventoryValueCost: number;
    inventoryValueRetail: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  stockLevelChart: Array<{ level: string; count: number }>;
  byCategory: Array<{
    category: string;
    medicineCount: number;
    units: number;
    costValue: number;
  }>;
  adjustmentsChart: Array<{ type: string; quantity: number }>;
  table: Array<{
    medicineId: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    totalStock: number;
    minStockLevel: number;
    reorderPoint: number;
    stockLevel: string;
    costValue: number;
    retailValue: number;
    batchCount: number;
  }>;
};

const LEVEL_COLORS: Record<string, string> = {
  out: "#ef4444",
  critical: "#f97316",
  low: "#eab308",
  ok: "#0f766e",
  overstocked: "#64748b",
};

async function fetchInventoryReport() {
  const res = await fetch("/api/reports/inventory", { credentials: "include" });
  const body = (await res.json()) as ApiResponse<InventoryReportData>;
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Failed to load inventory report");
  }
  return body.data;
}

export function InventoryReport() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports", "inventory"],
    queryFn: fetchInventoryReport,
  });

  const exportRows = useMemo(
    () =>
      (data?.table ?? []).map((row) => ({
        name: row.name,
        sku: row.sku,
        category: row.category,
        stock: row.totalStock,
        level: row.stockLevel,
        cost: row.costValue,
        retail: row.retailValue,
        batches: row.batchCount,
      })),
    [data?.table]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PDFExport
          title="Inventory Report"
          subtitle="Current stock valuation"
          columns={[
            { key: "name", header: "Medicine" },
            { key: "sku", header: "SKU" },
            { key: "category", header: "Category" },
            { key: "stock", header: "Stock" },
            { key: "level", header: "Level" },
            { key: "cost", header: "Cost value" },
            { key: "retail", header: "Retail value" },
            { key: "batches", header: "Batches" },
          ]}
          rows={exportRows}
          filename="inventory-report"
        />
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load report"}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: "Active medicines",
            value: formatNumber(data?.summary.medicineCount),
          },
          {
            label: "Total units",
            value: formatNumber(data?.summary.totalUnits),
          },
          {
            label: "Cost value",
            value: formatCurrency(data?.summary.inventoryValueCost),
          },
          {
            label: "Retail value",
            value: formatCurrency(data?.summary.inventoryValueRetail),
          },
          {
            label: "Low stock",
            value: formatNumber(data?.summary.lowStockCount),
          },
          {
            label: "Out of stock",
            value: formatNumber(data?.summary.outOfStockCount),
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Stock levels</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.stockLevelChart ?? []}
                      dataKey="count"
                      nameKey="level"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {(data?.stockLevelChart ?? []).map((entry) => (
                        <Cell
                          key={entry.level}
                          fill={LEVEL_COLORS[entry.level] ?? "#94a3b8"}
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
          <CardHeader>
            <CardTitle className="font-display text-xl">Value by category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(data?.byCategory ?? []).slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Cost value",
                      ]}
                    />
                    <Bar dataKey="costValue" fill="#0f766e" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Inventory detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Retail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.table ?? []).slice(0, 100).map((row) => (
                <TableRow key={row.medicineId}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.totalStock}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {row.stockLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.costValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.retailValue)}
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
