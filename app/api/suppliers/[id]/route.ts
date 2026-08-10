import { NextRequest } from "next/server";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { supplierUpdateSchema } from "@/lib/validations/supplier";

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
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    const id = await resolveId(context.params);

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            items: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { purchaseOrders: true, batches: true },
        },
      },
    });

    if (!supplier) {
      throw new ApiError("Supplier not found", 404);
    }

    const openStatuses = [
      "DRAFT",
      "SENT",
      "CONFIRMED",
      "PARTIALLY_RECEIVED",
    ] as const;

    const payables = {
      totalOrdered: supplier.purchaseOrders.reduce(
        (sum, po) => sum + po.totalAmount,
        0
      ),
      openOrders: supplier.purchaseOrders.filter((po) =>
        (openStatuses as readonly string[]).includes(po.status)
      ).length,
      openAmount: supplier.purchaseOrders
        .filter((po) => (openStatuses as readonly string[]).includes(po.status))
        .reduce((sum, po) => sum + po.totalAmount, 0),
      receivedOrders: supplier.purchaseOrders.filter(
        (po) => po.status === "RECEIVED" || po.status === "PARTIALLY_RECEIVED"
      ).length,
      paymentTerms: supplier.paymentTerms,
    };

    return apiSuccess({ ...supplier, payables });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    const id = await resolveId(context.params);
    const existing = await prisma.supplier.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError("Supplier not found", 404);
    }

    const body = await request.json();
    const data = supplierUpdateSchema.parse(body);

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contactPerson !== undefined
          ? { contactPerson: emptyToNull(data.contactPerson) }
          : {}),
        ...(data.email !== undefined
          ? { email: emptyToNull(data.email)?.toLowerCase() ?? null }
          : {}),
        ...(data.phone !== undefined ? { phone: emptyToNull(data.phone) } : {}),
        ...(data.address !== undefined
          ? { address: emptyToNull(data.address) }
          : {}),
        ...(data.city !== undefined ? { city: emptyToNull(data.city) } : {}),
        ...(data.country !== undefined
          ? { country: emptyToNull(data.country) }
          : {}),
        ...(data.taxId !== undefined ? { taxId: emptyToNull(data.taxId) } : {}),
        ...(data.paymentTerms !== undefined
          ? { paymentTerms: emptyToNull(data.paymentTerms) }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.notes !== undefined ? { notes: emptyToNull(data.notes) } : {}),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Supplier",
      entityId: supplier.id,
      oldValues: existing,
      newValues: supplier,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(supplier);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    const id = await resolveId(context.params);
    const existing = await prisma.supplier.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError("Supplier not found", 404);
    }

    if (!existing.isActive) {
      throw new ApiError("Supplier is already inactive", 400);
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: user.id,
      action: "SOFT_DELETE",
      entity: "Supplier",
      entityId: supplier.id,
      oldValues: existing,
      newValues: supplier,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(supplier);
  } catch (error) {
    return handleRouteError(error);
  }
}
