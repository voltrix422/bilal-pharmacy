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
import { generatePrescriptionNumber } from "@/lib/utils/barcode";
import { prescriptionSchema } from "@/lib/validations/prescription";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const status = searchParams.get("status") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;

    const where: Prisma.PrescriptionWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumPrescriptionStatusFilter["equals"];
    }
    if (customerId) where.customerId = customerId;

    if (search) {
      where.OR = [
        { prescriptionNumber: { contains: search, mode: "insensitive" } },
        { doctorName: { contains: search, mode: "insensitive" } },
        { hospitalClinic: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const allowedSort = new Set([
      "createdAt",
      "issuedDate",
      "expiryDate",
      "status",
      "prescriptionNumber",
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
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
              allergies: true,
            },
          },
          items: {
            include: {
              medicine: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                  strength: true,
                },
              },
            },
          },
          _count: { select: { items: true, sales: true } },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return apiSuccess(prescriptions, {
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
    const user = await requireAuth(["ADMIN", "PHARMACIST"]);
    const body = await request.json();
    const data = prescriptionSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, isActive: true },
    });
    if (!customer) {
      throw new ApiError("Customer not found", 404);
    }

    const medicineIds = data.items.map((item) => item.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, isActive: true },
      select: { id: true },
    });
    if (medicines.length !== new Set(medicineIds).size) {
      throw new ApiError("One or more medicines are invalid", 400);
    }

    let prescriptionNumber = generatePrescriptionNumber();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await prisma.prescription.findUnique({
        where: { prescriptionNumber },
        select: { id: true },
      });
      if (!exists) break;
      prescriptionNumber = generatePrescriptionNumber();
    }

    const prescription = await prisma.prescription.create({
      data: {
        prescriptionNumber,
        customerId: data.customerId,
        doctorName: data.doctorName.trim(),
        doctorLicense: data.doctorLicense || null,
        hospitalClinic: data.hospitalClinic || null,
        issuedDate: data.issuedDate,
        expiryDate: data.expiryDate ?? null,
        status: data.status ?? "PENDING",
        imageUrl: data.imageUrl || null,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration || null,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { medicine: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Prescription",
      entityId: prescription.id,
      newValues: {
        id: prescription.id,
        prescriptionNumber: prescription.prescriptionNumber,
        status: prescription.status,
        customerId: prescription.customerId,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(prescription, undefined, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
