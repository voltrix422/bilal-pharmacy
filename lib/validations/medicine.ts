import { z } from "zod";

export const medicineUnitEnum = z.enum([
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "INJECTION",
  "CREAM",
  "DROPS",
  "INHALER",
  "PATCH",
  "SUPPOSITORY",
  "OTHER",
]);

export const medicineSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  genericName: z.string().max(200).optional().nullable(),
  brand: z.string().max(200).optional().nullable(),
  category: z.string().min(1, "Category is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  sku: z.string().min(3).max(50).optional(),
  barcode: z.string().max(64).optional().nullable(),
  unit: medicineUnitEnum.default("TABLET"),
  strength: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  requiresPrescription: z.boolean().default(false),
  isControlled: z.boolean().default(false),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  minStockLevel: z.coerce.number().int().min(0).default(10),
  reorderPoint: z.coerce.number().int().min(0).default(20),
});

export const medicineUpdateSchema = medicineSchema.partial();

export const medicineQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  unit: medicineUnitEnum.optional(),
  requiresPrescription: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MedicineInput = z.infer<typeof medicineSchema>;
export type MedicineUpdateInput = z.infer<typeof medicineUpdateSchema>;
