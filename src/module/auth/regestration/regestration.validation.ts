import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
    "Password must include upper, lower, number, and special character",
  );

export const verifyUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z.string().trim().email("Invalid email address"),
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Phone must be a valid 11-digit Bangladesh number")
    .optional(),
  role: z.enum(["STUDENT", "FACULTY"]).optional(),
});

export const registerUserSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export type VerifyUserInput = z.infer<typeof verifyUserSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
