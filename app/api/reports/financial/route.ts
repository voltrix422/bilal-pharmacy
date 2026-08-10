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

    const [sales, returns, purchases] = await Promise.all([
      prisma.sale.findMany({
        where: {
          status: { in: ["COMPLETED", "REFUNDED"] },
          createdAt: { gte: from, lte: to },
          isHeld: false,
        },
        select: {
          id: true,
          saleNumber: true,
          status: true,
          paymentMethod: true,
          subtotal: true,
          discount: true,
          tax: true,
          total: true,
          createdAt: true,
        },
      }),
      prisma.return.findMany({
        where: {
          status: { in: ["COMPLETED", "APPROVED"] },
          createdAt: { gte: from, lte: to },
          type: "CUSTOMER_RETURN",
        },
        select: {
          id: true,
          returnNumber: true,
          totalRefund: true,
          createdAt: true,
        },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          status: { in: ["RECEIVED", "PARTIALLY_RECEIVED"] },
          updatedAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          poNumber: true,
          totalAmount: true,
          status: true,
          updatedAt: true,
          supplier: { select: { name: true } },
        },
      }),
    ]);

    let revenue = 0;
    let discounts = 0;
    let tax = 0;
    let refunds = 0;

    const daily = new Map<
      string,
      { date: string; label: string; revenue: number; cogs: number; profit: number; refunds: number }
    >();

    let cursor = startOfDay(from);
    const end = startOfDay(to);
    while (cursor <= end) {
      const key = format(cursor, "yyyy-MM-dd");
      daily.set(key, {
        date: key,
        label: format(cursor, "dd MMM"),
        revenue: 0,
        cogs: 0,
        profit: 0,
        refunds: 0,
      });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }

    for (const sale of sales) {
      const key = format(startOfDay(sale.createdAt), "yyyy-MM-dd");
      const bucket = daily.get(key);
      if (sale.status === "COMPLETED") {
        revenue += sale.total;
        discounts += sale.discount;
        tax += sale.tax;
        if (bucket) bucket.revenue += sale.total;
      }
    }

    for (const ret of returns) {
      refunds += ret.totalRefund;
      const key = format(startOfDay(ret.createdAt), "yyyy-MM-dd");
      const bucket = daily.get(key);
      if (bucket) bucket.refunds += ret.totalRefund;
    }

    const itemsWithSale = await prisma.saleItem.findMany({
      where: {
        sale: {
          status: "COMPLETED",
          createdAt: { gte: from, lte: to },
          isHeld: false,
        },
      },
      select: {
        quantity: true,
        batch: { select: { unitCost: true } },
        sale: { select: { createdAt: true } },
      },
    });

    let cogs = 0;
    for (const item of itemsWithSale) {
      const lineCogs = item.quantity * item.batch.unitCost;
      cogs += lineCogs;
      const key = format(startOfDay(item.sale.createdAt), "yyyy-MM-dd");
      const bucket = daily.get(key);
      if (bucket) {
        bucket.cogs += lineCogs;
        bucket.profit = bucket.revenue - bucket.cogs - bucket.refunds;
      }
    }

    const purchaseSpend = purchases.reduce((sum, po) => sum + po.totalAmount, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - refunds;

    const paymentBreakdown = new Map<string, number>();
    for (const sale of sales.filter((s) => s.status === "COMPLETED")) {
      paymentBreakdown.set(
        sale.paymentMethod,
        (paymentBreakdown.get(sale.paymentMethod) ?? 0) + sale.total
      );
    }

    return apiSuccess({
      range: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        revenue: Number(revenue.toFixed(2)),
        cogs: Number(cogs.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        refunds: Number(refunds.toFixed(2)),
        discounts: Number(discounts.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        purchaseSpend: Number(purchaseSpend.toFixed(2)),
        marginPct:
          revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0,
      },
      chart: Array.from(daily.values()).map((row) => ({
        date: row.date,
        label: row.label,
        revenue: Number(row.revenue.toFixed(2)),
        cogs: Number(row.cogs.toFixed(2)),
        profit: Number((row.revenue - row.cogs - row.refunds).toFixed(2)),
        refunds: Number(row.refunds.toFixed(2)),
      })),
      paymentBreakdown: Array.from(paymentBreakdown.entries()).map(
        ([method, total]) => ({
          method,
          total: Number(total.toFixed(2)),
        })
      ),
      purchasesTable: purchases.map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        supplier: po.supplier?.name ?? "—",
        status: po.status,
        totalAmount: po.totalAmount,
        date: po.updatedAt.toISOString(),
      })),
      returnsTable: returns.map((ret) => ({
        id: ret.id,
        returnNumber: ret.returnNumber,
        totalRefund: ret.totalRefund,
        date: ret.createdAt.toISOString(),
      })),
      salesTable: sales
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 200)
        .map((sale) => ({
          id: sale.id,
          saleNumber: sale.saleNumber,
          status: sale.status,
          paymentMethod: sale.paymentMethod,
          subtotal: sale.subtotal,
          discount: sale.discount,
          tax: sale.tax,
          total: sale.total,
          date: sale.createdAt.toISOString(),
        })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/reports/financial", error);
    return apiError("Failed to load financial report", 500);
  }
}
