/**
 * Upsert exported operational data into the current DATABASE_URL (Postgres on Vercel).
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Dump = {
  users: Array<Record<string, unknown>>;
  medicines: Array<Record<string, unknown>>;
  batches: Array<Record<string, unknown>>;
  websiteProducts: Array<Record<string, unknown>>;
  settings: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  suppliers: Array<Record<string, unknown>>;
};

function dates<T extends Record<string, unknown>>(row: T, keys: string[]): T {
  const out = { ...row };
  for (const key of keys) {
    if (out[key] != null) out[key] = new Date(String(out[key]));
  }
  return out;
}

async function main() {
  const path = join(process.cwd(), "prisma", "production-seed-data.json");
  if (!existsSync(path)) {
    console.log("No production-seed-data.json — falling back to prisma/seed.ts");
    const { execSync } = await import("child_process");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
    return;
  }

  const dump = JSON.parse(readFileSync(path, "utf8")) as Dump;
  console.log("Seeding production dump…");

  for (const raw of dump.users ?? []) {
    const u = dates(raw, ["createdAt", "updatedAt", "lastLogin"]);
    await prisma.user.upsert({
      where: { email: String(u.email) },
      update: {
        password: (u.password as string) ?? undefined,
        name: String(u.name),
        role: u.role as never,
        avatar: (u.avatar as string) ?? null,
        phone: (u.phone as string) ?? null,
        address: (u.address as string) ?? null,
        city: (u.city as string) ?? null,
        moduleAccess: (u.moduleAccess as string) ?? null,
        isActive: Boolean(u.isActive),
        lastLogin: (u.lastLogin as Date) ?? null,
      },
      create: {
        id: String(u.id),
        email: String(u.email),
        password: (u.password as string) ?? null,
        name: String(u.name),
        role: u.role as never,
        avatar: (u.avatar as string) ?? null,
        phone: (u.phone as string) ?? null,
        address: (u.address as string) ?? null,
        city: (u.city as string) ?? null,
        moduleAccess: (u.moduleAccess as string) ?? null,
        isActive: Boolean(u.isActive),
        createdAt: u.createdAt as Date,
        updatedAt: u.updatedAt as Date,
        lastLogin: (u.lastLogin as Date) ?? null,
      },
    });
  }

  for (const raw of dump.medicines ?? []) {
    const m = dates(raw, ["createdAt", "updatedAt"]);
    await prisma.medicine.upsert({
      where: { sku: String(m.sku) },
      update: {
        name: String(m.name),
        genericName: (m.genericName as string) ?? null,
        brand: (m.brand as string) ?? null,
        category: String(m.category),
        description: (m.description as string) ?? null,
        barcode: (m.barcode as string) ?? null,
        unit: m.unit as never,
        strength: (m.strength as string) ?? null,
        manufacturer: (m.manufacturer as string) ?? null,
        requiresPrescription: Boolean(m.requiresPrescription),
        isControlled: Boolean(m.isControlled),
        minStockLevel: Number(m.minStockLevel ?? 0),
        reorderPoint: Number(m.reorderPoint ?? 0),
        imageUrl: (m.imageUrl as string) ?? null,
        isActive: Boolean(m.isActive),
      },
      create: {
        id: String(m.id),
        name: String(m.name),
        genericName: (m.genericName as string) ?? null,
        brand: (m.brand as string) ?? null,
        category: String(m.category),
        description: (m.description as string) ?? null,
        sku: String(m.sku),
        barcode: (m.barcode as string) ?? null,
        unit: m.unit as never,
        strength: (m.strength as string) ?? null,
        manufacturer: (m.manufacturer as string) ?? null,
        requiresPrescription: Boolean(m.requiresPrescription),
        isControlled: Boolean(m.isControlled),
        minStockLevel: Number(m.minStockLevel ?? 0),
        reorderPoint: Number(m.reorderPoint ?? 0),
        imageUrl: (m.imageUrl as string) ?? null,
        isActive: Boolean(m.isActive),
        createdAt: m.createdAt as Date,
        updatedAt: m.updatedAt as Date,
      },
    });
  }

  // Remap medicine ids: dump batch.medicineId may differ if medicine was upserted by sku
  const medBySku = await prisma.medicine.findMany({
    select: { id: true, sku: true },
  });
  const skuToId = new Map(medBySku.map((m) => [m.sku, m.id]));
  const dumpMedIdToSku = new Map(
    (dump.medicines ?? []).map((m) => [String(m.id), String(m.sku)])
  );

  for (const raw of dump.suppliers ?? []) {
    const s = dates(raw, ["createdAt", "updatedAt"]);
    await prisma.supplier.upsert({
      where: { id: String(s.id) },
      update: {
        name: String(s.name),
        contactPerson: (s.contactPerson as string) ?? null,
        email: (s.email as string) ?? null,
        phone: (s.phone as string) ?? null,
        address: (s.address as string) ?? null,
        city: (s.city as string) ?? null,
        country: (s.country as string) ?? null,
        isActive: Boolean(s.isActive ?? true),
      },
      create: {
        id: String(s.id),
        name: String(s.name),
        contactPerson: (s.contactPerson as string) ?? null,
        email: (s.email as string) ?? null,
        phone: (s.phone as string) ?? null,
        address: (s.address as string) ?? null,
        city: (s.city as string) ?? null,
        country: (s.country as string) ?? null,
        isActive: Boolean(s.isActive ?? true),
        createdAt: s.createdAt as Date,
        updatedAt: s.updatedAt as Date,
      },
    });
  }

  for (const raw of dump.customers ?? []) {
    const c = dates(raw, ["createdAt", "updatedAt", "dateOfBirth"]);
    await prisma.customer.upsert({
      where: { id: String(c.id) },
      update: {
        name: String(c.name),
        phone: (c.phone as string) ?? null,
        email: (c.email as string) ?? null,
        address: (c.address as string) ?? null,
        isActive: Boolean(c.isActive ?? true),
      },
      create: {
        id: String(c.id),
        name: String(c.name),
        phone: (c.phone as string) ?? null,
        email: (c.email as string) ?? null,
        address: (c.address as string) ?? null,
        isActive: Boolean(c.isActive ?? true),
        createdAt: c.createdAt as Date,
        updatedAt: c.updatedAt as Date,
      },
    });
  }

  for (const raw of dump.batches ?? []) {
    const b = dates(raw, ["createdAt", "updatedAt", "expiryDate", "receivedDate"]);
    const dumpMedId = String(b.medicineId);
    const sku = dumpMedIdToSku.get(dumpMedId);
    const medicineId = (sku && skuToId.get(sku)) || dumpMedId;

    await prisma.batch.upsert({
      where: {
        medicineId_batchNumber: {
          medicineId,
          batchNumber: String(b.batchNumber),
        },
      },
      update: {
        quantity: Number(b.quantity),
        remainingQuantity: Number(b.remainingQuantity),
        unitCost: Number(b.unitCost),
        sellingPrice: Number(b.sellingPrice),
        expiryDate: b.expiryDate as Date,
        receivedDate: (b.receivedDate as Date) ?? new Date(),
        supplierId: (b.supplierId as string) ?? null,
        locationId: (b.locationId as string) ?? null,
        isActive: Boolean(b.isActive),
      },
      create: {
        id: String(b.id),
        medicineId,
        batchNumber: String(b.batchNumber),
        quantity: Number(b.quantity),
        remainingQuantity: Number(b.remainingQuantity),
        unitCost: Number(b.unitCost),
        sellingPrice: Number(b.sellingPrice),
        expiryDate: b.expiryDate as Date,
        receivedDate: (b.receivedDate as Date) ?? new Date(),
        supplierId: (b.supplierId as string) ?? null,
        locationId: (b.locationId as string) ?? null,
        isActive: Boolean(b.isActive),
        createdAt: b.createdAt as Date,
        updatedAt: b.updatedAt as Date,
      },
    });
  }

  for (const raw of dump.websiteProducts ?? []) {
    const w = dates(raw, ["createdAt", "updatedAt"]);
    await prisma.websiteProduct.upsert({
      where: { slug: String(w.slug) },
      update: {
        medicineId: (w.medicineId as string) ?? null,
        name: String(w.name),
        description: (w.description as string) ?? null,
        category: String(w.category),
        price: Number(w.price),
        compareAtPrice: (w.compareAtPrice as number) ?? null,
        imageUrl: (w.imageUrl as string) ?? null,
        unitLabel: String(w.unitLabel ?? "pack"),
        requiresPrescription: Boolean(w.requiresPrescription),
        isActive: Boolean(w.isActive),
        sortOrder: Number(w.sortOrder ?? 0),
      },
      create: {
        id: String(w.id),
        medicineId: (w.medicineId as string) ?? null,
        name: String(w.name),
        slug: String(w.slug),
        description: (w.description as string) ?? null,
        category: String(w.category),
        price: Number(w.price),
        compareAtPrice: (w.compareAtPrice as number) ?? null,
        imageUrl: (w.imageUrl as string) ?? null,
        unitLabel: String(w.unitLabel ?? "pack"),
        requiresPrescription: Boolean(w.requiresPrescription),
        isActive: Boolean(w.isActive),
        sortOrder: Number(w.sortOrder ?? 0),
        createdAt: w.createdAt as Date,
        updatedAt: w.updatedAt as Date,
      },
    });
  }

  for (const raw of dump.settings ?? []) {
    const s = dates(raw, ["updatedAt"]);
    await prisma.setting.upsert({
      where: { key: String(s.key) },
      update: {
        value: String(s.value),
        category: String(s.category ?? "general"),
        description: (s.description as string) ?? null,
        updatedById: (s.updatedById as string) ?? null,
      },
      create: {
        id: String(s.id),
        key: String(s.key),
        value: String(s.value),
        category: String(s.category ?? "general"),
        description: (s.description as string) ?? null,
        updatedById: (s.updatedById as string) ?? null,
      },
    });
  }

  console.log("Production seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
