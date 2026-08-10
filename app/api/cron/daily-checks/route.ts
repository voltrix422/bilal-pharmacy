import { NextRequest } from "next/server";
import { startOfDay } from "date-fns";
import {
  ApiError,
  apiError,
  apiSuccess,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStockLevel } from "@/lib/utils/stock";

function assertCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new ApiError("CRON_SECRET is not configured", 500);
  }

  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const querySecret = request.nextUrl.searchParams.get("secret");

  if (bearer !== secret && querySecret !== secret) {
    throw new ApiError("Unauthorized", 401);
  }
}

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

async function hasRecentNotification(
  type: "LOW_STOCK" | "EXPIRY_WARNING" | "EXPIRY_CRITICAL",
  relatedId: string,
  withinHours = 24
) {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      type,
      relatedId,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);

    const warnDays = await getSettingNumber("expiry.warnDays", 30);
    const criticalDays = await getSettingNumber("expiry.criticalDays", 7);
    const lowThreshold = await getSettingNumber("stock.lowThreshold", 10);

    const now = new Date();
    const warnEnd = new Date(now);
    warnEnd.setDate(warnEnd.getDate() + warnDays);

    const created: Array<{ type: string; relatedId: string }> = [];

    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        minStockLevel: true,
        reorderPoint: true,
        batches: {
          where: { isActive: true },
          select: { remainingQuantity: true },
        },
      },
    });

    for (const medicine of medicines) {
      const totalStock = medicine.batches.reduce(
        (sum, b) => sum + b.remainingQuantity,
        0
      );
      const threshold = Math.max(medicine.minStockLevel, lowThreshold);
      const level = getStockLevel(
        totalStock,
        threshold,
        Math.max(medicine.reorderPoint, threshold)
      );

      if (level !== "out" && level !== "critical" && level !== "low") continue;

      const already = await hasRecentNotification("LOW_STOCK", medicine.id, 24);
      if (already) continue;

      await prisma.notification.create({
        data: {
          userId: null,
          type: "LOW_STOCK",
          title: totalStock <= 0 ? "Out of stock" : "Low stock alert",
          message: `${medicine.name} (${medicine.sku}) has ${totalStock} unit(s) remaining (threshold ${threshold}).`,
          priority: totalStock <= 0 ? "CRITICAL" : level === "critical" ? "HIGH" : "MEDIUM",
          relatedId: medicine.id,
          relatedType: "Medicine",
        },
      });
      created.push({ type: "LOW_STOCK", relatedId: medicine.id });
    }

    const batches = await prisma.batch.findMany({
      where: {
        isActive: true,
        remainingQuantity: { gt: 0 },
        expiryDate: { lte: warnEnd },
      },
      include: {
        medicine: { select: { id: true, name: true, sku: true } },
      },
    });

    for (const batch of batches) {
      const days = daysUntil(batch.expiryDate, now);
      let type: "EXPIRY_CRITICAL" | "EXPIRY_WARNING" | null = null;
      let priority: "CRITICAL" | "HIGH" | "MEDIUM" = "MEDIUM";

      if (days < 0 || days <= criticalDays) {
        type = "EXPIRY_CRITICAL";
        priority = "CRITICAL";
      } else if (days <= warnDays) {
        type = "EXPIRY_WARNING";
        priority = "HIGH";
      }

      if (!type) continue;

      const already = await hasRecentNotification(type, batch.id, 24);
      if (already) continue;

      const when =
        days < 0
          ? `expired ${Math.abs(days)} day(s) ago`
          : `expires in ${days} day(s)`;

      await prisma.notification.create({
        data: {
          userId: null,
          type,
          title:
            type === "EXPIRY_CRITICAL"
              ? "Critical expiry alert"
              : "Expiry warning",
          message: `${batch.medicine.name} batch ${batch.batchNumber} ${when}. Qty: ${batch.remainingQuantity}.`,
          priority,
          relatedId: batch.id,
          relatedType: "Batch",
        },
      });
      created.push({ type, relatedId: batch.id });
    }

    return apiSuccess({
      ok: true,
      thresholds: { warnDays, criticalDays, lowThreshold },
      createdCount: created.length,
      created,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/cron/daily-checks", error);
    return apiError("Daily checks failed", 500);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
