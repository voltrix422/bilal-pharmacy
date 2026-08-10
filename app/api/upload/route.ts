import { put } from "@vercel/blob";
import { NextRequest } from "next/server";
import { apiError, apiSuccess, createAuditLog, requireAuth } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "PHARMACIST", "MANAGER"]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("File is required", 400);
    }

    if (file.size > 4 * 1024 * 1024) {
      return apiError("File must be under 4MB", 400);
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return apiError("Only JPEG, PNG, WebP, and GIF images are allowed", 400);
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return apiError(
        "Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN.",
        503
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const pathname = `pharmacy/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    await createAuditLog({
      userId: user.id,
      action: "UPLOAD",
      entity: "Blob",
      entityId: blob.pathname,
      newValues: { url: blob.url, contentType: file.type, size: file.size },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "Unauthorized" || message.startsWith("Forbidden")) {
      return apiError(message, message === "Unauthorized" ? 401 : 403);
    }
    return apiError(message, 500);
  }
}
