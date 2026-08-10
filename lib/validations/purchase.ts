import { z } from "zod";

export const poStatusEnum = z.enum([
  "DRAFT",
  "SENT",
  "CONFIRMED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
]);

export const purchaseOrderItemSchema = z.object({
  medicineId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0),
  batchNumber: z.string().max(100).optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().cuid("Invalid supplier"),
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: poStatusEnum.default("DRAFT"),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "At least one item is required"),
});

export const purchaseOrderUpdateSchema = z.object({
  supplierId: z.string().cuid().optional(),
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: poStatusEnum.optional(),
  items: z.array(purchaseOrderItemSchema).min(1).optional(),
});

export const receivePurchaseItemSchema = z.object({
  id: z.string().cuid(),
  receivedQuantity: z.coerce.number().int().positive(),
  batchNumber: z.string().min(1).max(100),
  expiryDate: z.coerce.date(),
  sellingPrice: z.coerce.number().min(0),
  locationId: z.string().cuid().optional().nullable(),
});

export const receivePurchaseSchema = z.object({
  items: z.array(receivePurchaseItemSchema).min(1),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;
export type ReceivePurchaseInput = z.infer<typeof receivePurchaseSchema>;
