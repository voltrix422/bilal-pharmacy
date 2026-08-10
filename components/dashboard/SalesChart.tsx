"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { DashboardSalesPoint } from "@/types";

interface SalesChartProps {
  days7?: DashboardSalesPoint[];
  days30?: DashboardSalesPoint[];
  isLoading?: boolean;
}

export function SalesChart({ days7 = [], days30 = [], isLoading }: SalesChartProps) {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const data = useMemo(
    () => (range === "7d" ? days7 : days30),
    [range, days7, days30]
  );

  return (
    <Card className="animate-fade-in h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1">
        <div>
          <CardTitle>Sales Overview</CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Revenue trend
          </p>
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          {(["7d", "30d"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-6 px-2 text-[11px]",
                range === value &&
                  "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
              )}
              onClick={() => setRange(value)}
            >
              {value === "7d" ? "7d" : "30d"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <Skeleton className="h-[180px] w-full sm:h-[220px]" />
        ) : (
          <div className="h-[180px] w-full sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d9851" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1d9851" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: 11,
                    boxShadow: "none",
                  }}
                  formatter={(value: number, name: string) =>
                    name === "revenue"
                      ? [formatCurrency(value), "Revenue"]
                      : [formatNumber(value), "Sales"]
                  }
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1d9851"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  name="revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
