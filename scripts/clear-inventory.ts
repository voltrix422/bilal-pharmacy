/**
 * Clears store stock so Inventory/POS start empty.
 * Keeps medicines catalog, users, suppliers, customers.
 *
 * Usage: npx tsx scripts/clear-inventory.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const returnItems = await prisma.returnItem.deleteMany();
  const returns = await prisma.return.deleteMany();
  const saleItems = await prisma.saleItem.deleteMany();
  const sales = await prisma.sale.deleteMany();
  const adjustments = await prisma.stockAdjustment.deleteMany();
  const batches = await prisma.batch.deleteMany();

  console.log("Cleared inventory / sales stock:");
  console.log(`  return items: ${returnItems.count}`);
  console.log(`  returns: ${returns.count}`);
  console.log(`  sale items: ${saleItems.count}`);
  console.log(`  sales: ${sales.count}`);
  console.log(`  stock adjustments: ${adjustments.count}`);
  console.log(`  batches: ${batches.count}`);
  console.log("Medicines catalog kept. Add batches to restock, then sell in POS.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
