import { NextRequest } from "next/server";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"]);
    const q = (request.nextUrl.searchParams.get("q") || "").trim();

    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        _count: { select: { onlineOrders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return apiSuccess(customers);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    return apiError("Failed to load website customers", 500);
  }
}
