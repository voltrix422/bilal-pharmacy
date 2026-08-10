/**
 * Seeds only users + local medicine catalog.
 * All stock, customers, suppliers, sales, etc. are added manually in the app.
 */
import { PrismaClient, MedicineUnit, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type MedicineSeed = {
  name: string;
  genericName: string;
  brand: string;
  category: string;
  unit: MedicineUnit;
  strength: string;
  manufacturer: string;
  requiresPrescription: boolean;
  isControlled: boolean;
  minStockLevel: number;
  reorderPoint: number;
};

const MEDICINES: MedicineSeed[] = [
  { name: "Amoxicillin 500mg", genericName: "Amoxicillin", brand: "Amoxil", category: "Antibiotics", unit: "CAPSULE", strength: "500mg", manufacturer: "GSK Pakistan", requiresPrescription: true, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Azithromycin 250mg", genericName: "Azithromycin", brand: "Zithromax", category: "Antibiotics", unit: "TABLET", strength: "250mg", manufacturer: "Pfizer Pakistan", requiresPrescription: true, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Ciprofloxacin 500mg", genericName: "Ciprofloxacin", brand: "Ciproxin", category: "Antibiotics", unit: "TABLET", strength: "500mg", manufacturer: "Bayer Pharma", requiresPrescription: true, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Cephalexin 500mg", genericName: "Cephalexin", brand: "Keflex", category: "Antibiotics", unit: "CAPSULE", strength: "500mg", manufacturer: "Getz Pharma", requiresPrescription: true, isControlled: false, minStockLevel: 30, reorderPoint: 60 },
  { name: "Metronidazole 400mg", genericName: "Metronidazole", brand: "Flagyl", category: "Antibiotics", unit: "TABLET", strength: "400mg", manufacturer: "Sanofi", requiresPrescription: true, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Clarithromycin 500mg", genericName: "Clarithromycin", brand: "Klacid", category: "Antibiotics", unit: "TABLET", strength: "500mg", manufacturer: "Abbott Pakistan", requiresPrescription: true, isControlled: false, minStockLevel: 25, reorderPoint: 50 },
  { name: "Doxycycline 100mg", genericName: "Doxycycline", brand: "Vibramycin", category: "Antibiotics", unit: "CAPSULE", strength: "100mg", manufacturer: "Pfizer Pakistan", requiresPrescription: true, isControlled: false, minStockLevel: 30, reorderPoint: 60 },
  { name: "Paracetamol 500mg", genericName: "Paracetamol", brand: "Panadol", category: "Analgesics", unit: "TABLET", strength: "500mg", manufacturer: "GSK Consumer", requiresPrescription: false, isControlled: false, minStockLevel: 100, reorderPoint: 200 },
  { name: "Ibuprofen 400mg", genericName: "Ibuprofen", brand: "Brufen", category: "Analgesics", unit: "TABLET", strength: "400mg", manufacturer: "Abbott Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 80, reorderPoint: 150 },
  { name: "Diclofenac Sodium 50mg", genericName: "Diclofenac", brand: "Voltaren", category: "Analgesics", unit: "TABLET", strength: "50mg", manufacturer: "Novartis", requiresPrescription: true, isControlled: false, minStockLevel: 60, reorderPoint: 120 },
  { name: "Tramadol 50mg", genericName: "Tramadol", brand: "Tramal", category: "Analgesics", unit: "CAPSULE", strength: "50mg", manufacturer: "Grunenthal", requiresPrescription: true, isControlled: true, minStockLevel: 20, reorderPoint: 40 },
  { name: "Aspirin 75mg", genericName: "Acetylsalicylic Acid", brand: "Disprin", category: "Analgesics", unit: "TABLET", strength: "75mg", manufacturer: "Reckitt Benckiser", requiresPrescription: false, isControlled: false, minStockLevel: 80, reorderPoint: 160 },
  { name: "Naproxen 500mg", genericName: "Naproxen", brand: "Synflex", category: "Analgesics", unit: "TABLET", strength: "500mg", manufacturer: "Highnoon Labs", requiresPrescription: true, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Mefenamic Acid 500mg", genericName: "Mefenamic Acid", brand: "Ponstan", category: "Analgesics", unit: "CAPSULE", strength: "500mg", manufacturer: "Pfizer Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Amlodipine 5mg", genericName: "Amlodipine", brand: "Norvasc", category: "Antihypertensives", unit: "TABLET", strength: "5mg", manufacturer: "Pfizer Pakistan", requiresPrescription: true, isControlled: false, minStockLevel: 60, reorderPoint: 120 },
  { name: "Losartan 50mg", genericName: "Losartan", brand: "Cozaar", category: "Antihypertensives", unit: "TABLET", strength: "50mg", manufacturer: "MSD", requiresPrescription: true, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Atenolol 50mg", genericName: "Atenolol", brand: "Tenormin", category: "Antihypertensives", unit: "TABLET", strength: "50mg", manufacturer: "AstraZeneca", requiresPrescription: true, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Ramipril 5mg", genericName: "Ramipril", brand: "Tritace", category: "Antihypertensives", unit: "CAPSULE", strength: "5mg", manufacturer: "Sanofi", requiresPrescription: true, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Hydrochlorothiazide 25mg", genericName: "Hydrochlorothiazide", brand: "Esidrex", category: "Antihypertensives", unit: "TABLET", strength: "25mg", manufacturer: "Novartis", requiresPrescription: true, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Valsartan 80mg", genericName: "Valsartan", brand: "Diovan", category: "Antihypertensives", unit: "TABLET", strength: "80mg", manufacturer: "Novartis", requiresPrescription: true, isControlled: false, minStockLevel: 35, reorderPoint: 70 },
  { name: "Vitamin D3 5000 IU", genericName: "Cholecalciferol", brand: "Osteocare D3", category: "Vitamins", unit: "TABLET", strength: "5000 IU", manufacturer: "Searle Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 60, reorderPoint: 120 },
  { name: "Vitamin C 500mg", genericName: "Ascorbic Acid", brand: "Cecon", category: "Vitamins", unit: "TABLET", strength: "500mg", manufacturer: "Abbott Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 80, reorderPoint: 160 },
  { name: "Multivitamin Adult", genericName: "Multivitamins", brand: "Centrum", category: "Vitamins", unit: "TABLET", strength: "Adult", manufacturer: "GSK Consumer", requiresPrescription: false, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Calcium + Vitamin D", genericName: "Calcium Carbonate", brand: "Caltrate", category: "Vitamins", unit: "TABLET", strength: "600mg/400IU", manufacturer: "Pfizer Consumer", requiresPrescription: false, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Folic Acid 5mg", genericName: "Folic Acid", brand: "Folvite", category: "Vitamins", unit: "TABLET", strength: "5mg", manufacturer: "Wyeth Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 70, reorderPoint: 140 },
  { name: "Vitamin B Complex", genericName: "B-Complex", brand: "Becosules", category: "Vitamins", unit: "CAPSULE", strength: "B1-B12", manufacturer: "Pfizer Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 60, reorderPoint: 120 },
  { name: "Metformin 500mg", genericName: "Metformin", brand: "Glucophage", category: "Antidiabetics", unit: "TABLET", strength: "500mg", manufacturer: "Merck", requiresPrescription: true, isControlled: false, minStockLevel: 80, reorderPoint: 160 },
  { name: "Glimepiride 2mg", genericName: "Glimepiride", brand: "Amaryl", category: "Antidiabetics", unit: "TABLET", strength: "2mg", manufacturer: "Sanofi", requiresPrescription: true, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Sitagliptin 100mg", genericName: "Sitagliptin", brand: "Januvia", category: "Antidiabetics", unit: "TABLET", strength: "100mg", manufacturer: "MSD", requiresPrescription: true, isControlled: false, minStockLevel: 30, reorderPoint: 60 },
  { name: "Gliclazide 80mg", genericName: "Gliclazide", brand: "Diamicron", category: "Antidiabetics", unit: "TABLET", strength: "80mg", manufacturer: "Servier", requiresPrescription: true, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Insulin Glargine 100IU/ml", genericName: "Insulin Glargine", brand: "Lantus", category: "Antidiabetics", unit: "INJECTION", strength: "100 IU/ml", manufacturer: "Sanofi", requiresPrescription: true, isControlled: false, minStockLevel: 15, reorderPoint: 30 },
  { name: "Empagliflozin 10mg", genericName: "Empagliflozin", brand: "Jardiance", category: "Antidiabetics", unit: "TABLET", strength: "10mg", manufacturer: "Boehringer Ingelheim", requiresPrescription: true, isControlled: false, minStockLevel: 25, reorderPoint: 50 },
  { name: "Cetirizine 10mg", genericName: "Cetirizine", brand: "Zyrtec", category: "Antihistamines", unit: "TABLET", strength: "10mg", manufacturer: "UCB / Hilton", requiresPrescription: false, isControlled: false, minStockLevel: 70, reorderPoint: 140 },
  { name: "Loratadine 10mg", genericName: "Loratadine", brand: "Clarityn", category: "Antihistamines", unit: "TABLET", strength: "10mg", manufacturer: "Bayer", requiresPrescription: false, isControlled: false, minStockLevel: 60, reorderPoint: 120 },
  { name: "Fexofenadine 120mg", genericName: "Fexofenadine", brand: "Telfast", category: "Antihistamines", unit: "TABLET", strength: "120mg", manufacturer: "Sanofi", requiresPrescription: false, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Chlorpheniramine 4mg", genericName: "Chlorpheniramine", brand: "Piriton", category: "Antihistamines", unit: "TABLET", strength: "4mg", manufacturer: "GSK", requiresPrescription: false, isControlled: false, minStockLevel: 80, reorderPoint: 160 },
  { name: "Desloratadine 5mg", genericName: "Desloratadine", brand: "Aerius", category: "Antihistamines", unit: "TABLET", strength: "5mg", manufacturer: "MSD", requiresPrescription: false, isControlled: false, minStockLevel: 40, reorderPoint: 80 },
  { name: "Diphenhydramine Syrup", genericName: "Diphenhydramine", brand: "Benadryl", category: "Antihistamines", unit: "SYRUP", strength: "12.5mg/5ml", manufacturer: "J&J Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 30, reorderPoint: 60 },
  { name: "Omeprazole 20mg", genericName: "Omeprazole", brand: "Risek", category: "Gastrointestinal", unit: "CAPSULE", strength: "20mg", manufacturer: "Getz Pharma", requiresPrescription: false, isControlled: false, minStockLevel: 80, reorderPoint: 160 },
  { name: "Pantoprazole 40mg", genericName: "Pantoprazole", brand: "Controloc", category: "Gastrointestinal", unit: "TABLET", strength: "40mg", manufacturer: "Abbott Pakistan", requiresPrescription: true, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Domperidone 10mg", genericName: "Domperidone", brand: "Motilium", category: "Gastrointestinal", unit: "TABLET", strength: "10mg", manufacturer: "Janssen", requiresPrescription: false, isControlled: false, minStockLevel: 60, reorderPoint: 120 },
  { name: "ORS Sachet", genericName: "Oral Rehydration Salts", brand: "Pedialyte ORS", category: "Gastrointestinal", unit: "OTHER", strength: "20.5g", manufacturer: "Searle Pakistan", requiresPrescription: false, isControlled: false, minStockLevel: 100, reorderPoint: 200 },
  { name: "Loperamide 2mg", genericName: "Loperamide", brand: "Imodium", category: "Gastrointestinal", unit: "CAPSULE", strength: "2mg", manufacturer: "J&J", requiresPrescription: false, isControlled: false, minStockLevel: 50, reorderPoint: 100 },
  { name: "Sucralfate 1g", genericName: "Sucralfate", brand: "Antepsin", category: "Gastrointestinal", unit: "TABLET", strength: "1g", manufacturer: "Pharmatec", requiresPrescription: true, isControlled: false, minStockLevel: 30, reorderPoint: 60 },
  { name: "Clotrimazole Cream 1%", genericName: "Clotrimazole", brand: "Canesten", category: "Dermatology", unit: "CREAM", strength: "1%", manufacturer: "Bayer", requiresPrescription: false, isControlled: false, minStockLevel: 25, reorderPoint: 50 },
  { name: "Betamethasone Cream 0.1%", genericName: "Betamethasone", brand: "Betnovate", category: "Dermatology", unit: "CREAM", strength: "0.1%", manufacturer: "GSK", requiresPrescription: true, isControlled: false, minStockLevel: 20, reorderPoint: 40 },
  { name: "Mupirocin Ointment 2%", genericName: "Mupirocin", brand: "Bactroban", category: "Dermatology", unit: "CREAM", strength: "2%", manufacturer: "GSK", requiresPrescription: true, isControlled: false, minStockLevel: 20, reorderPoint: 40 },
  { name: "Hydrocortisone Cream 1%", genericName: "Hydrocortisone", brand: "Cortaid", category: "Dermatology", unit: "CREAM", strength: "1%", manufacturer: "Pfizer", requiresPrescription: false, isControlled: false, minStockLevel: 25, reorderPoint: 50 },
  { name: "Permethrin Lotion 5%", genericName: "Permethrin", brand: "Scaboma", category: "Dermatology", unit: "OTHER", strength: "5%", manufacturer: "Hilton Pharma", requiresPrescription: false, isControlled: false, minStockLevel: 15, reorderPoint: 30 },
  { name: "Fusidic Acid Cream 2%", genericName: "Fusidic Acid", brand: "Fucidin", category: "Dermatology", unit: "CREAM", strength: "2%", manufacturer: "LEO Pharma", requiresPrescription: true, isControlled: false, minStockLevel: 20, reorderPoint: 40 },
];

async function clearOperationalData() {
  console.log("Clearing operational data (keeping users + medicines)...");

  await prisma.$transaction([
    prisma.saleItem.deleteMany(),
    prisma.returnItem.deleteMany(),
    prisma.return.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.prescriptionItem.deleteMany(),
    prisma.prescription.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.stockAdjustment.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.batch.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.stockLocation.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
  ]);

  console.log("✓ Operational data cleared");
}

async function seedUsers() {
  console.log("Seeding users...");
  const users = [
    { email: "admin@bm.com", password: "passwordbmADMIN", name: "Bilal Admin", role: Role.ADMIN },
    { email: "admin@pharmacy.com", password: "Admin@123", name: "System Admin", role: Role.ADMIN },
    { email: "pharmacist@pharmacy.com", password: "Pharma@123", name: "Ali Pharmacist", role: Role.PHARMACIST },
    { email: "cashier@pharmacy.com", password: "Cashier@123", name: "Sara Cashier", role: Role.CASHIER },
    { email: "manager@pharmacy.com", password: "Manager@123", name: "Bilal Manager", role: Role.MANAGER },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashed,
        name: u.name,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        password: hashed,
        name: u.name,
        role: u.role,
        isActive: true,
      },
    });
  }

  console.log(`✓ Upserted ${users.length} users`);
}

async function seedMedicines() {
  console.log("Seeding local medicine catalog (no stock)...");

  for (let i = 0; i < MEDICINES.length; i++) {
    const m = MEDICINES[i]!;
    const sku = `MED-${String(i + 1).padStart(4, "0")}`;
    const barcode = `8901${String(1000000 + i + 1).slice(-7)}`;

    await prisma.medicine.upsert({
      where: { sku },
      update: {
        name: m.name,
        genericName: m.genericName,
        brand: m.brand,
        category: m.category,
        unit: m.unit,
        strength: m.strength,
        manufacturer: m.manufacturer,
        requiresPrescription: m.requiresPrescription,
        isControlled: m.isControlled,
        minStockLevel: m.minStockLevel,
        reorderPoint: m.reorderPoint,
        isActive: true,
        barcode,
      },
      create: {
        name: m.name,
        genericName: m.genericName,
        brand: m.brand,
        category: m.category,
        unit: m.unit,
        strength: m.strength,
        manufacturer: m.manufacturer,
        requiresPrescription: m.requiresPrescription,
        isControlled: m.isControlled,
        minStockLevel: m.minStockLevel,
        reorderPoint: m.reorderPoint,
        isActive: true,
        sku,
        barcode,
        country: "Pakistan",
      },
    });
  }

  console.log(`✓ Upserted ${MEDICINES.length} local medicines (no batches/stock)`);
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Bilal Pharmacy — Seed (users + medicines)");
  console.log("═══════════════════════════════════════════\n");

  await clearOperationalData();
  await seedUsers();
  await seedMedicines();

  const drapCount = await prisma.medicine.count({
    where: { sku: { startsWith: "DRAP-" } },
  });

  console.log("\n═══════════════════════════════════════════");
  console.log("  Seed completed");
  console.log("═══════════════════════════════════════════");
  console.log(`  DRAP medicines kept: ${drapCount}`);
  console.log("  Stock / customers / suppliers / sales: empty (add manually)");
  console.log("\nLogin:");
  console.log("  admin@bm.com / passwordbmADMIN");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
