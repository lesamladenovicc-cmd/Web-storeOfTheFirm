import type { ZodError } from "zod";
import type { ActionState } from "@/types/domain";

/**
 * Flattens a ZodError into the { field: message } shape that
 * useActionState renders. Only the first message per field is kept —
 * showing three errors under one input is noise.
 */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Generic in T so a failure is assignable to a typed ActionState<T>.
 * A failed action carries no data, but must still satisfy the same
 * return type as the success path.
 */
export function fail<T = undefined>(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState<T> {
  return { ok: false, message, ...(fieldErrors ? { fieldErrors } : {}) };
}

export function succeed<T>(message?: string, data?: T): ActionState<T> {
  return { ok: true, ...(message ? { message } : {}), ...(data ? { data } : {}) };
}

/** Reads a trimmed string from FormData, or undefined when blank. */
export function formString(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Reads all values for a repeated field (checkbox groups). */
export function formStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Reads an integer, or undefined when blank/invalid. */
export function formInt(formData: FormData, key: string): number | undefined {
  const raw = formString(formData, key);
  if (raw === undefined) return undefined;
  // Serbian users type "1.950.000" — strip grouping before parsing.
  const cleaned = raw.replace(/[.\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return Number.NaN;
  return Number.parseInt(cleaned, 10);
}

export function formBool(formData: FormData, key: string): boolean {
  const raw = formData.get(key);
  return raw === "on" || raw === "true" || raw === "1";
}
