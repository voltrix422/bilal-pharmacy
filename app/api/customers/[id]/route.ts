import { NextRequest } from "next/server";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { customerUpdateSchema } from "@/lib/validations/customer";

function emptyToNull(value: string | null | undefined) {
  if (value == null || value === "") return null;
  return value;
}

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: RouteContext["params"]) {
  const resolved = await Promise.resolve(params);
  return resolved.id;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth();
    const id = await resolveId(context.params);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
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
            cashier: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            items: {
              include: {
                medicine: {
                  select: { id: true, name: true, sku: true, unit: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            sales: true,
            prescriptions: true,
            returns: true,
          },
        },
      },
    });

    if (!customer) {
      throw new ApiError("Customer not found", 404);
    }

    const loyaltySummary = {
      points: customer.loyaltyPoints,
      outstandingBalance: customer.outstandingBalance,
      totalPurchases: customer._count.sales,
      totalPrescriptions: customer._count.prescriptions,
      lifetimeSpend: customer.sales.reduce((sum, sale) => sum + sale.total, 0),
      lifetimeEarned: customer.sales.reduce(
        (sum, sale) => sum + sale.loyaltyEarned,
        0
      ),
      lifetimeRedeemed: customer.sales.reduce(
        (sum, sale) => sum + sale.loyaltyRedeemed,
        0
      ),
    };

    return apiSuccess({ ...customer, loyaltySummary });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(["ADMIN", "PHARMACIST"]);
    const id = await resolveId(context.params);
    const existing = await prisma.customer.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError("Customer not found", 404);
    }

    const body = await request.json();
    const data = customerUpdateSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.email !== undefined
          ? { email: emptyToNull(data.email)?.toLowerCase() ?? null }
          : {}),
        ...(data.phone !== undefined ? { phone: emptyToNull(data.phone) } : {}),
        ...(data.dateOfBirth !== undefined
          ? { dateOfBirth: data.dateOfBirth }
          : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.address !== undefined
          ? { address: emptyToNull(data.address) }
          : {}),
        ...(data.allergies !== undefined
          ? { allergies: emptyToNull(data.allergies) }
          : {}),
        ...(data.medicalHistory !== undefined
          ? { medicalHistory: emptyToNull(data.medicalHistory) }
          : {}),
        ...(data.insuranceProvider !== undefined
          ? { insuranceProvider: emptyToNull(data.insuranceProvider) }
          : {}),
        ...(data.insuranceNumber !== undefined
          ? { insuranceNumber: emptyToNull(data.insuranceNumber) }
          : {}),
        ...(data.loyaltyPoints !== undefined
          ? { loyaltyPoints: data.loyaltyPoints }
          : {}),
        ...(data.outstandingBalance !== undefined
          ? { outstandingBalance: data.outstandingBalance }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Customer",
      entityId: customer.id,
      oldValues: existing,
      newValues: customer,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(customer);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(["ADMIN", "PHARMACIST"]);
    const id = await resolveId(context.params);
    const existing = await prisma.customer.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError("Customer not found", 404);
    }

    if (!existing.isActive) {
      throw new ApiError("Customer is already inactive", 400);
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: user.id,
      action: "SOFT_DELETE",
      entity: "Customer",
      entityId: customer.id,
      oldValues: existing,
      newValues: customer,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(customer);
  } catch (error) {
    return handleRouteError(error);
  }
}
