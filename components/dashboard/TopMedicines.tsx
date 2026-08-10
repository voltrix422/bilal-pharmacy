"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatNumber } from "@/lib/utils/format";
import type { DashboardTopMedicine } from "@/types";

interface TopMedicinesProps {
  data?: DashboardTopMedicine[];
  isLoading?: boolean;
}

export function TopMedicines({ data = [], isLoading }: TopMedicinesProps) {
  const chartData = data.map((item) => ({
    ...item,
    shortName:
      item.name.length > 14 ? `${item.name.slice(0, 14)}…` : item.name,
  }));

  return (
    <Card className="animate-fade-in h-full">
      <CardHeader className="pb-1">
        <CardTitle>Top Medicines</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Best sellers by qty (30d)
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full sm:h-[220px]" />
        ) : chartData.length === 0 ? (
          <EmptyState
            title="No sales yet"
            description="Top medicines will appear once sales are recorded."
            className="py-8"
          />
        ) : (
          <div className="h-[180px] w-full sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 2, right: 8, left: 0, bottom: 2 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={96}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: 11,
                    boxShadow: "none",
                  }}
                  formatter={(value: number) => [
                    formatNumber(value),
                    "Qty sold",
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar
                  dataKey="quantity"
                  fill="#1d9851"
                  radius={[0, 4, 4, 0]}
                  name="Qty sold"
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
