"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import type { DashboardPaymentMethodStat } from "@/types";

interface PaymentMethodChartProps {
  data?: DashboardPaymentMethodStat[];
  isLoading?: boolean;
}

const COLORS = ["#1d9851", "#d4322a", "#f59e0b", "#3b82f6"];

const LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  INSURANCE: "Insurance",
  MOBILE_PAYMENT: "Mobile",
};

export function PaymentMethodChart({
  data = [],
  isLoading,
}: PaymentMethodChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: LABELS[item.method] ?? item.method,
  }));

  return (
    <Card className="animate-fade-in h-full">
      <CardHeader className="pb-1">
        <CardTitle>Payment Methods</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Last 30 days</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="mx-auto h-[180px] w-[180px] rounded-full" />
        ) : chartData.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Payment mix appears after completed sales."
            className="py-6"
          />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="mx-auto h-[160px] w-full max-w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.method}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 11,
                      boxShadow: "none",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Revenue",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1">
              {chartData.map((item, index) => (
                <li
                  key={item.method}
                  className="flex items-center gap-1.5 text-[11px]"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">
                    {item.name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(item.count)} · {formatCurrency(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
