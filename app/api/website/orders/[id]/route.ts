import { NextRequest } from "next/server";
import type { OnlineOrderStatus } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

const STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"]);
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status || "").toUpperCase();

    if (!STATUSES.has(status)) {
      return apiError("Invalid status", 400);
    }

    const order = await prisma.onlineOrder.update({
      where: { id },
      data: { status: status as OnlineOrderStatus },
      include: { items: true },
    });

    return apiSuccess(order);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error(error);
    return apiError("Failed to update order", 500);
  }
}
