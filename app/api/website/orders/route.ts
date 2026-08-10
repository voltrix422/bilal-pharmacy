import { NextRequest } from "next/server";
import type { OnlineOrderStatus, Prisma } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

function orderNumber() {
  const n = Date.now().toString().slice(-8);
  return `WEB-${n}`;
}

export async function GET(request: NextRequest) {
  try {
    const mine = request.nextUrl.searchParams.get("mine") === "true";

    if (mine) {
      const user = await requireAuth(["CUSTOMER"]);
      const orders = await prisma.onlineOrder.findMany({
        where: { customerUserId: user.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return apiSuccess(orders);
    }

    await requireAuth(["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"]);
    const status = request.nextUrl.searchParams.get("status")?.trim();
    const q = (request.nextUrl.searchParams.get("q") || "").trim();

    const where: Prisma.OnlineOrderWhereInput = {};
    if (status) where.status = status as OnlineOrderStatus;
    if (q) {
      where.OR = [
        { orderNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerPhone: { contains: q } },
        { customerEmail: { contains: q } },
      ];
    }

    const orders = await prisma.onlineOrder.findMany({
      where,
      include: {
        items: true,
        customerUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return apiSuccess(orders);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error(error);
    return apiError("Failed to load orders", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["CUSTOMER"]);
    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile) return apiError("Account not found", 404);

    const body = await request.json();
    const customerName = String(body.customerName || profile.name || "").trim();
    const customerPhone = String(body.customerPhone || profile.phone || "").trim();
    const address = String(body.address || profile.address || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerName || !customerPhone || !address) {
      return apiError("Name, phone, and address are required", 400);
    }
    if (items.length === 0) {
      return apiError("Cart is empty", 400);
    }

    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await prisma.websiteProduct.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    for (const raw of items) {
      const product = byId.get(String(raw.productId));
      const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
      if (!product) {
        return apiError("One or more products are unavailable", 400);
      }
      lines.push({
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price,
        total: product.price * quantity,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const deliveryFee = subtotal >= 2000 ? 0 : 150;
    const total = subtotal + deliveryFee;

    const order = await prisma.onlineOrder.create({
      data: {
        orderNumber: orderNumber(),
        customerUserId: user.id,
        customerName,
        customerPhone,
        customerEmail:
          body.customerEmail
            ? String(body.customerEmail).trim()
            : profile.email,
        address,
        city: body.city
          ? String(body.city).trim()
          : profile.city,
        notes: body.notes ? String(body.notes).trim() : null,
        subtotal,
        deliveryFee,
        total,
        items: { create: lines },
      },
      include: { items: true },
    });

    // Keep profile details current from checkout
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: customerName,
        phone: customerPhone,
        address,
        city: body.city ? String(body.city).trim() : profile.city,
      },
    });

    return apiSuccess(order, undefined, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error(error);
    return apiError("Failed to place order", 500);
  }
}
