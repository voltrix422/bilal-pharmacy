import { NextRequest } from "next/server";
import { format, startOfDay, subDays } from "date-fns";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

function parseRange(searchParams: URLSearchParams) {
  const fromRaw = searchParams.get("from") || searchParams.get("dateFrom");
  const toRaw = searchParams.get("to") || searchParams.get("dateTo");
  const now = new Date();
  const to = toRaw ? new Date(toRaw) : now;
  const from = fromRaw ? new Date(fromRaw) : subDays(startOfDay(now), 29);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ApiError("Invalid date range", 400);
  }

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);

    const { searchParams } = new URL(request.url);
    const { from, to } = parseRange(searchParams);

    const sales = await prisma.sale.findMany({
      where: {
        status: { in: ["COMPLETED", "REFUNDED"] },
        createdAt: { gte: from, lte: to },
        isHeld: false,
      },
      include: {
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<
      string,
      { date: string; label: string; revenue: number; sales: number; refunds: number }
    >();

    let cursor = startOfDay(from);
    const end = startOfDay(to);
    while (cursor <= end) {
      const key = format(cursor, "yyyy-MM-dd");
      dailyMap.set(key, {
        date: key,
        label: format(cursor, "dd MMM"),
        revenue: 0,
        sales: 0,
        refunds: 0,
      });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }

    const paymentMap = new Map<string, { method: string; count: number; total: number }>();
    const cashierMap = new Map<string, { cashierId: string; name: string; count: number; total: number }>();
    const medicineMap = new Map<
      string,
      { medicineId: string; name: string; category: string; quantity: number; revenue: number }
    >();

    let grossRevenue = 0;
    let completedCount = 0;
    let refundedCount = 0;
    let refundTotal = 0;

    for (const sale of sales) {
      const key = format(startOfDay(sale.createdAt), "yyyy-MM-dd");
      const bucket = dailyMap.get(key);
      if (bucket) {
        if (sale.status === "COMPLETED") {
          bucket.revenue += sale.total;
          bucket.sales += 1;
        } else if (sale.status === "REFUNDED") {
          bucket.refunds += sale.total;
        }
      }

      if (sale.status === "COMPLETED") {
        grossRevenue += sale.total;
        completedCount += 1;

        const pm = paymentMap.get(sale.paymentMethod) ?? {
          method: sale.paymentMethod,
          count: 0,
          total: 0,
        };
        pm.count += 1;
        pm.total += sale.total;
        paymentMap.set(sale.paymentMethod, pm);

        const cashier = cashierMap.get(sale.cashierId) ?? {
          cashierId: sale.cashierId,
          name: sale.cashier?.name ?? "Unknown",
          count: 0,
          total: 0,
        };
        cashier.count += 1;
        cashier.total += sale.total;
        cashierMap.set(sale.cashierId, cashier);

        for (const item of sale.items) {
          const med = medicineMap.get(item.medicineId) ?? {
            medicineId: item.medicineId,
            name: item.medicine?.name ?? "Unknown",
            category: item.medicine?.category ?? "Other",
            quantity: 0,
            revenue: 0,
          };
          med.quantity += item.quantity;
          med.revenue += item.total;
          medicineMap.set(item.medicineId, med);
        }
      } else {
        refundedCount += 1;
        refundTotal += sale.total;
      }
    }

    const chart = Array.from(dailyMap.values()).map((row) => ({
      ...row,
      revenue: Number(row.revenue.toFixed(2)),
      refunds: Number(row.refunds.toFixed(2)),
    }));

    return apiSuccess({
      range: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        netRevenue: Number((grossRevenue - refundTotal).toFixed(2)),
        completedCount,
        refundedCount,
        refundTotal: Number(refundTotal.toFixed(2)),
        averageTicket:
          completedCount > 0
            ? Number((grossRevenue / completedCount).toFixed(2))
            : 0,
      },
      chart,
      byPaymentMethod: Array.from(paymentMap.values()).map((row) => ({
        ...row,
        total: Number(row.total.toFixed(2)),
      })),
      byCashier: Array.from(cashierMap.values())
        .map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }))
        .sort((a, b) => b.total - a.total),
      topMedicines: Array.from(medicineMap.values())
        .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15),
      table: sales
        .filter((s) => s.status === "COMPLETED" || s.status === "REFUNDED")
        .slice()
        .reverse()
        .slice(0, 200)
        .map((sale) => ({
          id: sale.id,
          saleNumber: sale.saleNumber,
          date: sale.createdAt.toISOString(),
          cashier: sale.cashier?.name ?? "—",
          paymentMethod: sale.paymentMethod,
          status: sale.status,
          total: sale.total,
          itemCount: sale.items.length,
        })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/reports/sales", error);
    return apiError("Failed to load sales report", 500);
  }
}
