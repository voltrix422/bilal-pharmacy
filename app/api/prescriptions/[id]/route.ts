import { NextRequest } from "next/server";
import type { PrescriptionStatus } from "@prisma/client";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  dispensePrescriptionSchema,
  prescriptionUpdateSchema,
} from "@/lib/validations/prescription";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: RouteContext["params"]) {
  const resolved = await Promise.resolve(params);
  return resolved.id;
}

const STATUS_FLOW: Record<PrescriptionStatus, PrescriptionStatus[]> = {
  PENDING: ["VERIFIED", "CANCELLED", "EXPIRED"],
  VERIFIED: ["DISPENSED", "CANCELLED", "EXPIRED", "PENDING"],
  DISPENSED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    const id = await resolveId(context.params);

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            medicine: {
              include: {
                batches: {
                  where: {
                    isActive: true,
                    remainingQuantity: { gt: 0 },
                    expiryDate: { gt: new Date() },
                  },
                  orderBy: { expiryDate: "asc" },
                  include: {
                    location: true,
                  },
                },
              },
            },
          },
        },
        sales: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!prescription) {
      throw new ApiError("Prescription not found", 404);
    }

    return apiSuccess(prescription);
  } catch (error) {
    return handleRouteError(error);
  }
}

async function dispensePrescription(
  request: NextRequest,
  prescriptionId: string,
  userId: string,
  body: unknown
) {
  const payload = dispensePrescriptionSchema.parse(body);

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { items: true },
  });

  if (!prescription) {
    throw new ApiError("Prescription not found", 404);
  }

  if (prescription.status !== "VERIFIED" && prescription.status !== "PENDING") {
    throw new ApiError(
      "Only pending or verified prescriptions can be dispensed",
      400
    );
  }

  if (prescription.status === "PENDING") {
    throw new ApiError("Prescription must be verified before dispensing", 400);
  }

  const itemMap = new Map(prescription.items.map((item) => [item.id, item]));

  const result = await prisma.$transaction(async (tx) => {
    for (const line of payload.items) {
      const rxItem = itemMap.get(line.itemId);
      if (!rxItem) {
        throw new ApiError(`Prescription item ${line.itemId} not found`, 400);
      }

      const remaining = rxItem.quantity - rxItem.dispensedQuantity;
      if (line.dispensedQuantity > remaining) {
        throw new ApiError(
          `Cannot dispense more than remaining quantity for item ${rxItem.id}`,
          400
        );
      }

      const batch = await tx.batch.findUnique({
        where: { id: line.batchId },
      });

      if (!batch || !batch.isActive) {
        throw new ApiError(`Batch ${line.batchId} not found`, 404);
      }

      if (batch.medicineId !== rxItem.medicineId) {
        throw new ApiError("Selected batch does not match medicine", 400);
      }

      if (batch.remainingQuantity < line.dispensedQuantity) {
        throw new ApiError(
          `Insufficient stock in batch ${batch.batchNumber}`,
          400
        );
      }

      if (batch.expiryDate < new Date()) {
        throw new ApiError(`Batch ${batch.batchNumber} is expired`, 400);
      }

      const previousQuantity = batch.remainingQuantity;
      const newQuantity = previousQuantity - line.dispensedQuantity;

      await tx.batch.update({
        where: { id: batch.id },
        data: { remainingQuantity: newQuantity },
      });

      await tx.stockAdjustment.create({
        data: {
          batchId: batch.id,
          medicineId: batch.medicineId,
          type: "SOLD",
          quantityChange: -line.dispensedQuantity,
          previousQuantity,
          newQuantity,
          reason: `Dispensed for prescription ${prescription.prescriptionNumber}`,
          performedById: userId,
        },
      });

      await tx.prescriptionItem.update({
        where: { id: rxItem.id },
        data: {
          dispensedQuantity: rxItem.dispensedQuantity + line.dispensedQuantity,
        },
      });

      rxItem.dispensedQuantity += line.dispensedQuantity;
    }

    const refreshedItems = await tx.prescriptionItem.findMany({
      where: { prescriptionId },
    });
    const fullyDispensed = refreshedItems.every(
      (item) => item.dispensedQuantity >= item.quantity
    );

    const updated = await tx.prescription.update({
      where: { id: prescriptionId },
      data: { status: fullyDispensed ? "DISPENSED" : "VERIFIED" },
      include: {
        customer: true,
        items: { include: { medicine: true } },
      },
    });

    return updated;
  });

  await createAuditLog({
    userId,
    action: "DISPENSE",
    entity: "Prescription",
    entityId: prescriptionId,
    oldValues: { status: prescription.status },
    newValues: {
      status: result.status,
      items: payload.items,
    },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return result;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(["ADMIN", "PHARMACIST"]);
    const id = await resolveId(context.params);
    const body = await request.json();

    if (body?.action === "dispense") {
      const dispensed = await dispensePrescription(
        request,
        id,
        user.id,
        { items: body.items }
      );
      return apiSuccess(dispensed);
    }

    const existing = await prisma.prescription.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new ApiError("Prescription not found", 404);
    }

    const data = prescriptionUpdateSchema.parse(body);

    if (data.status && data.status !== existing.status) {
      const allowed = STATUS_FLOW[existing.status] ?? [];
      if (!allowed.includes(data.status)) {
        throw new ApiError(
          `Cannot transition from ${existing.status} to ${data.status}`,
          400
        );
      }
    }

    if (existing.status === "DISPENSED") {
      throw new ApiError("Dispensed prescriptions cannot be edited", 400);
    }

    const prescription = await prisma.$transaction(async (tx) => {
      if (data.items) {
        const medicineIds = data.items.map((item) => item.medicineId);
        const medicines = await tx.medicine.findMany({
          where: { id: { in: medicineIds }, isActive: true },
          select: { id: true },
        });
        if (medicines.length !== new Set(medicineIds).size) {
          throw new ApiError("One or more medicines are invalid", 400);
        }

        await tx.prescriptionItem.deleteMany({
          where: { prescriptionId: id },
        });
        await tx.prescriptionItem.createMany({
          data: data.items.map((item) => ({
            prescriptionId: id,
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration || null,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        });
      }

      return tx.prescription.update({
        where: { id },
        data: {
          ...(data.doctorName !== undefined
            ? { doctorName: data.doctorName.trim() }
            : {}),
          ...(data.doctorLicense !== undefined
            ? { doctorLicense: data.doctorLicense || null }
            : {}),
          ...(data.hospitalClinic !== undefined
            ? { hospitalClinic: data.hospitalClinic || null }
            : {}),
          ...(data.issuedDate !== undefined
            ? { issuedDate: data.issuedDate }
            : {}),
          ...(data.expiryDate !== undefined
            ? { expiryDate: data.expiryDate }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.imageUrl !== undefined
            ? { imageUrl: data.imageUrl || null }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        },
        include: {
          customer: true,
          items: { include: { medicine: true } },
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Prescription",
      entityId: prescription.id,
      oldValues: {
        status: existing.status,
        doctorName: existing.doctorName,
      },
      newValues: {
        status: prescription.status,
        doctorName: prescription.doctorName,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(prescription);
  } catch (error) {
    return handleRouteError(error);
  }
}
