import { NextRequest } from "next/server";
import type { MedicineUnit, Prisma } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  createAuditLog,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateBarcode, generateSKU } from "@/lib/utils/barcode";
import { getStockLevel } from "@/lib/utils/stock";
import { medicineSchema } from "@/lib/validations/medicine";
import type { MedicineListItem } from "@/types";

const MUTATION_ROLES = ["ADMIN", "PHARMACIST", "MANAGER"] as const;

const SORTABLE_FIELDS = new Set([
  "name",
  "category",
  "sku",
  "createdAt",
  "updatedAt",
  "brand",
  "unit",
]);

function serializeMedicine(
  medicine: {
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
      remainingQuantity: number;
      expiryDate: Date;
      isActive: boolean;
    }>;
  }
): MedicineListItem {
  const activeBatches = medicine.batches.filter((batch) => batch.isActive);
  const totalStock = activeBatches.reduce(
    (sum, batch) => sum + batch.remainingQuantity,
    0
  );
  const nearestExpiry =
    activeBatches
      .filter((batch) => batch.remainingQuantity > 0)
      .sort(
        (a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      )[0]?.expiryDate ?? null;

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
    nearestExpiry: nearestExpiry ? nearestExpiry.toISOString() : null,
    batchCount: activeBatches.length,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const category = searchParams.get("category")?.trim() || undefined;
    const unit = searchParams.get("unit")?.trim() || undefined;
    const lowStock = searchParams.get("lowStock") === "true";
    const hasStock = searchParams.get("hasStock") === "true";
    const source = searchParams.get("source")?.trim() || undefined; // drap | local
    const isActiveParam = searchParams.get("isActive");
    const requiresPrescriptionParam = searchParams.get("requiresPrescription");

    const where: Prisma.MedicineWhereInput = {};

    if (isActiveParam === "true") where.isActive = true;
    else if (isActiveParam === "false") where.isActive = false;
    else where.isActive = true;

    if (category) where.category = category;
    if (unit) where.unit = unit as MedicineUnit;
    if (requiresPrescriptionParam === "true") where.requiresPrescription = true;
    if (requiresPrescriptionParam === "false") where.requiresPrescription = false;

    // Store inventory: only medicines with remaining stock in active batches
    if (hasStock) {
      where.batches = {
        some: {
          isActive: true,
          remainingQuantity: { gt: 0 },
        },
      };
    }

    if (source === "drap") {
      where.sku = { startsWith: "DRAP-" };
    } else if (source === "local") {
      where.NOT = { sku: { startsWith: "DRAP-" } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { brand: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }

    const orderByField = SORTABLE_FIELDS.has(sortBy) ? sortBy : "createdAt";
    const orderBy: Prisma.MedicineOrderByWithRelationInput = {
      [orderByField]: sortOrder,
    };

    const include = {
      batches: {
        select: {
          remainingQuantity: true,
          expiryDate: true,
          isActive: true,
        },
      },
    } as const;

    if (lowStock) {
      const all = await prisma.medicine.findMany({
        where,
        include,
        orderBy,
      });
      const filtered = all
        .map(serializeMedicine)
        .filter((item) =>
          ["out", "critical", "low"].includes(item.stockLevel)
        );
      const total = filtered.length;
      const data = filtered.slice(skip, skip + take);

      return apiSuccess(data, {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    const [rows, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        include,
        orderBy,
        skip,
        take,
      }),
      prisma.medicine.count({ where }),
    ]);

    return apiSuccess(rows.map(serializeMedicine), {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("GET /api/medicines", error);
    return apiError("Failed to load medicines", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth([...MUTATION_ROLES]);
    const body = await request.json();
    const parsed = medicineSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    let sku = input.sku?.trim() || generateSKU(input.category, input.name);
    let barcode =
      input.barcode === "" || input.barcode == null
        ? null
        : input.barcode.trim();

    const existingSku = await prisma.medicine.findUnique({ where: { sku } });
    if (existingSku) {
      sku = generateSKU(input.category, input.name);
    }

    if (barcode) {
      const existingBarcode = await prisma.medicine.findUnique({
        where: { barcode },
      });
      if (existingBarcode) {
        return apiError("Barcode already exists", 409);
      }
    } else if (body.autoBarcode === true) {
      barcode = generateBarcode();
    }

    const medicine = await prisma.medicine.create({
      data: {
        name: input.name,
        genericName: input.genericName || null,
        brand: input.brand || null,
        category: input.category,
        description: input.description || null,
        sku,
        barcode,
        unit: input.unit,
        strength: input.strength || null,
        manufacturer: input.manufacturer || null,
        country: input.country || null,
        requiresPrescription: input.requiresPrescription,
        isControlled: input.isControlled,
        isActive: input.isActive,
        imageUrl: input.imageUrl || null,
        minStockLevel: input.minStockLevel,
        reorderPoint: input.reorderPoint,
      },
      include: {
        batches: {
          select: {
            remainingQuantity: true,
            expiryDate: true,
            isActive: true,
          },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Medicine",
      entityId: medicine.id,
      newValues: medicine,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(serializeMedicine(medicine), undefined, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("POST /api/medicines", error);
    return apiError("Failed to create medicine", 500);
  }
}
