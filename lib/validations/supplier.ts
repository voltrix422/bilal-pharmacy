import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  contactPerson: z.string().max(200).optional().nullable(),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  paymentTerms: z.string().max(200).optional().nullable(),
  isActive: z.boolean().default(true),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const supplierUpdateSchema = supplierSchema.partial();

export const supplierQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
