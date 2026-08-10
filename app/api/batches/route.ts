import { NextRequest } from "next/server";
import type { LocationType, MedicineUnit, Prisma } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  createAuditLog,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getExpiryStatus } from "@/lib/utils/stock";
import { batchSchema } from "@/lib/validations/batch";
import type { BatchListItem } from "@/types";

const MUTATION_ROLES = ["ADMIN", "PHARMACIST", "MANAGER"] as const;

function daysUntil(expiryDate: Date, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(expiryDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

type BatchRow = {
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
    unit: MedicineUnit;
    category: string;
  };
  supplier: { id: string; name: string } | null;
  location: { id: string; name: string; type: LocationType } | null;
};

function serializeBatch(batch: BatchRow): BatchListItem {
  const expiryStatus = getExpiryStatus(batch.expiryDate);
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
    expiryStatus,
    daysUntilExpiry: daysUntil(batch.expiryDate),
  };
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

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const medicineId = searchParams.get("medicineId") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const expiryStatus = searchParams.get("expiryStatus") || "all";
    const isActiveParam = searchParams.get("isActive");

    const where: Prisma.BatchWhereInput = {};

    if (isActiveParam === "true") where.isActive = true;
    else if (isActiveParam === "false") where.isActive = false;

    if (medicineId) where.medicineId = medicineId;
    if (supplierId) where.supplierId = supplierId;
    if (locationId) where.locationId = locationId;

    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: "insensitive" } },
        { medicine: { name: { contains: search, mode: "insensitive" } } },
        { medicine: { sku: { contains: search, mode: "insensitive" } } },
      ];
    }

    const now = new Date();
    const criticalDate = new Date(now);
    criticalDate.setDate(criticalDate.getDate() + 7);
    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + 30);

    if (expiryStatus === "expired") {
      where.expiryDate = { lt: now };
    } else if (expiryStatus === "critical") {
      where.expiryDate = { gte: now, lt: criticalDate };
    } else if (expiryStatus === "warning") {
      where.expiryDate = { gte: criticalDate, lt: warningDate };
    } else if (expiryStatus === "ok") {
      where.expiryDate = { gte: warningDate };
    }

    const sortable = new Set([
      "batchNumber",
      "expiryDate",
      "receivedDate",
      "remainingQuantity",
      "quantity",
      "sellingPrice",
      "unitCost",
      "createdAt",
    ]);
    const orderField = sortable.has(sortBy) ? sortBy : "expiryDate";

    const [rows, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: batchInclude,
        orderBy: { [orderField]: sortOrder },
        skip,
        take,
      }),
      prisma.batch.count({ where }),
    ]);

    return apiSuccess(rows.map(serializeBatch), {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/batches", error);
    return apiError("Failed to load batches", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth([...MUTATION_ROLES]);
    const body = await request.json();
    const parsed = batchSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    const medicine = await prisma.medicine.findUnique({
      where: { id: input.medicineId },
    });
    if (!medicine || !medicine.isActive) {
      return apiError("Medicine not found or inactive", 404);
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

    const remainingQuantity = input.remainingQuantity ?? input.quantity;

    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.batch.create({
        data: {
          medicineId: input.medicineId,
          supplierId: input.supplierId || null,
          batchNumber: input.batchNumber,
          quantity: input.quantity,
          remainingQuantity,
          unitCost: input.unitCost,
          sellingPrice: input.sellingPrice,
          expiryDate: input.expiryDate,
          receivedDate: input.receivedDate ?? new Date(),
          locationId: input.locationId || null,
          isActive: input.isActive,
        },
        include: batchInclude,
      });

      await tx.stockAdjustment.create({
        data: {
          batchId: created.id,
          medicineId: created.medicineId,
          type: "RECEIVED",
          quantityChange: remainingQuantity,
          previousQuantity: 0,
          newQuantity: remainingQuantity,
          reason: "Initial batch receipt",
          performedById: user.id,
        },
      });

      return created;
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Batch",
      entityId: batch.id,
      newValues: batch,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(serializeBatch(batch), undefined, 201);
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
    console.error("POST /api/batches", error);
    return apiError("Failed to create batch", 500);
  }
}
