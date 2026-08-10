/**
 * Seed up to N DRAP products from cached drap-products.json (default 20000).
 * Usage: npx tsx scripts/seed-drap-limit.ts
 */
import { PrismaClient, MedicineUnit } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const CACHE_PATH = path.join(__dirname, "drap-products.json");
const LIMIT = Number(process.env.DRAP_IMPORT_LIMIT || 20000);

type DrapProduct = {
  registrationNo: string;
  brandName: string;
  genericName?: string | null;
  companyName?: string | null;
  dosageForm?: string | null;
};

function mapUnit(name: string, dosageForm?: string | null): MedicineUnit {
  const s = `${dosageForm ?? ""} ${name}`.toLowerCase();
  if (s.includes("capsule")) return "CAPSULE";
  if (s.includes("syrup") || s.includes("suspension") || s.includes("elixir")) return "SYRUP";
  if (s.includes("injection") || s.includes("injectable") || s.includes("infusion")) return "INJECTION";
  if (s.includes("cream") || s.includes("ointment") || s.includes("gel") || s.includes("lotion")) return "CREAM";
  if (s.includes("drop")) return "DROPS";
  if (s.includes("inhaler") || s.includes("nebule") || s.includes("aerosol")) return "INHALER";
  if (s.includes("patch")) return "PATCH";
  if (s.includes("suppositor")) return "SUPPOSITORY";
  if (s.includes("tablet") || s.includes("tab ")) return "TABLET";
  return "OTHER";
}

function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/amox|cipro|azith|cefix|cef|peni|erythro|levof|oflox|metro|flagyl|augment/.test(n)) return "Antibiotics";
  if (/para|ibup|diclo|naprox|aspir|tramadol|bruf|panadol|disprin|analges/.test(n)) return "Analgesics";
  if (/amlo|ateno|losar|valsar|telmi|enalap|ramip|bisopr|carved|hypert/.test(n)) return "Antihypertensives";
  if (/vit|folic|ascorb|zinc|calci|multivit|neurobion/.test(n)) return "Vitamins";
  if (/metformin|glime|gliclaz|insulin|gluco|diabet/.test(n)) return "Antidiabetics";
  if (/cetir|lorat|fexof|montel|antihist|allegra|xyzal/.test(n)) return "Antihistamines";
  if (/omep|panto|esome|ranit|domper|ondans|gast|laxat|antacid/.test(n)) return "Gastrointestinal";
  if (/cream|oint|derm|fung|clotrim|betameth|momet/.test(n)) return "Dermatology";
  return "DRAP Registered";
}

async function main() {
  if (!fs.existsSync(CACHE_PATH)) {
    throw new Error(`Cache not found: ${CACHE_PATH}. Run npm run db:import-drap first.`);
  }

  const all = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as DrapProduct[];
  const products = all
    .slice()
    .sort((a, b) => a.brandName.localeCompare(b.brandName))
    .slice(0, LIMIT);

  console.log(`Cache has ${all.length} products. Seeding ${products.length}...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    const sku = `DRAP-${p.registrationNo}`;
    const name = p.brandName.slice(0, 200);
    const data = {
      name,
      genericName: p.genericName?.slice(0, 200) || null,
      brand: name,
      category: guessCategory(p.brandName),
      description: `Imported from DRAP Registered Product Index (Reg. No. ${p.registrationNo}). Source: https://eapp.dra.gov.pk/WebProductIndex.php`,
      sku,
      barcode: p.registrationNo,
      unit: mapUnit(p.brandName, p.dosageForm),
      manufacturer: p.companyName?.slice(0, 200) || "DRAP Registered",
      country: "Pakistan",
      requiresPrescription: false,
      isControlled: false,
      isActive: true,
      minStockLevel: 10,
      reorderPoint: 20,
    };

    try {
      const existing = await prisma.medicine.findUnique({ where: { sku } });
      if (existing) {
        await prisma.medicine.update({
          where: { sku },
          data: {
            name: data.name,
            brand: data.brand,
            manufacturer: data.manufacturer,
            unit: data.unit,
            category: data.category,
            isActive: true,
          },
        });
        updated += 1;
      } else {
        const byBarcode = await prisma.medicine.findUnique({
          where: { barcode: p.registrationNo },
        });
        if (byBarcode && byBarcode.sku !== sku) {
          await prisma.medicine.update({
            where: { id: byBarcode.id },
            data: { barcode: null },
          });
        }
        await prisma.medicine.create({ data });
        created += 1;
      }
    } catch {
      skipped += 1;
    }

    if ((i + 1) % 500 === 0 || i + 1 === products.length) {
      console.log(
        `  ${i + 1}/${products.length} (created ${created}, updated ${updated}, skipped ${skipped})`
      );
    }
  }

  // Soft-deactivate DRAP extras beyond the first LIMIT set (keep catalog tidy)
  const keepSkus = new Set(products.map((p) => `DRAP-${p.registrationNo}`));
  const extras = await prisma.medicine.findMany({
    where: { sku: { startsWith: "DRAP-" } },
    select: { id: true, sku: true },
  });
  const toDisable = extras.filter((m) => !keepSkus.has(m.sku));
  if (toDisable.length > 0) {
    await prisma.medicine.updateMany({
      where: { id: { in: toDisable.map((m) => m.id) } },
      data: { isActive: false },
    });
    console.log(`Deactivated ${toDisable.length} DRAP medicines beyond the ${LIMIT} limit`);
  }

  const drapActive = await prisma.medicine.count({
    where: { sku: { startsWith: "DRAP-" }, isActive: true },
  });
  const totalActive = await prisma.medicine.count({ where: { isActive: true } });

  console.log("\nDone.");
  console.log(`Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
  console.log(`Active DRAP medicines: ${drapActive}`);
  console.log(`Active medicines total: ${totalActive}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
