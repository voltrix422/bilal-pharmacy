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
import { generateSaleNumber } from "@/lib/utils/barcode";
import { calculateFEFOBatches } from "@/lib/utils/stock";
import { posCheckoutSchema } from "@/lib/validations/sale";

const POS_ROLES = ["CASHIER", "ADMIN", "PHARMACIST", "MANAGER"] as const;

type ResolvedLine = {
  medicineId: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  medicineName: string;
  requiresPrescription: boolean;
  isControlled: boolean;
  previousQuantity: number;
  newQuantity: number;
};

async function getSettingNumber(key: string, fallback: number) {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return fallback;
  const n = Number(setting.value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function resolveLines(
  items: Array<{
    medicineId: string;
    batchId?: string | null;
    quantity: number;
    unitPrice?: number;
    discount?: number;
  }>
): Promise<ResolvedLine[]> {
  const resolved: ResolvedLine[] = [];

  for (const item of items) {
    const medicine = await prisma.medicine.findUnique({
      where: { id: item.medicineId },
      include: {
        batches: {
          where: { isActive: true, remainingQuantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        },
      },
    });

    if (!medicine || !medicine.isActive) {
      throw new ApiError(`Medicine not found or inactive: ${item.medicineId}`, 400);
    }

    let remainingQty = item.quantity;
    let remainingDiscount = item.discount ?? 0;

    if (item.batchId) {
      const batch = medicine.batches.find((b) => b.id === item.batchId);
      if (!batch) {
        throw new ApiError(
          `Batch not available for ${medicine.name}`,
          400
        );
      }
      if (batch.remainingQuantity < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${medicine.name}. Available: ${batch.remainingQuantity}`,
          400
        );
      }

      const unitPrice = item.unitPrice ?? batch.sellingPrice;
      const lineDiscount = remainingDiscount;
      const total = round2(item.quantity * unitPrice - lineDiscount);

      resolved.push({
        medicineId: medicine.id,
        batchId: batch.id,
        quantity: item.quantity,
        unitPrice,
        discount: lineDiscount,
        total: Math.max(0, total),
        medicineName: medicine.name,
        requiresPrescription: medicine.requiresPrescription,
        isControlled: medicine.isControlled,
        previousQuantity: batch.remainingQuantity,
        newQuantity: batch.remainingQuantity - item.quantity,
      });
      continue;
    }

    const allocations = calculateFEFOBatches(medicine.batches, remainingQty);
    const allocated = allocations.reduce((s, a) => s + a.allocateQuantity, 0);
    if (allocated < remainingQty) {
      throw new ApiError(
        `Insufficient stock for ${medicine.name}. Available: ${allocated}`,
        400
      );
    }

    for (const alloc of allocations) {
      const unitPrice = item.unitPrice ?? alloc.sellingPrice ?? 0;
      const share =
        remainingQty > 0
          ? (alloc.allocateQuantity / item.quantity) * remainingDiscount
          : 0;
      const lineDiscount = round2(share);
      const total = round2(alloc.allocateQuantity * unitPrice - lineDiscount);

      resolved.push({
        medicineId: medicine.id,
        batchId: alloc.id,
        quantity: alloc.allocateQuantity,
        unitPrice,
        discount: lineDiscount,
        total: Math.max(0, total),
        medicineName: medicine.name,
        requiresPrescription: medicine.requiresPrescription,
        isControlled: medicine.isControlled,
        previousQuantity: alloc.remainingQuantity,
        newQuantity: alloc.remainingQuantity - alloc.allocateQuantity,
      });
    }
  }

  return resolved;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth([...POS_ROLES]);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "products";
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") || "40"), 100);

    if (type === "customers") {
      const customers = await prisma.customer.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q } },
                { phone: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : undefined,
        take: limit,
        orderBy: { name: "asc" },
      });
      return apiSuccess(customers);
    }

    // Only medicines with remaining store stock (same basis as Inventory).
    // Includes DRAP-catalog items once they have local batches with qty > 0.
    const stockBatchFilter: Prisma.BatchWhereInput = {
      isActive: true,
      remainingQuantity: { gt: 0 },
    };

    const medicineWhere: Prisma.MedicineWhereInput = {
      isActive: true,
      batches: { some: stockBatchFilter },
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { genericName: { contains: q } },
              { brand: { contains: q } },
              { sku: { contains: q } },
              { barcode: { contains: q } },
            ],
          }
        : {}),
    };

    const medicines = await prisma.medicine.findMany({
      where: medicineWhere,
      include: {
        batches: {
          where: stockBatchFilter,
          orderBy: { expiryDate: "asc" },
        },
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    const now = Date.now();
    const products = medicines
      .map((m) => {
        const totalStock = m.batches.reduce(
          (sum, b) => sum + b.remainingQuantity,
          0
        );
        // Prefer non-expired FEFO batch; fall back to soonest expiry if all expired
        const fefoBatch =
          m.batches.find((b) => new Date(b.expiryDate).getTime() > now) ??
          m.batches[0] ??
          null;
        return {
          id: m.id,
          name: m.name,
          genericName: m.genericName,
          brand: m.brand,
          sku: m.sku,
          barcode: m.barcode,
          category: m.category,
          unit: m.unit,
          strength: m.strength,
          requiresPrescription: m.requiresPrescription,
          isControlled: m.isControlled,
          imageUrl: m.imageUrl,
          totalStock,
          sellingPrice: fefoBatch?.sellingPrice ?? 0,
          batchId: fefoBatch?.id ?? null,
          batchNumber: fefoBatch?.batchNumber ?? null,
          expiryDate: fefoBatch?.expiryDate ?? null,
          batches: m.batches.map((b) => ({
            id: b.id,
            batchNumber: b.batchNumber,
            remainingQuantity: b.remainingQuantity,
            sellingPrice: b.sellingPrice,
            expiryDate: b.expiryDate,
          })),
        };
      })
      .filter((p) => p.totalStock > 0);

    // Exact barcode / SKU match first for scanner UX
    if (q) {
      products.sort((a, b) => {
        const aExact =
          a.barcode?.toLowerCase() === q.toLowerCase() ||
          a.sku.toLowerCase() === q.toLowerCase()
            ? 0
            : 1;
        const bExact =
          b.barcode?.toLowerCase() === q.toLowerCase() ||
          b.sku.toLowerCase() === q.toLowerCase()
            ? 0
            : 1;
        return aExact - bExact;
      });
    }

    return apiSuccess(products);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("POS GET error:", error);
    return apiError("Failed to load POS products", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth([...POS_ROLES]);
    const body = await request.json();
    const parsed = posCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const resolved = await resolveLines(input.items);

    const needsRx = resolved.some((l) => l.requiresPrescription);
    if (needsRx && !input.prescriptionId && !input.isHeld) {
      throw new ApiError(
        "Prescription required for one or more medicines in this sale",
        400
      );
    }

    if (input.prescriptionId) {
      const prescription = await prisma.prescription.findUnique({
        where: { id: input.prescriptionId },
        include: { items: true },
      });
      if (!prescription) {
        throw new ApiError("Prescription not found", 404);
      }
      if (
        prescription.status === "CANCELLED" ||
        prescription.status === "EXPIRED"
      ) {
        throw new ApiError("Prescription is not valid for dispensing", 400);
      }
      if (input.customerId && prescription.customerId !== input.customerId) {
        throw new ApiError(
          "Prescription does not belong to the selected customer",
          400
        );
      }

      const rxMedicineIds = new Set(
        prescription.items.map((i) => i.medicineId)
      );
      for (const line of resolved) {
        if (line.requiresPrescription && !rxMedicineIds.has(line.medicineId)) {
          throw new ApiError(
            `${line.medicineName} is not on the selected prescription`,
            400
          );
        }
      }
    }

    if (input.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer) {
        throw new ApiError("Customer not found", 404);
      }
    }

    const itemsSubtotal = round2(
      resolved.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
    );
    const itemsDiscount = round2(
      resolved.reduce((sum, l) => sum + l.discount, 0)
    );
    const orderDiscount = round2(input.discount ?? 0);

    const taxRate =
      input.tax !== undefined
        ? null
        : await getSettingNumber("tax.rate", 0);
    const taxableBase = Math.max(
      0,
      itemsSubtotal - itemsDiscount - orderDiscount
    );
    const tax =
      input.tax !== undefined
        ? round2(input.tax)
        : round2((taxableBase * (taxRate ?? 0)) / 100);

    const pointsPerUnit = await getSettingNumber("loyalty.pointsPerUnit", 1);
    const redemptionRate = await getSettingNumber(
      "loyalty.redemptionRate",
      100
    );

    let loyaltyRedeemed = input.loyaltyRedeemed ?? 0;
    let loyaltyDiscount = 0;

    if (loyaltyRedeemed > 0) {
      if (!input.customerId) {
        throw new ApiError("Customer required to redeem loyalty points", 400);
      }
      if (input.isHeld) {
        loyaltyRedeemed = 0;
      } else {
        const customer = await prisma.customer.findUnique({
          where: { id: input.customerId },
        });
        if (!customer || customer.loyaltyPoints < loyaltyRedeemed) {
          throw new ApiError("Insufficient loyalty points", 400);
        }
        loyaltyDiscount = round2(
          redemptionRate > 0 ? loyaltyRedeemed / redemptionRate : 0
        );
      }
    }

    const discountTotal = round2(
      itemsDiscount + orderDiscount + loyaltyDiscount
    );
    const total = round2(
      Math.max(0, itemsSubtotal - discountTotal + tax)
    );

    const isHeld = input.isHeld === true;
    const amountPaid = isHeld ? 0 : round2(input.amountPaid);
    if (!isHeld && amountPaid < total && input.paymentMethod === "CASH") {
      throw new ApiError("Amount paid is less than total", 400);
    }
    if (
      !isHeld &&
      amountPaid < total &&
      input.paymentMethod !== "INSURANCE"
    ) {
      // CARD / MOBILE typically pay exact; allow equal or more
      if (input.paymentMethod !== "CASH" && amountPaid + 0.001 < total) {
        throw new ApiError("Amount paid is less than total", 400);
      }
    }

    const change =
      !isHeld && input.paymentMethod === "CASH"
        ? round2(Math.max(0, amountPaid - total))
        : 0;

    const loyaltyEarned =
      !isHeld && input.customerId
        ? Math.floor(Math.max(0, total) * pointsPerUnit)
        : 0;

    let notes = input.notes ?? null;
    if (
      input.paymentMethod === "INSURANCE" &&
      input.insurancePolicyNumber
    ) {
      const policyNote = `Insurance policy: ${input.insurancePolicyNumber}`;
      notes = notes ? `${notes}\n${policyNote}` : policyNote;
    }

    const saleNumber = generateSaleNumber();
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent");

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          saleNumber,
          customerId: input.customerId ?? null,
          cashierId: user.id,
          prescriptionId: input.prescriptionId ?? null,
          status: isHeld ? "PENDING" : "COMPLETED",
          paymentMethod: input.paymentMethod,
          subtotal: itemsSubtotal,
          discount: discountTotal,
          tax,
          total,
          amountPaid,
          change,
          notes,
          loyaltyRedeemed: isHeld ? 0 : loyaltyRedeemed,
          loyaltyEarned: isHeld ? 0 : loyaltyEarned,
          isHeld,
          items: {
            create: resolved.map((l) => ({
              medicineId: l.medicineId,
              batchId: l.batchId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              total: l.total,
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
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
              isActive: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          prescription: true,
        },
      });

      if (!isHeld) {
        for (const line of resolved) {
          await tx.batch.update({
            where: { id: line.batchId },
            data: { remainingQuantity: line.newQuantity },
          });

          await tx.stockAdjustment.create({
            data: {
              batchId: line.batchId,
              medicineId: line.medicineId,
              type: "SOLD",
              quantityChange: -line.quantity,
              previousQuantity: line.previousQuantity,
              newQuantity: line.newQuantity,
              reason: `Sale ${saleNumber}`,
              performedById: user.id,
            },
          });
        }

        if (input.customerId) {
          const pointsDelta = loyaltyEarned - loyaltyRedeemed;
          await tx.customer.update({
            where: { id: input.customerId },
            data: {
              loyaltyPoints: { increment: pointsDelta },
            },
          });
        }

        if (input.prescriptionId) {
          await tx.prescription.update({
            where: { id: input.prescriptionId },
            data: { status: "DISPENSED" },
          });

          for (const line of resolved) {
            if (!line.requiresPrescription) continue;
            const rxItem = await tx.prescriptionItem.findFirst({
              where: {
                prescriptionId: input.prescriptionId,
                medicineId: line.medicineId,
              },
            });
            if (rxItem) {
              await tx.prescriptionItem.update({
                where: { id: rxItem.id },
                data: {
                  dispensedQuantity: {
                    increment: line.quantity,
                  },
                },
              });
            }
          }
        }
      }

      return created;
    });

    await createAuditLog({
      userId: user.id,
      action: isHeld ? "SALE_HOLD" : "SALE_CREATE",
      entity: "Sale",
      entityId: sale.id,
      newValues: {
        saleNumber: sale.saleNumber,
        total: sale.total,
        status: sale.status,
        isHeld: sale.isHeld,
        paymentMethod: sale.paymentMethod,
        itemCount: sale.items.length,
      } as Prisma.InputJsonValue,
      ipAddress,
      userAgent,
    });

    return apiSuccess(sale, undefined, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error("POS POST error:", error);
    return apiError("Failed to process sale", 500);
  }
}
