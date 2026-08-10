import { NextRequest } from "next/server";
import type { LocationType, MedicineUnit, Prisma } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  createAuditLog,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getExpiryStatus, getStockLevel } from "@/lib/utils/stock";
import { medicineUpdateSchema } from "@/lib/validations/medicine";

const MUTATION_ROLES = ["ADMIN", "PHARMACIST", "MANAGER"] as const;

type RouteContext = { params: { id: string } };

function serializeDetail(medicine: {
  id: string;
  name: string;
  genericName: string | null;
  brand: string | null;
  category: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  unit: MedicineUnit;
  strength: string | null;
  manufacturer: string | null;
  country: string | null;
  requiresPrescription: boolean;
  isControlled: boolean;
  isActive: boolean;
  imageUrl: string | null;
  minStockLevel: number;
  reorderPoint: number;
  createdAt: Date;
  updatedAt: Date;
  batches: Array<{
    id: string;
    medicineId: string;
    supplierId: string | null;
    batchNumber: string;
    quantity: number;
    remainingQuantity: number;
    unitCost: number;
    sellingPrice: number;
    expiryDate: Date;
    receivedDate: Date;
    locationId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    supplier: { id: string; name: string } | null;
    location: { id: string; name: string; type: LocationType } | null;
  }>;
  adjustments: Array<{
    id: string;
    batchId: string;
    medicineId: string;
    type: string;
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string | null;
    performedById: string;
    createdAt: Date;
    performedBy: { id: string; name: string };
    batch: { batchNumber: string };
  }>;
}) {
  const activeBatches = medicine.batches.filter((batch) => batch.isActive);
  const totalStock = activeBatches.reduce(
    (sum, batch) => sum + batch.remainingQuantity,
    0
  );

  return {
    id: medicine.id,
    name: medicine.name,
    genericName: medicine.genericName,
    brand: medicine.brand,
    category: medicine.category,
    description: medicine.description,
    sku: medicine.sku,
    barcode: medicine.barcode,
    unit: medicine.unit,
    strength: medicine.strength,
    manufacturer: medicine.manufacturer,
    country: medicine.country,
    requiresPrescription: medicine.requiresPrescription,
    isControlled: medicine.isControlled,
    isActive: medicine.isActive,
    imageUrl: medicine.imageUrl,
    minStockLevel: medicine.minStockLevel,
    reorderPoint: medicine.reorderPoint,
    createdAt: medicine.createdAt.toISOString(),
    updatedAt: medicine.updatedAt.toISOString(),
    totalStock,
    stockLevel: getStockLevel(
      totalStock,
      medicine.minStockLevel,
      medicine.reorderPoint
    ),
    batches: medicine.batches.map((batch) => ({
      id: batch.id,
      medicineId: batch.medicineId,
      supplierId: batch.supplierId,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      remainingQuantity: batch.remainingQuantity,
      unitCost: batch.unitCost,
      sellingPrice: batch.sellingPrice,
      expiryDate: batch.expiryDate.toISOString(),
      receivedDate: batch.receivedDate.toISOString(),
      locationId: batch.locationId,
      isActive: batch.isActive,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      supplier: batch.supplier,
      location: batch.location,
      expiryStatus: getExpiryStatus(batch.expiryDate),
    })),
    history: medicine.adjustments.map((item) => ({
      id: item.id,
      batchId: item.batchId,
      batchNumber: item.batch.batchNumber,
      medicineId: item.medicineId,
      type: item.type,
      quantityChange: item.quantityChange,
      previousQuantity: item.previousQuantity,
      newQuantity: item.newQuantity,
      reason: item.reason,
      performedById: item.performedById,
      performedByName: item.performedBy.name,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

const detailInclude = {
  batches: {
    orderBy: { expiryDate: "asc" as const },
    include: {
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true, type: true } },
    },
  },
  adjustments: {
    orderBy: { createdAt: "desc" as const },
    take: 50,
    include: {
      performedBy: { select: { id: true, name: true } },
      batch: { select: { batchNumber: true } },
    },
  },
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = context.params;

    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: detailInclude,
    });

    if (!medicine) {
      return apiError("Medicine not found", 404);
    }

    return apiSuccess(serializeDetail(medicine));
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/medicines/[id]", error);
    return apiError("Failed to load medicine", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth([...MUTATION_ROLES]);
    const { id } = context.params;
    const body = await request.json();
    const parsed = medicineUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Medicine not found", 404);
    }

    const input = parsed.data;

    if (input.sku && input.sku !== existing.sku) {
      const skuTaken = await prisma.medicine.findUnique({
        where: { sku: input.sku },
      });
      if (skuTaken) {
        return apiError("SKU already exists", 409);
      }
    }

    if (input.barcode && input.barcode !== existing.barcode) {
      const barcodeTaken = await prisma.medicine.findUnique({
        where: { barcode: input.barcode },
      });
      if (barcodeTaken) {
        return apiError("Barcode already exists", 409);
      }
    }

    const data: Prisma.MedicineUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.genericName !== undefined) data.genericName = input.genericName || null;
    if (input.brand !== undefined) data.brand = input.brand || null;
    if (input.category !== undefined) data.category = input.category;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.barcode !== undefined) {
      data.barcode = input.barcode === "" ? null : input.barcode;
    }
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.strength !== undefined) data.strength = input.strength || null;
    if (input.manufacturer !== undefined) {
      data.manufacturer = input.manufacturer || null;
    }
    if (input.country !== undefined) data.country = input.country || null;
    if (input.requiresPrescription !== undefined) {
      data.requiresPrescription = input.requiresPrescription;
    }
    if (input.isControlled !== undefined) data.isControlled = input.isControlled;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;
    if (input.minStockLevel !== undefined) data.minStockLevel = input.minStockLevel;
    if (input.reorderPoint !== undefined) data.reorderPoint = input.reorderPoint;

    const medicine = await prisma.medicine.update({
      where: { id },
      data,
      include: detailInclude,
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Medicine",
      entityId: medicine.id,
      oldValues: existing,
      newValues: medicine,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(serializeDetail(medicine));
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("PUT /api/medicines/[id]", error);
    return apiError("Failed to update medicine", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth([...MUTATION_ROLES]);
    const { id } = context.params;

    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Medicine not found", 404);
    }

    const medicine = await prisma.medicine.update({
      where: { id },
      data: { isActive: false },
      include: detailInclude,
    });

    await createAuditLog({
      userId: user.id,
      action: "SOFT_DELETE",
      entity: "Medicine",
      entityId: medicine.id,
      oldValues: existing,
      newValues: { isActive: false },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(serializeDetail(medicine));
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("DELETE /api/medicines/[id]", error);
    return apiError("Failed to deactivate medicine", 500);
  }
}
