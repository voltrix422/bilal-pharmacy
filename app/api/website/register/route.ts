import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const city = body.city ? String(body.city).trim() : null;

    if (!name || !email || !password || !phone || !address) {
      return apiError("Name, email, password, phone, and address are required", 400);
    }
    if (password.length < 6) {
      return apiError("Password must be at least 6 characters", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("Enter a valid email", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("An account with this email already exists", 409);
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone,
        address,
        city,
        role: "CUSTOMER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        role: true,
      },
    });

    return apiSuccess(user, undefined, 201);
  } catch (error) {
    console.error(error);
    return apiError("Failed to create account", 500);
  }
}
