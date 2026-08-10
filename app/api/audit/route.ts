import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import {
  apiSuccess,
  handleRouteError,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN"]);

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder } =
      parsePagination(searchParams);

    const userId = searchParams.get("userId")?.trim() || undefined;
    const action = searchParams.get("action")?.trim() || undefined;
    const entity = searchParams.get("entity")?.trim() || undefined;
    const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;
    const dateTo = searchParams.get("dateTo")?.trim() || undefined;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = { equals: action, mode: "insensitive" };
    if (entity) where.entity = { equals: entity, mode: "insensitive" };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!Number.isNaN(from.getTime())) {
          where.createdAt.gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!Number.isNaN(to.getTime())) {
          // Inclusive end of day when only a date is provided
          if (dateTo.length <= 10) {
            to.setHours(23, 59, 59, 999);
          }
          where.createdAt.lte = to;
        }
      }
    }

    const allowedSort = new Set(["createdAt", "action", "entity"]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { [orderField]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiSuccess(logs, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
