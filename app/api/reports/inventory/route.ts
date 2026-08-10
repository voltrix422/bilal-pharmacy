import { NextRequest } from "next/server";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStockLevel } from "@/lib/utils/stock";

export async function GET(_request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);

    const [medicines, categoryGroups, adjustments] = await Promise.all([
      prisma.medicine.findMany({
        where: { isActive: true },
        include: {
          batches: {
            where: { isActive: true },
            select: {
              id: true,
              remainingQuantity: true,
              unitCost: true,
              sellingPrice: true,
              expiryDate: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.medicine.groupBy({
        by: ["category"],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.stockAdjustment.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { type: true, quantityChange: true },
      }),
    ]);

    let totalUnits = 0;
    let inventoryValueCost = 0;
    let inventoryValueRetail = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const stockLevelChart = {
      out: 0,
      critical: 0,
      low: 0,
      ok: 0,
      overstocked: 0,
    };

    const table = medicines.map((medicine) => {
      const totalStock = medicine.batches.reduce(
        (sum, b) => sum + b.remainingQuantity,
        0
      );
      const costValue = medicine.batches.reduce(
        (sum, b) => sum + b.remainingQuantity * b.unitCost,
        0
      );
      const retailValue = medicine.batches.reduce(
        (sum, b) => sum + b.remainingQuantity * b.sellingPrice,
        0
      );
      const level = getStockLevel(
        totalStock,
        medicine.minStockLevel,
        medicine.reorderPoint
      );

      totalUnits += totalStock;
      inventoryValueCost += costValue;
      inventoryValueRetail += retailValue;
      stockLevelChart[level] += 1;
      if (level === "out") outOfStockCount += 1;
      if (level === "out" || level === "critical" || level === "low") {
        lowStockCount += 1;
      }

      return {
        medicineId: medicine.id,
        name: medicine.name,
        sku: medicine.sku,
        category: medicine.category,
        unit: medicine.unit,
        totalStock,
        minStockLevel: medicine.minStockLevel,
        reorderPoint: medicine.reorderPoint,
        stockLevel: level,
        costValue: Number(costValue.toFixed(2)),
        retailValue: Number(retailValue.toFixed(2)),
        batchCount: medicine.batches.length,
      };
    });

    const adjustmentByType = new Map<string, number>();
    for (const adj of adjustments) {
      adjustmentByType.set(
        adj.type,
        (adjustmentByType.get(adj.type) ?? 0) + Math.abs(adj.quantityChange)
      );
    }

    const byCategory = categoryGroups
      .map((group) => {
        const rows = table.filter((row) => row.category === group.category);
        return {
          category: group.category,
          medicineCount: group._count._all,
          units: rows.reduce((sum, r) => sum + r.totalStock, 0),
          costValue: Number(
            rows.reduce((sum, r) => sum + r.costValue, 0).toFixed(2)
          ),
        };
      })
      .sort((a, b) => b.costValue - a.costValue);

    return apiSuccess({
      summary: {
        medicineCount: medicines.length,
        totalUnits,
        inventoryValueCost: Number(inventoryValueCost.toFixed(2)),
        inventoryValueRetail: Number(inventoryValueRetail.toFixed(2)),
        lowStockCount,
        outOfStockCount,
      },
      stockLevelChart: Object.entries(stockLevelChart).map(([level, count]) => ({
        level,
        count,
      })),
      byCategory,
      adjustmentsChart: Array.from(adjustmentByType.entries()).map(
        ([type, quantity]) => ({ type, quantity })
      ),
      table: table.sort((a, b) => {
        const rank = { out: 0, critical: 1, low: 2, ok: 3, overstocked: 4 };
        return (
          (rank[a.stockLevel as keyof typeof rank] ?? 9) -
            (rank[b.stockLevel as keyof typeof rank] ?? 9) ||
          a.name.localeCompare(b.name)
        );
      }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/reports/inventory", error);
    return apiError("Failed to load inventory report", 500);
  }
}
