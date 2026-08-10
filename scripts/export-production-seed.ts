/**
 * Export local SQLite operational data for Postgres / Vercel seed.
 * Skips the huge unused DRAP catalog (keeps medicines that have batches or non-DRAP SKUs).
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const batches = await prisma.batch.findMany();
  const batchMedicineIds = Array.from(new Set(batches.map((b) => b.medicineId)));

  const medicines = await prisma.medicine.findMany({
    where: {
      OR: [
        { id: { in: batchMedicineIds } },
        { NOT: { sku: { startsWith: "DRAP-" } } },
      ],
    },
  });

  const websiteProducts = await prisma.websiteProduct.findMany();
  const settings = await prisma.setting.findMany();
  const customers = await prisma.customer.findMany();
  const suppliers = await prisma.supplier.findMany();

  const dump = {
    exportedAt: new Date().toISOString(),
    users,
    medicines,
    batches,
    websiteProducts,
    settings,
    customers,
    suppliers,
  };

  const out = join(process.cwd(), "prisma", "production-seed-data.json");
  writeFileSync(out, JSON.stringify(dump, null, 2), "utf8");
  console.log(
    `Wrote ${out}: users=${users.length} medicines=${medicines.length} batches=${batches.length} web=${websiteProducts.length}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
