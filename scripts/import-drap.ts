/**
 * Import medicines from DRAP Registered Product Index
 * Source: https://eapp.dra.gov.pk/WebProductIndex.php (e.dra.gov.pk → Registered Drugs Index)
 *
 * Usage: npx tsx scripts/import-drap.ts
 */
import { PrismaClient, MedicineUnit } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const BASE = "https://eapp.dra.gov.pk/productView.php";
const CACHE_PATH = path.join(__dirname, "drap-products.json");

type DrapProduct = {
  registrationNo: string;
  brandName: string;
  genericName?: string | null;
  companyName?: string | null;
  dosageForm?: string | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string): Promise<{ results?: { id: string; text: string }[] }> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, text/javascript, */*",
      "User-Agent": "BilalPharmacyImporter/1.0 (local pharmacy catalog sync)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  let text = await res.text();
  text = text.replace(/^\uFEFF/, "").replace(/^\?/, "").trim();
  if (!text) return { results: [] };
  return JSON.parse(text);
}

function buildPrefixes(): string[] {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  // Third chars chosen for drug-name frequency; contains-match means heavy overlap is fine
  const thirds = "aeiournstl";
  const set = new Set<string>();

  // Dense letter trigrams for broad coverage (contains-match on DRAP)
  for (const a of letters) {
    for (const b of letters) {
      for (const c of thirds) {
        set.add(`${a}${b}${c}`);
      }
    }
  }

  // Common pharmaceutical roots (extra safety net)
  const roots = [
    "para", "amox", "cipr", "metr", "vita", "ibup", "omep", "ator", "losar",
    "azith", "cefix", "cefix", "dolo", "panadol", "bruf", "flagyl", "augment",
    "augmentin", "disprin", " Ascorb", "insulin", "gluco", "metformin", "aspir",
    "diclo", "naprox", "tramadol", "codeine", "morph", "diazep", "alpraz",
    "amlo", "ateno", "bisopr", "carved", "enalap", "ramip", "valsar", "telmi",
    "rosuv", "simva", "panto", "esome", "ranit", "famot", "domper", "ondans",
    "montel", "cetir", "lorat", "fexof", "chlor", "hydro", "predni", "dexam",
    "amoxi", "peni", "erythro", "clarith", "levof", "moxif", "oflox", "genta",
    "amino", "folic", "iron", "zinc", "calci", "magn", "potas", "sodium",
    "syrup", "tablet", "capsule", "inject", "cream", "ointment", "drop",
    "suspension", "powder", "vaccine", "serum", "heparin", "warfar",
  ];
  for (const r of roots) {
    const t = r.trim().toLowerCase();
    if (t.length >= 3) set.add(t.slice(0, 3));
    if (t.length >= 4) set.add(t.slice(0, 4));
    set.add(t);
  }

  return Array.from(set).sort();
}

function mapUnit(name: string, dosageForm?: string | null): MedicineUnit {
  const s = `${dosageForm ?? ""} ${name}`.toLowerCase();
  if (s.includes("capsule")) return "CAPSULE";
  if (s.includes("syrup") || s.includes("suspension") || s.includes("elixir")) return "SYRUP";
  if (s.includes("injection") || s.includes("injectable") || s.includes("infusion")) return "INJECTION";
  if (s.includes("cream") || s.includes("ointment") || s.includes("gel") || s.includes("lotion")) return "CREAM";
  if (s.includes("drop") || s.includes("eye") || s.includes("ear")) return "DROPS";
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

async function scrapeBrands(prefixes: string[]): Promise<Map<string, DrapProduct>> {
  const map = new Map<string, DrapProduct>();

  // Resume from cache if present
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as DrapProduct[];
      for (const p of cached) map.set(p.registrationNo, p);
      console.log(`Loaded ${map.size} products from cache`);
    } catch {
      console.log("Cache unreadable, starting fresh");
    }
  }

  const concurrency = 6;
  let done = 0;

  async function worker(chunk: string[]) {
    for (const term of chunk) {
      try {
        const q = new URLSearchParams({ search: term, _type: "brand name" });
        const data = await fetchJson(`${BASE}?${q.toString()}`);
        for (const row of data.results ?? []) {
          const registrationNo = String(row.id).trim();
          const brandName = String(row.text).trim().replace(/\s+/g, " ");
          if (!registrationNo || !brandName) continue;
          if (!map.has(registrationNo)) {
            map.set(registrationNo, { registrationNo, brandName });
          }
        }
      } catch (err) {
        console.warn(`  skip "${term}":`, err instanceof Error ? err.message : err);
        await sleep(500);
      }
      done += 1;
      if (done % 50 === 0) {
        console.log(`  scraped ${done}/${prefixes.length} prefixes → ${map.size} unique products`);
        persist(map);
      }
      await sleep(80);
    }
  }

  const chunks: string[][] = Array.from({ length: concurrency }, () => []);
  prefixes.forEach((p, i) => chunks[i % concurrency]!.push(p));
  await Promise.all(chunks.map(worker));
  persist(map);
  return map;
}

function persist(map: Map<string, DrapProduct>) {
  const arr = Array.from(map.values()).sort((a, b) =>
    a.registrationNo.localeCompare(b.registrationNo)
  );
  fs.writeFileSync(CACHE_PATH, JSON.stringify(arr, null, 0), "utf8");
}

async function enrichSample(map: Map<string, DrapProduct>, limit = 400) {
  // Enrich a sample with company/dosage via POST detail (HTML parse)
  const targets = Array.from(map.values())
    .filter((p) => !p.companyName)
    .slice(0, limit);

  console.log(`Enriching ${targets.length} product details...`);
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i]!;
    try {
      const body = new URLSearchParams({ webRegNo: p.registrationNo });
      const res = await fetch(BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "BilalPharmacyImporter/1.0",
        },
        body,
      });
      const html = await res.text();
      const company = html.match(/Company Name<\/span><span class="fw-semibold">([^<]*)/)?.[1]?.trim();
      const dosage = html.match(/Dosage Form<\/span><span class="fw-semibold">([^<]*)/)?.[1]?.trim();
      const usedFor = html.match(/Used For<\/span><span class="fw-semibold">([^<]*)/)?.[1]?.trim();
      if (company) p.companyName = company;
      if (dosage) p.dosageForm = dosage;
      // Skip veterinary-only if marked
      if (usedFor && /vet/i.test(usedFor) && !/human/i.test(usedFor)) {
        map.delete(p.registrationNo);
      } else {
        map.set(p.registrationNo, p);
      }
    } catch {
      // ignore detail failures
    }
    if ((i + 1) % 50 === 0) {
      console.log(`  enriched ${i + 1}/${targets.length}`);
      persist(map);
    }
    await sleep(60);
  }
  persist(map);
}

async function seedMedicines(products: DrapProduct[], limit = 20000) {
  const toSeed = products.slice(0, limit);
  console.log(`Seeding ${toSeed.length} of ${products.length} medicines (limit ${limit})...`);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const batchSize = 100;

  for (let i = 0; i < toSeed.length; i += batchSize) {
    const batch = toSeed.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (p) => {
        const sku = `DRAP-${p.registrationNo}`;
        const name = p.brandName.slice(0, 200);
        const unit = mapUnit(p.brandName, p.dosageForm);
        const category = guessCategory(p.brandName);
        const data = {
          name,
          genericName: p.genericName?.slice(0, 200) || null,
          brand: name,
          category,
          description: `Imported from DRAP Registered Product Index (Reg. No. ${p.registrationNo}). Source: e.dra.gov.pk / eapp.dra.gov.pk`,
          sku,
          barcode: p.registrationNo,
          unit,
          strength: null as string | null,
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
            // barcode unique — clear conflict if another row has same barcode
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
        } catch (err) {
          skipped += 1;
          if (skipped <= 5) {
            console.warn("skip", p.registrationNo, err instanceof Error ? err.message : err);
          }
        }
      })
    );
    if ((i + batchSize) % 500 === 0 || i + batchSize >= toSeed.length) {
      console.log(
        `  progress ${Math.min(i + batchSize, toSeed.length)}/${toSeed.length} (created ${created}, updated ${updated}, skipped ${skipped})`
      );
    }
  }

  return { created, updated, skipped };
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  DRAP Product Index → Bilal Pharmacy");
  console.log("  https://eapp.dra.gov.pk/WebProductIndex.php");
  console.log("═══════════════════════════════════════════\n");

  const prefixes = buildPrefixes();
  console.log(`Using ${prefixes.length} search prefixes...\n`);

  const map = await scrapeBrands(prefixes);
  console.log(`\nCollected ${map.size} unique DRAP products`);

  // Light enrichment for manufacturer/unit accuracy (sample; full enrich would take hours)
  await enrichSample(map, 300);

  const products = Array.from(map.values()).sort((a, b) =>
    a.brandName.localeCompare(b.brandName)
  );
  persist(map);

  const LIMIT = Number(process.env.DRAP_IMPORT_LIMIT || 20000);
  const result = await seedMedicines(products, LIMIT);
  const total = await prisma.medicine.count({ where: { isActive: true } });
  const drapCount = await prisma.medicine.count({
    where: { sku: { startsWith: "DRAP-" } },
  });

  console.log("\n═══════════════════════════════════════════");
  console.log("  Import complete");
  console.log(`  Created: ${result.created}`);
  console.log(`  Updated: ${result.updated}`);
  console.log(`  Skipped: ${result.skipped}`);
  console.log(`  DRAP SKUs in DB: ${drapCount}`);
  console.log(`  Active medicines total: ${total}`);
  console.log(`  Cache: ${CACHE_PATH}`);
  console.log("═══════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
