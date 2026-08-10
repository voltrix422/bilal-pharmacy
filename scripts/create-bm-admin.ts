import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("passwordbmADMIN", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@bm.com" },
    update: {
      password,
      name: "Bilal Admin",
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@bm.com",
      password,
      name: "Bilal Admin",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`Created/updated: ${user.email} (${user.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
