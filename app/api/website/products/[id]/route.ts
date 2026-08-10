import { NextRequest } from "next/server";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined)
      data.description = body.description ? String(body.description) : null;
    if (body.category !== undefined) data.category = String(body.category).trim();
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.unitLabel !== undefined) data.unitLabel = String(body.unitLabel);
    if (body.requiresPrescription !== undefined)
      data.requiresPrescription = Boolean(body.requiresPrescription);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    if (body.imageUrl !== undefined)
      data.imageUrl = body.imageUrl ? String(body.imageUrl) : null;

    const product = await prisma.websiteProduct.update({
      where: { id },
      data,
    });

    return apiSuccess(product);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error(error);
    return apiError("Failed to update product", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);
    const { id } = await params;
    await prisma.websiteProduct.update({
      where: { id },
      data: { isActive: false },
    });
    return apiSuccess({ id, deactivated: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error(error);
    return apiError("Failed to deactivate product", 500);
  }
}
