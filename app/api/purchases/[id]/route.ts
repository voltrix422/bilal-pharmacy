import { NextRequest } from "next/server";
import type { POStatus } from "@prisma/client";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  purchaseOrderUpdateSchema,
  receivePurchaseSchema,
} from "@/lib/validations/purchase";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: RouteContext["params"]) {
  const resolved = await Promise.resolve(params);
  return resolved.id;
}

const EDITABLE_STATUSES: POStatus[] = ["DRAFT", "SENT", "CONFIRMED"];

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    const id = await resolveId(context.params);

    const [purchaseOrder, locations] = await Promise.all([
      prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              medicine: true,
            },
          },
        },
      }),
      prisma.stockLocation.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!purchaseOrder) {
      throw new ApiError("Purchase order not found", 404);
    }

    return apiSuccess(purchaseOrder, { locations });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function receiveGoods(
  request: NextRequest,
  purchaseOrderId: string,
  userId: string,
  body: unknown
) {
  const payload = receivePurchaseSchema.parse(body);

  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { items: true },
  });

  if (!purchaseOrder) {
    throw new ApiError("Purchase order not found", 404);
  }

  if (
    purchaseOrder.status === "CANCELLED" ||
    purchaseOrder.status === "RECEIVED"
  ) {
    throw new ApiError(
      `Cannot receive goods for a ${purchaseOrder.status.toLowerCase()} purchase order`,
      400
    );
  }

  const itemMap = new Map(purchaseOrder.items.map((item) => [item.id, item]));

  const result = await prisma.$transaction(async (tx) => {
    const createdBatches = [];

    for (const line of payload.items) {
      const poItem = itemMap.get(line.id);
      if (!poItem) {
        throw new ApiError(`Purchase order item ${line.id} not found`, 400);
      }

      const remainingToReceive = poItem.quantity - poItem.receivedQuantity;
      if (line.receivedQuantity > remainingToReceive) {
        throw new ApiError(
          `Cannot receive more than remaining quantity for ${poItem.id}`,
          400
        );
      }

      if (line.locationId) {
        const location = await tx.stockLocation.findFirst({
          where: { id: line.locationId, isActive: true },
        });
        if (!location) {
          throw new ApiError("Stock location not found", 404);
        }
      }

      const existingBatch = await tx.batch.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: poItem.medicineId,
            batchNumber: line.batchNumber,
          },
        },
      });

      let batch;
      if (existingBatch) {
        const previousQuantity = existingBatch.remainingQuantity;
        const newQuantity = previousQuantity + line.receivedQuantity;
        batch = await tx.batch.update({
          where: { id: existingBatch.id },
          data: {
            quantity: existingBatch.quantity + line.receivedQuantity,
            remainingQuantity: newQuantity,
            unitCost: poItem.unitCost,
            sellingPrice: line.sellingPrice,
            expiryDate: line.expiryDate,
            supplierId: purchaseOrder.supplierId,
            locationId: line.locationId ?? existingBatch.locationId,
            isActive: true,
          },
        });

        await tx.stockAdjustment.create({
          data: {
            batchId: batch.id,
            medicineId: poItem.medicineId,
            type: "RECEIVED",
            quantityChange: line.receivedQuantity,
            previousQuantity,
            newQuantity,
            reason: `Received against PO ${purchaseOrder.poNumber}`,
            performedById: userId,
          },
        });
      } else {
        batch = await tx.batch.create({
          data: {
            medicineId: poItem.medicineId,
            supplierId: purchaseOrder.supplierId,
            batchNumber: line.batchNumber,
            quantity: line.receivedQuantity,
            remainingQuantity: line.receivedQuantity,
            unitCost: poItem.unitCost,
            sellingPrice: line.sellingPrice,
            expiryDate: line.expiryDate,
            locationId: line.locationId ?? null,
          },
        });

        await tx.stockAdjustment.create({
          data: {
            batchId: batch.id,
            medicineId: poItem.medicineId,
            type: "RECEIVED",
            quantityChange: line.receivedQuantity,
            previousQuantity: 0,
            newQuantity: line.receivedQuantity,
            reason: `Received against PO ${purchaseOrder.poNumber}`,
            performedById: userId,
          },
        });
      }

      createdBatches.push(batch);

      const newReceivedQty = poItem.receivedQuantity + line.receivedQuantity;
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          receivedQuantity: newReceivedQty,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
        },
      });

      poItem.receivedQuantity = newReceivedQty;
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
    });

    const allReceived = refreshedItems.every(
      (item) => item.receivedQuantity >= item.quantity
    );
    const anyReceived = refreshedItems.some(
      (item) => item.receivedQuantity > 0
    );

    const status: POStatus = allReceived
      ? "RECEIVED"
      : anyReceived
        ? "PARTIALLY_RECEIVED"
        : purchaseOrder.status;

    const updated = await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: { include: { medicine: true } },
      },
    });

    return { purchaseOrder: updated, batches: createdBatches };
  });

  await createAuditLog({
    userId,
    action: "RECEIVE",
    entity: "PurchaseOrder",
    entityId: purchaseOrderId,
    oldValues: { status: purchaseOrder.status },
    newValues: {
      status: result.purchaseOrder.status,
      items: payload.items,
      batchIds: result.batches.map((b) => b.id),
    },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return result.purchaseOrder;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    const id = await resolveId(context.params);
    const body = await request.json();

    if (body?.action === "receive") {
      const received = await receiveGoods(request, id, user.id, {
        items: body.items,
      });
      return apiSuccess(received);
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new ApiError("Purchase order not found", 404);
    }

    const data = purchaseOrderUpdateSchema.parse(body);

    if (
      data.items &&
      !EDITABLE_STATUSES.includes(existing.status) &&
      existing.status !== "PARTIALLY_RECEIVED"
    ) {
      if (existing.status === "RECEIVED" || existing.status === "CANCELLED") {
        throw new ApiError(
          "Items cannot be modified on a received or cancelled PO",
          400
        );
      }
    }

    if (data.status === "CANCELLED" && existing.status === "RECEIVED") {
      throw new ApiError("Received purchase orders cannot be cancelled", 400);
    }

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      let totalAmount = existing.totalAmount;

      if (data.items && EDITABLE_STATUSES.includes(existing.status)) {
        const medicineIds = data.items.map((item) => item.medicineId);
        const medicines = await tx.medicine.findMany({
          where: { id: { in: medicineIds }, isActive: true },
          select: { id: true },
        });
        if (medicines.length !== new Set(medicineIds).size) {
          throw new ApiError("One or more medicines are invalid", 400);
        }

        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        const items = data.items.map((item) => ({
          purchaseOrderId: id,
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost,
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate ?? null,
        }));

        await tx.purchaseOrderItem.createMany({ data: items });
        totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);
      }

      if (data.supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: data.supplierId, isActive: true },
        });
        if (!supplier) {
          throw new ApiError("Supplier not found", 404);
        }
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(data.supplierId !== undefined
            ? { supplierId: data.supplierId }
            : {}),
          ...(data.expectedDate !== undefined
            ? { expectedDate: data.expectedDate }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.items && EDITABLE_STATUSES.includes(existing.status)
            ? { totalAmount }
            : {}),
        },
        include: {
          supplier: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          items: { include: { medicine: true } },
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: purchaseOrder.id,
      oldValues: {
        status: existing.status,
        totalAmount: existing.totalAmount,
      },
      newValues: {
        status: purchaseOrder.status,
        totalAmount: purchaseOrder.totalAmount,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(purchaseOrder);
  } catch (error) {
    return handleRouteError(error);
  }
}
