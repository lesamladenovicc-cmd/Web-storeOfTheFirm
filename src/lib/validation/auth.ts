import { z } from "zod";
import { COPY } from "@/config/copy";

/**
 * Auth schemas. Serbian messages come from COPY so the validation layer
 * never hardcodes user-facing text.
 */

export const loginSchema = z.object({
  email: z.email({ message: COPY.validation.invalidEmail }),
  password: z.string().min(1, { message: COPY.validation.required }),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * 10 characters minimum. NIST guidance favours length over composition
 * rules, and composition rules push staff toward "Lozinka1!" patterns.
 */
export const changePasswordSchema = z
  .object({
    password: z.string().min(10, { message: COPY.auth.passwordTooShort }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: COPY.auth.passwordMismatch,
    path: ["passwordConfirm"],
  });

/**
 * Guards the ?next= redirect against open-redirect abuse: only
 * same-origin absolute paths are allowed through.
 */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  if (value.includes("\\")) return "/dashboard";
  return value;
}
