import { NextResponse } from "next/server";
import type { Role, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

export async function requireAuth(roles?: Role[]) {
  const user = await getSessionUser();

  if (!user?.id) {
    throw new ApiError("Unauthorized", 401);
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    throw new ApiError("Forbidden", 403);
  }

  return user;
}

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function apiError(
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

interface CreateAuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      oldValues: oldValues ?? undefined,
      newValues: newValues ?? undefined,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return apiError(error.message, error.status, error.details);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ZodError"
  ) {
    const zodError = error as unknown as {
      flatten?: () => unknown;
      errors?: unknown;
    };
    return apiError(
      "Validation failed",
      400,
      typeof zodError.flatten === "function" ? zodError.flatten() : zodError.errors
    );
  }

  console.error(error);
  return apiError("Internal server error", 500);
}

export function parsePagination(searchParams: URLSearchParams | Record<string, string | string[] | undefined>) {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const pageRaw = Number(get("page") ?? "1");
  const limitRaw = Number(get("limit") ?? "20");
  const sortBy = get("sortBy") ?? "createdAt";
  const sortOrder = (get("sortOrder") ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const search = (get("search") ?? get("q") ?? "").trim();

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 20;
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
    sortBy,
    sortOrder: sortOrder as "asc" | "desc",
    search,
  };
}
