import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  ApiError,
  apiSuccess,
  handleRouteError,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  id: z.string().cuid().optional(),
  markAll: z.boolean().optional(),
  isRead: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take } = parsePagination(searchParams);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId: user.id }, { userId: null }],
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          OR: [{ userId: user.id }, { userId: null }],
          isRead: false,
        },
      }),
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    return apiSuccess(notifications, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = patchSchema.parse(await request.json());

    if (body.markAll) {
      const result = await prisma.notification.updateMany({
        where: {
          OR: [{ userId: user.id }, { userId: null }],
          isRead: false,
        },
        data: { isRead: true },
      });

      return apiSuccess({ updated: result.count });
    }

    if (!body.id) {
      throw new ApiError("Notification id is required unless markAll is true", 400);
    }

    const existing = await prisma.notification.findFirst({
      where: {
        id: body.id,
        OR: [{ userId: user.id }, { userId: null }],
      },
    });

    if (!existing) {
      throw new ApiError("Notification not found", 404);
    }

    const updated = await prisma.notification.update({
      where: { id: existing.id },
      data: { isRead: body.isRead ?? true },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
