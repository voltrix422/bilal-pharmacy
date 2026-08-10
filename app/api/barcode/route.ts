import { NextRequest } from "next/server";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getExpiryStatus, getStockLevel } from "@/lib/utils/stock";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const code = request.nextUrl.searchParams.get("code")?.trim();
    if (!code) {
      return apiError("Barcode or SKU code is required", 400);
    }

    const medicine = await prisma.medicine.findFirst({
      where: {
        isActive: true,
        OR: [
          { barcode: code },
          { sku: { equals: code, mode: "insensitive" } },
        ],
      },
      include: {
        batches: {
          where: {
            isActive: true,
            remainingQuantity: { gt: 0 },
          },
          orderBy: { expiryDate: "asc" },
          include: {
            location: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!medicine) {
      return apiError("No medicine found for this code", 404);
    }

    const totalStock = medicine.batches.reduce(
      (sum, batch) => sum + batch.remainingQuantity,
      0
    );

    return apiSuccess({
      id: medicine.id,
      name: medicine.name,
      genericName: medicine.genericName,
      brand: medicine.brand,
      category: medicine.category,
      sku: medicine.sku,
      barcode: medicine.barcode,
      unit: medicine.unit,
      strength: medicine.strength,
      requiresPrescription: medicine.requiresPrescription,
      isControlled: medicine.isControlled,
      minStockLevel: medicine.minStockLevel,
      reorderPoint: medicine.reorderPoint,
      totalStock,
      stockLevel: getStockLevel(
        totalStock,
        medicine.minStockLevel,
        medicine.reorderPoint
      ),
      batches: medicine.batches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        remainingQuantity: batch.remainingQuantity,
        sellingPrice: batch.sellingPrice,
        unitCost: batch.unitCost,
        expiryDate: batch.expiryDate.toISOString(),
        expiryStatus: getExpiryStatus(batch.expiryDate),
        location: batch.location,
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/barcode", error);
    return apiError("Failed to lookup barcode", 500);
  }
}
