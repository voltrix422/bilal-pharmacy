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
import { customerSchema } from "@/lib/validations/customer";

function emptyToNull(value: string | null | undefined) {
  if (value == null || value === "") return null;
  return value;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const isActiveParam = searchParams.get("isActive");
    const where: Prisma.CustomerWhereInput = {};

    if (isActiveParam === "true") where.isActive = true;
    if (isActiveParam === "false") where.isActive = false;
    if (isActiveParam == null) where.isActive = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const allowedSort = new Set([
      "createdAt",
      "name",
      "loyaltyPoints",
      "outstandingBalance",
      "updatedAt",
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { [orderField]: sortOrder },
      }),
      prisma.customer.count({ where }),
    ]);

    return apiSuccess(customers, {
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
    const data = customerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        email: emptyToNull(data.email)?.toLowerCase() ?? null,
        phone: emptyToNull(data.phone),
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        address: emptyToNull(data.address),
        allergies: emptyToNull(data.allergies),
        medicalHistory: emptyToNull(data.medicalHistory),
        insuranceProvider: emptyToNull(data.insuranceProvider),
        insuranceNumber: emptyToNull(data.insuranceNumber),
        loyaltyPoints: data.loyaltyPoints ?? 0,
        outstandingBalance: data.outstandingBalance ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      newValues: customer,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(customer, undefined, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
