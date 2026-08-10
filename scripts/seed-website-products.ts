/**
 * Seed website products from local medicines (MED-*) with product images.
 * Usage: npx tsx scripts/seed-website-products.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const IMAGES = [
  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1585435557343-3b348691e5f5?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1563213126-a4273aed1176?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const medicines = await prisma.medicine.findMany({
    where: { sku: { startsWith: "MED-" }, isActive: true },
    orderBy: { name: "asc" },
    take: 12,
  });

  let n = 0;
  for (const m of medicines) {
    const slug = slugify(m.name);
    const price =
      m.category === "Antibiotics"
        ? 280
        : m.category === "Vitamins"
          ? 450
          : m.unit === "CREAM"
            ? 620
            : 180;

    await prisma.websiteProduct.upsert({
      where: { slug },
      update: {
        name: m.name,
        description:
          m.description ||
          `${m.genericName ?? m.name} — available for order from Bilal Pharmacy.`,
        category: m.category,
        price,
        unitLabel: m.unit.toLowerCase(),
        requiresPrescription: m.requiresPrescription,
        isActive: true,
        medicineId: m.id,
        imageUrl: IMAGES[n % IMAGES.length],
      },
      create: {
        medicineId: m.id,
        name: m.name,
        slug,
        description:
          m.description ||
          `${m.genericName ?? m.name} — available for order from Bilal Pharmacy.`,
        category: m.category,
        price,
        unitLabel: m.unit.toLowerCase(),
        requiresPrescription: m.requiresPrescription,
        isActive: true,
        sortOrder: n,
        imageUrl: IMAGES[n % IMAGES.length],
      },
    });
    n += 1;
  }

  console.log(`Seeded ${n} website products with images`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
