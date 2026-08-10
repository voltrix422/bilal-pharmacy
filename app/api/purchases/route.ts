import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generatePONumber } from "@/lib/utils/barcode";
import { purchaseOrderSchema } from "@/lib/validations/purchase";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const status = searchParams.get("status") ?? undefined;
    const supplierId = searchParams.get("supplierId") ?? undefined;

    const where: Prisma.PurchaseOrderWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumPOStatusFilter["equals"];
    }
    if (supplierId) where.supplierId = supplierId;

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const allowedSort = new Set([
      "createdAt",
      "expectedDate",
      "totalAmount",
      "status",
      "poNumber",
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { [orderField]: sortOrder },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              paymentTerms: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              medicine: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                },
              },
            },
          },
          _count: { select: { items: true } },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return apiSuccess(purchaseOrders, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    const body = await request.json();
    const data = purchaseOrderSchema.parse(body);

    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, isActive: true },
    });
    if (!supplier) {
      throw new ApiError("Supplier not found", 404);
    }

    const medicineIds = data.items.map((item) => item.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, isActive: true },
      select: { id: true },
    });
    if (medicines.length !== new Set(medicineIds).size) {
      throw new ApiError("One or more medicines are invalid", 400);
    }

    let poNumber = generatePONumber();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await prisma.purchaseOrder.findUnique({
        where: { poNumber },
        select: { id: true },
      });
      if (!exists) break;
      poNumber = generatePONumber();
    }

    const items = data.items.map((item) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.quantity * item.unitCost,
      batchNumber: item.batchNumber || null,
      expiryDate: item.expiryDate ?? null,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        expectedDate: data.expectedDate ?? null,
        notes: data.notes || null,
        status: data.status ?? "DRAFT",
        totalAmount,
        createdById: user.id,
        items: { create: items },
      },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: { include: { medicine: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "PurchaseOrder",
      entityId: purchaseOrder.id,
      newValues: {
        id: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        status: purchaseOrder.status,
        totalAmount: purchaseOrder.totalAmount,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(purchaseOrder, undefined, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
