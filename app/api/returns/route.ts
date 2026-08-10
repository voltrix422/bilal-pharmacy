import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateReturnNumber } from "@/lib/utils/barcode";
import { returnSchema, returnTypeEnum } from "@/lib/validations/return";

const RETURN_ROLES = ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"] as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth([...RETURN_ROLES]);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const typeRaw = searchParams.get("type");
    const status = searchParams.get("status") ?? undefined;
    const saleId = searchParams.get("saleId") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;

    const where: Prisma.ReturnWhereInput = {};

    if (typeRaw) {
      const parsed = returnTypeEnum.safeParse(typeRaw);
      if (parsed.success) where.type = parsed.data;
    }
    if (status) {
      where.status = status as Prisma.EnumReturnStatusFilter["equals"];
    }
    if (saleId) where.saleId = saleId;
    if (customerId) where.customerId = customerId;

    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { sale: { saleNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const allowedSort = new Set([
      "createdAt",
      "totalRefund",
      "returnNumber",
      "status",
      "type",
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [total, returns] = await Promise.all([
      prisma.return.count({ where }),
      prisma.return.findMany({
        where,
        skip,
        take,
        orderBy: { [orderField]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          sale: {
            select: {
              id: true,
              saleNumber: true,
              total: true,
              status: true,
            },
          },
          processedBy: {
            select: { id: true, name: true, email: true, role: true },
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
              batch: {
                select: {
                  id: true,
                  batchNumber: true,
                  expiryDate: true,
                },
              },
            },
          },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return apiSuccess(returns, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth([...RETURN_ROLES]);
    const body = await request.json();
    const input = returnSchema.parse(body);

    const created = await prisma.$transaction(async (tx) => {
      let sale:
        | (Prisma.SaleGetPayload<{
            include: {
              items: true;
              returns: { include: { items: true } };
            };
          }> & {})
        | null = null;

      if (input.type === "CUSTOMER_RETURN") {
        sale = await tx.sale.findUnique({
          where: { id: input.saleId! },
          include: {
            items: true,
            returns: {
              where: { status: { in: ["COMPLETED", "APPROVED"] } },
              include: { items: true },
            },
          },
        });

        if (!sale) {
          throw new ApiError("Sale not found", 404);
        }
        if (sale.status === "CANCELLED") {
          throw new ApiError("Cannot return a cancelled sale", 400);
        }
        if (sale.status === "PENDING" || sale.isHeld) {
          throw new ApiError("Sale must be completed before returning", 400);
        }
      }

      const preparedItems: Array<{
        medicineId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        refundAmount: number;
        reason: string | null;
        condition: "RESTOCK" | "DAMAGED";
      }> = [];

      for (const item of input.items) {
        if (!item.batchId && input.type === "CUSTOMER_RETURN" && sale) {
          const saleLine = sale.items.find(
            (line) => line.medicineId === item.medicineId
          );
          if (!saleLine) {
            throw new ApiError(
              `Medicine not found on sale: ${item.medicineId}`,
              400
            );
          }
          item.batchId = saleLine.batchId;
          if (item.unitPrice <= 0) item.unitPrice = saleLine.unitPrice;
        }

        if (!item.batchId) {
          throw new ApiError("Batch is required for each return item", 400);
        }

        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
          include: { medicine: { select: { id: true, name: true } } },
        });

        if (!batch || batch.medicineId !== item.medicineId) {
          throw new ApiError("Invalid batch for medicine", 400);
        }

        if (input.type === "CUSTOMER_RETURN" && sale) {
          const soldQty = sale.items
            .filter(
              (line) =>
                line.medicineId === item.medicineId &&
                line.batchId === item.batchId
            )
            .reduce((sum, line) => sum + line.quantity, 0);

          const previouslyReturned = sale.returns
            .flatMap((ret) => ret.items)
            .filter(
              (retItem) =>
                retItem.medicineId === item.medicineId &&
                retItem.batchId === item.batchId
            )
            .reduce((sum, retItem) => sum + retItem.quantity, 0);

          const alreadyInPrepared = preparedItems
            .filter(
              (p) =>
                p.medicineId === item.medicineId && p.batchId === item.batchId
            )
            .reduce((sum, p) => sum + p.quantity, 0);

          if (previouslyReturned + alreadyInPrepared + item.quantity > soldQty) {
            throw new ApiError(
              `Return quantity exceeds sold quantity for ${batch.medicine.name}`,
              400
            );
          }
        }

        if (input.type === "SUPPLIER_RETURN") {
          if (batch.remainingQuantity < item.quantity) {
            throw new ApiError(
              `Insufficient stock for ${batch.medicine.name}. Available: ${batch.remainingQuantity}`,
              400
            );
          }
        }

        const unitPrice =
          item.unitPrice > 0
            ? item.unitPrice
            : sale?.items.find((l) => l.batchId === item.batchId)?.unitPrice ??
              batch.sellingPrice;

        const refundAmount =
          item.refundAmount !== undefined
            ? round2(item.refundAmount)
            : round2(unitPrice * item.quantity);

        preparedItems.push({
          medicineId: item.medicineId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice,
          refundAmount:
            input.type === "CUSTOMER_RETURN" ? refundAmount : 0,
          reason: item.reason ?? null,
          condition: item.condition ?? "RESTOCK",
        });
      }

      const totalRefund = round2(
        preparedItems.reduce((sum, item) => sum + item.refundAmount, 0)
      );

      let returnNumber = generateReturnNumber();
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await tx.return.findUnique({
          where: { returnNumber },
          select: { id: true },
        });
        if (!exists) break;
        returnNumber = generateReturnNumber();
      }

      const ret = await tx.return.create({
        data: {
          returnNumber,
          saleId: input.saleId ?? null,
          customerId:
            input.customerId ?? sale?.customerId ?? null,
          type: input.type,
          status: input.status ?? "COMPLETED",
          reason: input.reason ?? null,
          totalRefund,
          processedById: user.id,
          items: {
            create: preparedItems.map((item) => ({
              medicineId: item.medicineId,
              batchId: item.batchId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              refundAmount: item.refundAmount,
              reason:
                item.reason ??
                (item.condition === "DAMAGED" ? "Damaged" : "Restock"),
            })),
          },
        },
        include: {
          items: {
            include: {
              medicine: true,
              batch: true,
            },
          },
          customer: true,
          sale: true,
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      for (const item of preparedItems) {
        const batch = await tx.batch.findUniqueOrThrow({
          where: { id: item.batchId },
        });
        const previousQuantity = batch.remainingQuantity;

        if (input.type === "CUSTOMER_RETURN") {
          if (item.condition === "RESTOCK") {
            const newQuantity = previousQuantity + item.quantity;
            await tx.batch.update({
              where: { id: batch.id },
              data: { remainingQuantity: newQuantity },
            });
            await tx.stockAdjustment.create({
              data: {
                batchId: batch.id,
                medicineId: item.medicineId,
                type: "RETURNED",
                quantityChange: item.quantity,
                previousQuantity,
                newQuantity,
                reason:
                  item.reason ??
                  `Customer return ${ret.returnNumber}`,
                performedById: user.id,
              },
            });
          } else {
            await tx.stockAdjustment.create({
              data: {
                batchId: batch.id,
                medicineId: item.medicineId,
                type: "DAMAGED",
                quantityChange: 0,
                previousQuantity,
                newQuantity: previousQuantity,
                reason:
                  item.reason ??
                  `Damaged customer return ${ret.returnNumber} (qty ${item.quantity})`,
                performedById: user.id,
              },
            });
          }
        } else {
          // SUPPLIER_RETURN — deduct stock
          if (previousQuantity < item.quantity) {
            throw new ApiError("Insufficient stock for supplier return", 400);
          }
          const newQuantity = previousQuantity - item.quantity;
          await tx.batch.update({
            where: { id: batch.id },
            data: {
              remainingQuantity: newQuantity,
              isActive: newQuantity > 0 ? batch.isActive : false,
            },
          });
          await tx.stockAdjustment.create({
            data: {
              batchId: batch.id,
              medicineId: item.medicineId,
              type: item.condition === "DAMAGED" ? "DAMAGED" : "RETURNED",
              quantityChange: -item.quantity,
              previousQuantity,
              newQuantity,
              reason:
                item.reason ??
                input.reason ??
                `Supplier return ${ret.returnNumber}`,
              performedById: user.id,
            },
          });
        }
      }

      if (input.type === "CUSTOMER_RETURN" && sale) {
        const allReturns = await tx.return.findMany({
          where: {
            saleId: sale.id,
            status: { in: ["COMPLETED", "APPROVED"] },
          },
          include: { items: true },
        });

        const returnedByKey = new Map<string, number>();
        for (const r of allReturns) {
          for (const ri of r.items) {
            const key = `${ri.medicineId}:${ri.batchId ?? ""}`;
            returnedByKey.set(
              key,
              (returnedByKey.get(key) ?? 0) + ri.quantity
            );
          }
        }

        const fullyReturned = sale.items.every((line) => {
          const key = `${line.medicineId}:${line.batchId}`;
          return (returnedByKey.get(key) ?? 0) >= line.quantity;
        });

        if (fullyReturned) {
          await tx.sale.update({
            where: { id: sale.id },
            data: { status: "REFUNDED" },
          });
        }
      }

      return ret;
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Return",
      entityId: created.id,
      newValues: {
        returnNumber: created.returnNumber,
        type: created.type,
        status: created.status,
        totalRefund: created.totalRefund,
        saleId: created.saleId,
        itemCount: created.items.length,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(created, undefined, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
