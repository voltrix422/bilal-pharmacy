import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const counts = {
    users: await p.user.count(),
    medicines: await p.medicine.count(),
    batches: await p.batch.count(),
    webProducts: await p.websiteProduct.count(),
    sales: await p.sale.count(),
    customers: await p.customer.count(),
    suppliers: await p.supplier.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
}

main().finally(() => p.$disconnect());
