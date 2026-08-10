import { NextRequest } from "next/server";
import {
  ApiError,
  apiError,
  apiSuccess,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

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

async function hasRecentNotification(
  relatedId: string,
  withinHours = 6
) {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      type: "PRESCRIPTION_PENDING",
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

    const pending = await prisma.prescription.findMany({
      where: { status: "PENDING" },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const created: Array<{ relatedId: string; prescriptionNumber: string }> =
      [];

    for (const rx of pending) {
      const already = await hasRecentNotification(rx.id, 6);
      if (already) continue;

      await prisma.notification.create({
        data: {
          userId: null,
          type: "PRESCRIPTION_PENDING",
          title: "Prescription pending",
          message: `Prescription ${rx.prescriptionNumber} for ${rx.customer?.name ?? "customer"} is awaiting verification/dispensing.`,
          priority: "MEDIUM",
          relatedId: rx.id,
          relatedType: "Prescription",
        },
      });

      created.push({
        relatedId: rx.id,
        prescriptionNumber: rx.prescriptionNumber,
      });
    }

    return apiSuccess({
      ok: true,
      pendingCount: pending.length,
      createdCount: created.length,
      created,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/cron/hourly-checks", error);
    return apiError("Hourly checks failed", 500);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
