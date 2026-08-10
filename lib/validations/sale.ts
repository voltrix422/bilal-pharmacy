import { z } from "zod";

export const paymentMethodEnum = z.enum([
  "CASH",
  "CARD",
  "INSURANCE",
  "MOBILE_PAYMENT",
]);

export const saleStatusEnum = z.enum([
  "PENDING",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

export const saleItemSchema = z.object({
  medicineId: z.string().cuid(),
  batchId: z.string().cuid(),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
});

export const saleSchema = z.object({
  customerId: z.string().cuid().optional().nullable(),
  prescriptionId: z.string().cuid().optional().nullable(),
  paymentMethod: paymentMethodEnum.default("CASH"),
  status: saleStatusEnum.default("COMPLETED"),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0),
  notes: z.string().max(1000).optional().nullable(),
  loyaltyRedeemed: z.coerce.number().int().min(0).default(0),
  isHeld: z.boolean().default(false),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
});

export const saleUpdateSchema = z.object({
  status: saleStatusEnum.optional(),
  paymentMethod: paymentMethodEnum.optional(),
  notes: z.string().max(1000).optional().nullable(),
  isHeld: z.boolean().optional(),
  customerId: z.string().cuid().optional().nullable(),
});

export const holdSaleSchema = saleSchema.extend({
  isHeld: z.literal(true).default(true),
  amountPaid: z.coerce.number().min(0).default(0),
});

/** POS checkout — batchId optional (FEFO selects when omitted) */
export const posSaleItemSchema = z.object({
  medicineId: z.string().cuid(),
  batchId: z.string().cuid().optional().nullable(),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).default(0),
});

export const posCheckoutSchema = z.object({
  customerId: z.string().cuid().optional().nullable(),
  prescriptionId: z.string().cuid().optional().nullable(),
  paymentMethod: paymentMethodEnum.default("CASH"),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).optional(),
  amountPaid: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
  loyaltyRedeemed: z.coerce.number().int().min(0).default(0),
  isHeld: z.boolean().default(false),
  insurancePolicyNumber: z.string().max(100).optional().nullable(),
  items: z.array(posSaleItemSchema).min(1, "At least one item is required"),
});

export type SaleInput = z.infer<typeof saleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;
export type PosCheckoutInput = z.infer<typeof posCheckoutSchema>;
export type PosSaleItemInput = z.infer<typeof posSaleItemSchema>;
