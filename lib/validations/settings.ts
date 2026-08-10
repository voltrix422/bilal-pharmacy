import { z } from "zod";

export const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(5000),
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const settingsBulkSchema = z.object({
  settings: z.array(settingSchema).min(1),
});

export const pharmacySettingsSchema = z.object({
  pharmacyName: z.string().min(1).max(200),
  pharmacyAddress: z.string().max(500).optional().nullable(),
  pharmacyPhone: z.string().max(20).optional().nullable(),
  pharmacyEmail: z.string().email().optional().nullable().or(z.literal("")),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  currency: z.string().min(3).max(3).default("PKR"),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  expiryWarningDays: z.coerce.number().int().min(1).default(30),
  expiryCriticalDays: z.coerce.number().int().min(1).default(7),
  loyaltyPointsPerUnit: z.coerce.number().min(0).default(1),
  loyaltyRedemptionRate: z.coerce.number().min(0).default(0.01),
  receiptFooter: z.string().max(500).optional().nullable(),
  enablePrescriptions: z.boolean().default(true),
  enableLoyalty: z.boolean().default(true),
});

export type SettingInput = z.infer<typeof settingSchema>;
export type PharmacySettingsInput = z.infer<typeof pharmacySettingsSchema>;
