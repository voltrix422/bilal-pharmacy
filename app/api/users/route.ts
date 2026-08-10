import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  parsePagination,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validations/user";
import {
  parseModuleAccess,
  serializeModuleAccess,
  type ModuleAccessMap,
} from "@/lib/permissions/modules";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  isActive: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  moduleAccess: true,
} satisfies Prisma.UserSelect;

function mapUser<T extends { moduleAccess?: string | null }>(user: T) {
  return {
    ...user,
    moduleAccess: parseModuleAccess(user.moduleAccess),
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN"]);

    const { searchParams } = request.nextUrl;
    const { page, limit, skip, take, sortBy, sortOrder, search } =
      parsePagination(searchParams);

    const role = searchParams.get("role");
    const isActiveParam = searchParams.get("isActive");

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role as Prisma.EnumRoleFilter["equals"];
    }

    if (isActiveParam === "true") where.isActive = true;
    if (isActiveParam === "false") where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const allowedSort = new Set([
      "createdAt",
      "name",
      "email",
      "role",
      "lastLogin",
      "updatedAt",
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        skip,
        take,
        orderBy: { [orderField]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess(users.map(mapUser), {
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
    const actor = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const data = createUserSchema.parse(body);

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError("A user with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const access =
      data.moduleAccess && Object.keys(data.moduleAccess).length > 0
        ? serializeModuleAccess(data.moduleAccess as ModuleAccessMap)
        : null;

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: hashedPassword,
        role: data.role,
        avatar: data.avatar || null,
        isActive: data.isActive ?? true,
        moduleAccess: access,
      },
      select: userSelect,
    });

    await createAuditLog({
      userId: actor.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      newValues: mapUser(user),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(mapUser(user), undefined, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
