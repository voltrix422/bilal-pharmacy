import { z } from "zod";

export const batchSchema = z.object({
  medicineId: z.string().min(1, "Medicine is required"),
  supplierId: z.string().optional().nullable(),
  batchNumber: z.string().min(1, "Batch number is required").max(100),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  remainingQuantity: z.coerce.number().int().min(0).optional(),
  unitCost: z.coerce.number().min(0, "Unit cost must be ≥ 0"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be ≥ 0"),
  expiryDate: z.coerce.date({ required_error: "Expiry date is required" }),
  receivedDate: z.coerce.date().optional(),
  locationId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const batchUpdateSchema = batchSchema.partial().extend({
  medicineId: z.string().min(1).optional(),
});

export const batchQuerySchema = z.object({
  search: z.string().optional(),
  medicineId: z.string().optional(),
  supplierId: z.string().optional(),
  locationId: z.string().optional(),
  expiryStatus: z.enum(["all", "expired", "critical", "warning", "ok"]).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type BatchInput = z.infer<typeof batchSchema>;
export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>;
