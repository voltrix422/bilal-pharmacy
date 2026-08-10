import { z } from "zod";

export const prescriptionStatusEnum = z.enum([
  "PENDING",
  "VERIFIED",
  "DISPENSED",
  "EXPIRED",
  "CANCELLED",
]);

export const prescriptionItemSchema = z.object({
  medicineId: z.string().cuid(),
  dosage: z.string().min(1, "Dosage is required").max(100),
  frequency: z.string().min(1, "Frequency is required").max(100),
  duration: z.string().max(100).optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional().nullable(),
});

export const prescriptionSchema = z.object({
  customerId: z.string().cuid("Invalid customer"),
  doctorName: z.string().min(2, "Doctor name is required").max(200),
  doctorLicense: z.string().max(100).optional().nullable(),
  hospitalClinic: z.string().max(200).optional().nullable(),
  issuedDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional().nullable(),
  status: prescriptionStatusEnum.default("PENDING"),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, "At least one medicine is required"),
});

export const prescriptionUpdateSchema = z.object({
  doctorName: z.string().min(2).max(200).optional(),
  doctorLicense: z.string().max(100).optional().nullable(),
  hospitalClinic: z.string().max(200).optional().nullable(),
  issuedDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional().nullable(),
  status: prescriptionStatusEnum.optional(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(prescriptionItemSchema).min(1).optional(),
});

export const dispensePrescriptionSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().cuid(),
        dispensedQuantity: z.coerce.number().int().positive(),
        batchId: z.string().cuid(),
      })
    )
    .min(1),
});

export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type PrescriptionUpdateInput = z.infer<typeof prescriptionUpdateSchema>;
export type DispensePrescriptionInput = z.infer<typeof dispensePrescriptionSchema>;
