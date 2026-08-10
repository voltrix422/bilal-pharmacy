import { NextRequest } from "next/server";
import {
  createAuditLog,
  handleRouteError,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);

    const [
      users,
      medicines,
      batches,
      suppliers,
      customers,
      purchaseOrders,
      prescriptions,
      sales,
      returns,
      stockLocations,
      stockAdjustments,
      notifications,
      settings,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.medicine.findMany(),
      prisma.batch.findMany(),
      prisma.supplier.findMany(),
      prisma.customer.findMany(),
      prisma.purchaseOrder.findMany({
        include: { items: true },
      }),
      prisma.prescription.findMany({
        include: { items: true },
      }),
      prisma.sale.findMany({
        include: { items: true },
      }),
      prisma.return.findMany({
        include: { items: true },
      }),
      prisma.stockLocation.findMany(),
      prisma.stockAdjustment.findMany(),
      prisma.notification.findMany(),
      prisma.setting.findMany(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      version: 1,
      tables: {
        users,
        medicines,
        batches,
        suppliers,
        customers,
        purchaseOrders,
        prescriptions,
        sales,
        returns,
        stockLocations,
        stockAdjustments,
        notifications,
        settings,
        auditLogs,
      },
    };

    await createAuditLog({
      userId: user.id,
      action: "BACKUP",
      entity: "Database",
      entityId: null,
      newValues: {
        exportedAt: payload.exportedAt,
        tableCounts: Object.fromEntries(
          Object.entries(payload.tables).map(([key, rows]) => [
            key,
            Array.isArray(rows) ? rows.length : 0,
          ])
        ),
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    const filename = `bilal-pharmacy-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
