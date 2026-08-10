export type StockLevel = "out" | "critical" | "low" | "ok" | "overstocked";

export type ExpiryStatus = "expired" | "critical" | "warning" | "ok";

export interface StockAwareItem {
  remainingQuantity?: number | null;
  quantity?: number | null;
  minStockLevel?: number | null;
  reorderPoint?: number | null;
}

export interface BatchLike {
  id: string;
  batchNumber: string;
  remainingQuantity: number;
  expiryDate: Date | string;
  unitCost?: number;
  sellingPrice?: number;
  isActive?: boolean;
}

export function getStockLevel(
  currentStock: number,
  minStockLevel = 10,
  reorderPoint = 20
): StockLevel {
  if (currentStock <= 0) return "out";
  if (currentStock <= minStockLevel) return "critical";
  if (currentStock <= reorderPoint) return "low";
  if (currentStock > reorderPoint * 5) return "overstocked";
  return "ok";
}

export function getExpiryStatus(
  expiryDate: Date | string,
  now: Date = new Date()
): ExpiryStatus {
  const expiry =
    typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const expiryDay = new Date(expiry);
  expiryDay.setHours(0, 0, 0, 0);

  const diffMs = expiryDay.getTime() - startOfToday.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry < 7) return "critical";
  if (daysUntilExpiry < 30) return "warning";
  return "ok";
}

export function calculateFEFOBatches<T extends BatchLike>(
  batches: T[],
  requestedQuantity: number
): Array<T & { allocateQuantity: number }> {
  if (requestedQuantity <= 0) return [];

  const eligible = batches
    .filter(
      (batch) =>
        batch.remainingQuantity > 0 &&
        batch.isActive !== false &&
        getExpiryStatus(batch.expiryDate) !== "expired"
    )
    .sort((a, b) => {
      const aTime = new Date(a.expiryDate).getTime();
      const bTime = new Date(b.expiryDate).getTime();
      return aTime - bTime;
    });

  let remaining = requestedQuantity;
  const allocations: Array<T & { allocateQuantity: number }> = [];

  for (const batch of eligible) {
    if (remaining <= 0) break;
    const allocateQuantity = Math.min(batch.remainingQuantity, remaining);
    allocations.push({ ...batch, allocateQuantity });
    remaining -= allocateQuantity;
  }

  return allocations;
}

export function isLowStock(item: StockAwareItem): boolean {
  const stock =
    item.remainingQuantity ??
    item.quantity ??
    0;
  const reorderPoint = item.reorderPoint ?? 20;
  const minStockLevel = item.minStockLevel ?? 10;
  const level = getStockLevel(stock, minStockLevel, reorderPoint);
  return level === "out" || level === "critical" || level === "low";
}
