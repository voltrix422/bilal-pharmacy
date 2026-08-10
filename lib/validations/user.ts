import { z } from "zod";

export const roleEnum = z.enum(["ADMIN", "PHARMACIST", "CASHIER", "MANAGER"]);

export const moduleAccessLevelEnum = z.enum(["none", "view", "edit"]);

export const moduleAccessSchema = z
  .record(z.string(), moduleAccessLevelEnum)
  .optional()
  .nullable();

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .optional(),
  role: roleEnum.default("CASHIER"),
  avatar: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  moduleAccess: moduleAccessSchema,
});

export const createUserSchema = userSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const updateUserSchema = userSchema.partial().extend({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UserInput = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
