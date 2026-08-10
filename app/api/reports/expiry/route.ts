import { NextRequest } from "next/server";
import { startOfDay } from "date-fns";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getExpiryStatus } from "@/lib/utils/stock";

async function getSettingNumber(key: string, fallback: number) {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return fallback;
  const n = Number(setting.value);
  return Number.isFinite(n) ? n : fallback;
}

function daysUntil(expiryDate: Date, now = new Date()) {
  const start = startOfDay(now).getTime();
  const end = startOfDay(expiryDate).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") ?? "90");
    const warnDays = await getSettingNumber("expiry.warnDays", 30);
    const criticalDays = await getSettingNumber("expiry.criticalDays", 7);
    const windowDays = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 90;

    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + windowDays);

    const batches = await prisma.batch.findMany({
      where: {
        isActive: true,
        remainingQuantity: { gt: 0 },
        expiryDate: { lte: windowEnd },
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            unit: true,
          },
        },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: "asc" },
    });

    const statusCounts = {
      expired: 0,
      critical: 0,
      warning: 0,
      ok: 0,
    };

    let atRiskUnits = 0;
    let atRiskValue = 0;

    const table = batches.map((batch) => {
      const days = daysUntil(batch.expiryDate, now);
      let status: "expired" | "critical" | "warning" | "ok" = "ok";
      if (days < 0) status = "expired";
      else if (days <= criticalDays) status = "critical";
      else if (days <= warnDays) status = "warning";
      else status = getExpiryStatus(batch.expiryDate, now);

      statusCounts[status] += 1;
      if (status !== "ok") {
        atRiskUnits += batch.remainingQuantity;
        atRiskValue += batch.remainingQuantity * batch.unitCost;
      }

      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: batch.medicine.id,
        medicineName: batch.medicine.name,
        sku: batch.medicine.sku,
        category: batch.medicine.category,
        unit: batch.medicine.unit,
        supplierName: batch.supplier?.name ?? "—",
        remainingQuantity: batch.remainingQuantity,
        unitCost: batch.unitCost,
        value: Number((batch.remainingQuantity * batch.unitCost).toFixed(2)),
        expiryDate: batch.expiryDate.toISOString(),
        daysUntilExpiry: days,
        status,
      };
    });

    const monthBuckets = new Map<string, { month: string; units: number; value: number }>();
    for (const row of table) {
      if (row.status === "expired") continue;
      const month = row.expiryDate.slice(0, 7);
      const bucket = monthBuckets.get(month) ?? { month, units: 0, value: 0 };
      bucket.units += row.remainingQuantity;
      bucket.value += row.value;
      monthBuckets.set(month, bucket);
    }

    return apiSuccess({
      thresholds: { warnDays, criticalDays, windowDays },
      summary: {
        batchCount: table.length,
        expiredCount: statusCounts.expired,
        criticalCount: statusCounts.critical,
        warningCount: statusCounts.warning,
        atRiskUnits,
        atRiskValue: Number(atRiskValue.toFixed(2)),
      },
      statusChart: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      monthlyChart: Array.from(monthBuckets.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => ({
          ...row,
          value: Number(row.value.toFixed(2)),
        })),
      table,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/reports/expiry", error);
    return apiError("Failed to load expiry report", 500);
  }
}
