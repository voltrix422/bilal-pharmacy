import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import {
  apiSuccess,
  createAuditLog,
  handleRouteError,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations/supplier";

function emptyToNull(value: string | null | undefined) {
  if (value == null || value === "") return null;
  return value;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const isActiveParam = searchParams.get("isActive");
    const where: Prisma.SupplierWhereInput = {};

    if (isActiveParam === "true") where.isActive = true;
    if (isActiveParam === "false") where.isActive = false;
    if (isActiveParam == null) where.isActive = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const allowedSort = new Set([
      "createdAt",
      "name",
      "rating",
      "updatedAt",
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { [orderField]: sortOrder },
        include: {
          _count: { select: { purchaseOrders: true, batches: true } },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return apiSuccess(suppliers, {
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
    const data = supplierSchema.parse(body);

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactPerson: emptyToNull(data.contactPerson),
        email: emptyToNull(data.email)?.toLowerCase() ?? null,
        phone: emptyToNull(data.phone),
        address: emptyToNull(data.address),
        city: emptyToNull(data.city),
        country: emptyToNull(data.country),
        taxId: emptyToNull(data.taxId),
        paymentTerms: emptyToNull(data.paymentTerms),
        isActive: data.isActive ?? true,
        rating: data.rating ?? 0,
        notes: emptyToNull(data.notes),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Supplier",
      entityId: supplier.id,
      newValues: supplier,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(supplier, undefined, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
