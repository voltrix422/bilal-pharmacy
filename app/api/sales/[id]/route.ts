import { NextRequest } from "next/server";
import { ApiError, apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const SALES_ROLES = ["CASHIER", "ADMIN", "PHARMACIST", "MANAGER"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([...SALES_ROLES]);

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
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
        prescription: {
          include: {
            items: { include: { medicine: true } },
          },
        },
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
        returns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!sale) {
      return apiError("Sale not found", 404);
    }

    return apiSuccess(sale);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("Sale GET error:", error);
    return apiError("Failed to load sale", 500);
  }
}
