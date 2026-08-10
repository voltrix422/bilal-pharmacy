"use client";

import { Badge } from "@/components/ui/badge";
import { getStockLevel, type StockLevel } from "@/lib/utils/stock";
import { cn } from "@/lib/utils";

const LABELS: Record<StockLevel, string> = {
  out: "Out of stock",
  critical: "Critical",
  low: "Low",
  ok: "In stock",
  overstocked: "Overstocked",
};

interface StockBadgeProps {
  quantity: number;
  minStockLevel?: number;
  reorderPoint?: number;
  level?: StockLevel;
  showQuantity?: boolean;
  className?: string;
}

export function StockBadge({
  quantity,
  minStockLevel = 10,
  reorderPoint = 20,
  level,
  showQuantity = true,
  className,
}: StockBadgeProps) {
  const stockLevel =
    level ?? getStockLevel(quantity, minStockLevel, reorderPoint);

  return (
    <Badge
      variant={stockLevel === "ok" || stockLevel === "overstocked" ? "outline" : "default"}
      className={cn(className)}
    >
      {showQuantity ? `${quantity} · ` : null}
      {LABELS[stockLevel]}
    </Badge>
  );
}
