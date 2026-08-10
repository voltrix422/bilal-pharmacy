import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  createAuditLog,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getExpiryStatus } from "@/lib/utils/stock";
import { batchUpdateSchema } from "@/lib/validations/batch";

const MUTATION_ROLES = ["ADMIN", "PHARMACIST", "MANAGER"] as const;

type RouteContext = { params: { id: string } };

function daysUntil(expiryDate: Date, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(expiryDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const batchInclude = {
  medicine: {
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      category: true,
    },
  },
  supplier: { select: { id: true, name: true } },
  location: { select: { id: true, name: true, type: true } },
} as const;

function serializeBatch(batch: {
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
  medicine: {
    id: string;
    name: string;
    sku: string;
    unit: import("@prisma/client").MedicineUnit;
    category: string;
  };
  supplier: { id: string; name: string } | null;
  location: {
    id: string;
    name: string;
    type: import("@prisma/client").LocationType;
  } | null;
}) {
  return {
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
    medicine: batch.medicine,
    supplier: batch.supplier,
    location: batch.location,
    expiryStatus: getExpiryStatus(batch.expiryDate),
    daysUntilExpiry: daysUntil(batch.expiryDate),
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = context.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: batchInclude,
    });

    if (!batch) {
      return apiError("Batch not found", 404);
    }

    return apiSuccess(serializeBatch(batch));
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/batches/[id]", error);
    return apiError("Failed to load batch", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth([...MUTATION_ROLES]);
    const { id } = context.params;
    const body = await request.json();
    const parsed = batchUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Batch not found", 404);
    }

    const input = parsed.data;

    if (input.medicineId) {
      const medicine = await prisma.medicine.findUnique({
        where: { id: input.medicineId },
      });
      if (!medicine) {
        return apiError("Medicine not found", 404);
      }
    }

    if (input.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: input.supplierId },
      });
      if (!supplier) {
        return apiError("Supplier not found", 404);
      }
    }

    if (input.locationId) {
      const location = await prisma.stockLocation.findUnique({
        where: { id: input.locationId },
      });
      if (!location) {
        return apiError("Location not found", 404);
      }
    }

    const data: Prisma.BatchUpdateInput = {};
    if (input.medicineId !== undefined) {
      data.medicine = { connect: { id: input.medicineId } };
    }
    if (input.supplierId !== undefined) {
      data.supplier = input.supplierId
        ? { connect: { id: input.supplierId } }
        : { disconnect: true };
    }
    if (input.batchNumber !== undefined) data.batchNumber = input.batchNumber;
    if (input.quantity !== undefined) data.quantity = input.quantity;
    if (input.remainingQuantity !== undefined) {
      data.remainingQuantity = input.remainingQuantity;
    }
    if (input.unitCost !== undefined) data.unitCost = input.unitCost;
    if (input.sellingPrice !== undefined) data.sellingPrice = input.sellingPrice;
    if (input.expiryDate !== undefined) data.expiryDate = input.expiryDate;
    if (input.receivedDate !== undefined) data.receivedDate = input.receivedDate;
    if (input.locationId !== undefined) {
      data.location = input.locationId
        ? { connect: { id: input.locationId } }
        : { disconnect: true };
    }
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const batch = await prisma.$transaction(async (tx) => {
      const updated = await tx.batch.update({
        where: { id },
        data,
        include: batchInclude,
      });

      if (
        input.remainingQuantity !== undefined &&
        input.remainingQuantity !== existing.remainingQuantity
      ) {
        await tx.stockAdjustment.create({
          data: {
            batchId: updated.id,
            medicineId: updated.medicineId,
            type: "CORRECTION",
            quantityChange:
              input.remainingQuantity - existing.remainingQuantity,
            previousQuantity: existing.remainingQuantity,
            newQuantity: input.remainingQuantity,
            reason: body.reason || "Batch quantity update",
            performedById: user.id,
          },
        });
      }

      return updated;
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Batch",
      entityId: batch.id,
      oldValues: existing,
      newValues: batch,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(serializeBatch(batch));
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return apiError("Batch number already exists for this medicine", 409);
    }
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("PUT /api/batches/[id]", error);
    return apiError("Failed to update batch", 500);
  }
}
