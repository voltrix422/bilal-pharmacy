import { z } from "zod";

export const returnTypeEnum = z.enum(["CUSTOMER_RETURN", "SUPPLIER_RETURN"]);

export const returnStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
]);

export const returnConditionEnum = z.enum(["RESTOCK", "DAMAGED"]);

export const returnItemSchema = z.object({
  medicineId: z.string().cuid(),
  batchId: z.string().cuid().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
  refundAmount: z.coerce.number().min(0).optional(),
  reason: z.string().max(500).optional().nullable(),
  condition: returnConditionEnum.default("RESTOCK"),
});

export const returnSchema = z
  .object({
    saleId: z.string().cuid().optional().nullable(),
    customerId: z.string().cuid().optional().nullable(),
    type: returnTypeEnum,
    status: returnStatusEnum.default("COMPLETED"),
    reason: z.string().max(1000).optional().nullable(),
    items: z.array(returnItemSchema).min(1, "At least one item is required"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "CUSTOMER_RETURN" && !data.saleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sale is required for customer returns",
        path: ["saleId"],
      });
    }
    if (data.type === "SUPPLIER_RETURN") {
      data.items.forEach((item, index) => {
        if (!item.batchId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Batch is required for supplier returns",
            path: ["items", index, "batchId"],
          });
        }
      });
    }
  });

export const returnUpdateSchema = z.object({
  status: returnStatusEnum.optional(),
  reason: z.string().max(1000).optional().nullable(),
});

export type ReturnInput = z.infer<typeof returnSchema>;
export type ReturnUpdateInput = z.infer<typeof returnUpdateSchema>;
export type ReturnCondition = z.infer<typeof returnConditionEnum>;
