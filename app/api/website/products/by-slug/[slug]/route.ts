import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await prisma.websiteProduct.findFirst({
      where: { slug, isActive: true },
    });
    if (!product) return apiError("Product not found", 404);
    return apiSuccess(product);
  } catch (error) {
    console.error(error);
    return apiError("Failed to load product", 500);
  }
}
