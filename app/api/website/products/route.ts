import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  ApiError,
  apiError,
  apiSuccess,
  requireAuth,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const publicOnly = searchParams.get("public") === "true";
    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim();

    if (!publicOnly) {
      await requireAuth(["ADMIN", "MANAGER", "PHARMACIST"]);
    }

    const where: Prisma.WebsiteProductWhereInput = {};
    if (publicOnly) where.isActive = true;
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { category: { contains: q } },
      ];
    }

    const products = await prisma.websiteProduct.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return apiSuccess(products);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error(error);
    return apiError("Failed to load website products", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);
    const body = await request.json();

    const name = String(body.name || "").trim();
    const category = String(body.category || "General").trim();
    const price = Number(body.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      return apiError("Name and valid price are required", 400);
    }

    let slug = String(body.slug || slugify(name));
    const existing = await prisma.websiteProduct.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const product = await prisma.websiteProduct.create({
      data: {
        name,
        slug,
        category,
        price,
        description: body.description ? String(body.description) : null,
        unitLabel: body.unitLabel ? String(body.unitLabel) : "pack",
        requiresPrescription: Boolean(body.requiresPrescription),
        isActive: body.isActive !== false,
        medicineId: body.medicineId ? String(body.medicineId) : null,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });

    return apiSuccess(product, undefined, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status, error.details);
    }
    console.error(error);
    return apiError("Failed to create product", 500);
  }
}
