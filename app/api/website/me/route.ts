import { NextRequest } from "next/server";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionUser = await requireAuth(["CUSTOMER"]);
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        createdAt: true,
      },
    });
    if (!user) return apiError("Account not found", 404);
    return apiSuccess(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    return apiError("Failed to load profile", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireAuth(["CUSTOMER"]);
    const body = await request.json();

    const data: {
      name?: string;
      phone?: string;
      address?: string;
      city?: string | null;
    } = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.phone !== undefined) data.phone = String(body.phone).trim();
    if (body.address !== undefined) data.address = String(body.address).trim();
    if (body.city !== undefined)
      data.city = body.city ? String(body.city).trim() : null;

    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
      },
    });

    return apiSuccess(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    return apiError("Failed to update profile", 500);
  }
}
