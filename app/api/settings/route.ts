import { NextRequest } from "next/server";
import {
  apiSuccess,
  createAuditLog,
  handleRouteError,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { settingsBulkSchema } from "@/lib/validations/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);

    const settings = await prisma.setting.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    return apiSuccess({ settings, map });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "MANAGER"]);
    const body = await request.json();
    const parsed = settingsBulkSchema.parse(body);

    const keys = parsed.settings.map((s) => s.key);
    const existing = await prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    const existingMap = Object.fromEntries(existing.map((s) => [s.key, s]));

    const updated = await prisma.$transaction(
      parsed.settings.map((item) =>
        prisma.setting.upsert({
          where: { key: item.key },
          create: {
            key: item.key,
            value: item.value,
            category: item.category ?? "general",
            description: item.description,
            updatedById: user.id,
          },
          update: {
            value: item.value,
            ...(item.category ? { category: item.category } : {}),
            ...(item.description !== undefined
              ? { description: item.description }
              : {}),
            updatedById: user.id,
          },
        })
      )
    );

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Setting",
      oldValues: existingMap,
      newValues: Object.fromEntries(updated.map((s) => [s.key, s.value])),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess({ settings: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
