import { NextRequest } from "next/server";
import type { PaymentMethod, Prisma, SaleStatus } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { paymentMethodEnum, saleStatusEnum } from "@/lib/validations/sale";

const SALES_ROLES = ["CASHIER", "ADMIN", "PHARMACIST", "MANAGER"] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAuth([...SALES_ROLES]);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const dateFrom = searchParams.get("dateFrom") || searchParams.get("from");
    const dateTo = searchParams.get("dateTo") || searchParams.get("to");
    const date = searchParams.get("date");
    const cashierId = searchParams.get("cashier") || searchParams.get("cashierId");
    const paymentMethodRaw = searchParams.get("paymentMethod");
    const statusRaw = searchParams.get("status");
    const isHeldRaw = searchParams.get("isHeld");

    const where: Prisma.SaleWhereInput = {};

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
        { cashier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (date) {
      const day = new Date(date);
      if (!Number.isNaN(day.getTime())) {
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(day);
        end.setHours(23, 59, 59, 999);
        where.createdAt = { gte: start, lte: end };
      }
    } else if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!Number.isNaN(from.getTime())) {
          from.setHours(0, 0, 0, 0);
          where.createdAt.gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          where.createdAt.lte = to;
        }
      }
    }

    if (cashierId) {
      where.cashierId = cashierId;
    }

    if (paymentMethodRaw) {
      const pm = paymentMethodEnum.safeParse(paymentMethodRaw);
      if (pm.success) {
        where.paymentMethod = pm.data as PaymentMethod;
      }
    }

    if (statusRaw) {
      const st = saleStatusEnum.safeParse(statusRaw);
      if (st.success) {
        where.status = st.data as SaleStatus;
      }
    }

    if (isHeldRaw === "true") where.isHeld = true;
    if (isHeldRaw === "false") where.isHeld = false;

    const allowedSort = new Set([
      "createdAt",
      "total",
      "saleNumber",
      "status",
      "paymentMethod",
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { [orderField]: sortOrder },
        include: {
          customer: true,
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
              isActive: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          items: {
            include: {
              medicine: true,
              batch: true,
            },
          },
          _count: { select: { items: true, returns: true } },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return apiSuccess(sales, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("Sales GET error:", error);
    return apiError("Failed to load sales", 500);
  }
}
