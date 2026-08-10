import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ApiError,
  apiSuccess,
  createAuditLog,
  handleRouteError,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations/user";
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
    await requireAuth(["ADMIN"]);
    const id = await resolveId(context.params);

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    return apiSuccess(mapUser(user));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const actor = await requireAuth(["ADMIN"]);
    const id = await resolveId(context.params);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("User not found", 404);
    }

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    if (data.email) {
      const email = data.email.toLowerCase().trim();
      const conflict = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (conflict) {
        throw new ApiError("A user with this email already exists", 409);
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) {
      updateData.email = data.email.toLowerCase().trim();
    }
    if (data.role !== undefined) updateData.role = data.role;
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar || null;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }
    if (data.moduleAccess !== undefined) {
      updateData.moduleAccess =
        data.moduleAccess && Object.keys(data.moduleAccess).length > 0
          ? serializeModuleAccess(data.moduleAccess as ModuleAccessMap)
          : null;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      oldValues: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        avatar: existing.avatar,
        isActive: existing.isActive,
        moduleAccess: parseModuleAccess(existing.moduleAccess),
      },
      newValues: mapUser(user),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(mapUser(user));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const actor = await requireAuth(["ADMIN"]);
    const id = await resolveId(context.params);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("User not found", 404);
    }

    if (existing.id === actor.id) {
      throw new ApiError("You cannot deactivate your own account", 400);
    }

    if (!existing.isActive) {
      throw new ApiError("User is already inactive", 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });

    await createAuditLog({
      userId: actor.id,
      action: "DEACTIVATE",
      entity: "User",
      entityId: user.id,
      oldValues: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        isActive: existing.isActive,
      },
      newValues: mapUser(user),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(mapUser(user));
  } catch (error) {
    return handleRouteError(error);
  }
}
