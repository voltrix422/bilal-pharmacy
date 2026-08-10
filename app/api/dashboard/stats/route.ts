import { NextRequest } from "next/server";
import { format, startOfDay, subDays } from "date-fns";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getExpiryStatus, getStockLevel } from "@/lib/utils/stock";
import type { DashboardStats } from "@/types";

function daysUntil(expiryDate: Date, now = new Date()): number {
  const start = startOfDay(now).getTime();
  const end = startOfDay(expiryDate).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function buildSalesSeries(
  sales: Array<{ createdAt: Date; total: number }>,
  days: number
) {
  const today = startOfDay(new Date());
  const map = new Map<string, { revenue: number; sales: number }>();

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const key = format(date, "yyyy-MM-dd");
    map.set(key, { revenue: 0, sales: 0 });
  }

  for (const sale of sales) {
    const key = format(startOfDay(sale.createdAt), "yyyy-MM-dd");
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.revenue += sale.total;
    bucket.sales += 1;
  }

  return Array.from(map.entries()).map(([date, value]) => ({
    date,
    label: format(new Date(`${date}T00:00:00`), days <= 7 ? "EEE" : "dd MMM"),
    revenue: Number(value.revenue.toFixed(2)),
    sales: value.sales,
  }));
}

export async function GET(_request: NextRequest) {
  try {
    await requireAuth();

    const now = new Date();
    const todayStart = startOfDay(now);
    const days30Start = subDays(todayStart, 29);
    const expiryWindowEnd = new Date(now);
    expiryWindowEnd.setDate(expiryWindowEnd.getDate() + 30);

    const [
      todaySalesAgg,
      totalSalesAllTime,
      pendingPrescriptions,
      activeCustomers,
      recentSalesRaw,
      paymentGroups,
      topMedicineGroups,
      chartSales,
      medicines,
      expiryBatches,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: todayStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.sale.count({
        where: { status: "COMPLETED" },
      }),
      prisma.prescription.count({
        where: { status: "PENDING" },
      }),
      prisma.customer.count(),
      prisma.sale.findMany({
        where: { status: { in: ["COMPLETED", "PENDING", "REFUNDED"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          cashier: { select: { name: true } },
          customer: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: days30Start },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.saleItem.groupBy({
        by: ["medicineId"],
        where: {
          sale: {
            status: "COMPLETED",
            createdAt: { gte: days30Start },
          },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      prisma.sale.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: days30Start },
        },
        select: { createdAt: true, total: true },
      }),
      prisma.medicine.findMany({
        where: { isActive: true },
        select: {
          id: true,
          minStockLevel: true,
          reorderPoint: true,
          batches: {
            where: { isActive: true },
            select: { remainingQuantity: true },
          },
        },
      }),
      prisma.batch.findMany({
        where: {
          isActive: true,
          remainingQuantity: { gt: 0 },
          expiryDate: { lte: expiryWindowEnd },
        },
        orderBy: { expiryDate: "asc" },
        take: 20,
        include: {
          medicine: { select: { id: true, name: true } },
        },
      }),
    ]);

    const lowStockCount = medicines.filter((medicine) => {
      const totalStock = medicine.batches.reduce(
        (sum, batch) => sum + batch.remainingQuantity,
        0
      );
      const level = getStockLevel(
        totalStock,
        medicine.minStockLevel,
        medicine.reorderPoint
      );
      return level === "out" || level === "critical" || level === "low";
    }).length;

    const medicineIds = topMedicineGroups.map((item) => item.medicineId);
    const medicineNames = medicineIds.length
      ? await prisma.medicine.findMany({
          where: { id: { in: medicineIds } },
          select: { id: true, name: true },
        })
      : [];
    const medicineNameMap = new Map(
      medicineNames.map((item) => [item.id, item.name])
    );

    const expiryAlerts = expiryBatches.map((batch) => {
      const status = getExpiryStatus(batch.expiryDate, now);
      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: batch.medicine.id,
        medicineName: batch.medicine.name,
        remainingQuantity: batch.remainingQuantity,
        expiryDate: batch.expiryDate.toISOString(),
        status,
        daysUntilExpiry: daysUntil(batch.expiryDate, now),
      };
    });

    const payload: DashboardStats = {
      todayRevenue: Number((todaySalesAgg._sum.total ?? 0).toFixed(2)),
      totalSalesToday: todaySalesAgg._count._all,
      totalSalesAllTime,
      lowStockCount,
      expiringSoonCount: expiryAlerts.filter((item) => item.status !== "ok")
        .length,
      pendingPrescriptions,
      activeCustomers,
      salesChart: {
        days7: buildSalesSeries(chartSales, 7),
        days30: buildSalesSeries(chartSales, 30),
      },
      topMedicines: topMedicineGroups.map((item) => ({
        medicineId: item.medicineId,
        name: medicineNameMap.get(item.medicineId) ?? "Unknown medicine",
        quantity: item._sum.quantity ?? 0,
        revenue: Number((item._sum.total ?? 0).toFixed(2)),
      })),
      expiryAlerts,
      recentSales: recentSalesRaw.map((sale) => ({
        id: sale.id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
        cashierName: sale.cashier?.name ?? null,
        customerName: sale.customer?.name ?? null,
        itemCount: sale._count.items,
      })),
      paymentMethods: paymentGroups.map((group) => ({
        method: group.paymentMethod,
        count: group._count._all,
        total: Number((group._sum.total ?? 0).toFixed(2)),
      })),
    };

    return apiSuccess(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/dashboard/stats", error);
    return apiError("Failed to load dashboard stats", 500);
  }
}
