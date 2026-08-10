import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .max(20)
    .optional()
    .nullable()
    .or(z.literal("")),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z
    .enum(["male", "female", "other", "Male", "Female", "Other"])
    .optional()
    .nullable(),
  address: z.string().max(500).optional().nullable(),
  allergies: z.string().max(1000).optional().nullable(),
  medicalHistory: z.string().max(2000).optional().nullable(),
  insuranceProvider: z.string().max(200).optional().nullable(),
  insuranceNumber: z.string().max(100).optional().nullable(),
  loyaltyPoints: z.coerce.number().int().min(0).optional(),
  outstandingBalance: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export const customerUpdateSchema = customerSchema.partial();

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
