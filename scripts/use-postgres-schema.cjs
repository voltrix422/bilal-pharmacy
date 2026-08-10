/**
 * On Vercel, swap in the PostgreSQL Prisma schema before generate/push/seed.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "prisma");
const src = path.join(root, "schema.postgres.prisma");
const dest = path.join(root, "schema.prisma");

if (!fs.existsSync(src)) {
  console.error("Missing prisma/schema.postgres.prisma");
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log("Using PostgreSQL schema for Vercel build");
