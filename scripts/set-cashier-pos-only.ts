import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const moduleAccess = JSON.stringify({ pos: "edit" });
  const user = await prisma.user.update({
    where: { email: "cashier@pharmacy.com" },
    data: { moduleAccess },
    select: { email: true, name: true, role: true, moduleAccess: true },
  });
  console.log("Updated:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
