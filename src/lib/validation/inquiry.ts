import { z } from "zod";
import { COPY } from "@/config/copy";
import { LIMITS } from "@/config/site";
import { normalizePhone } from "@/lib/format";

/**
 * Inquiry schema. Phone is normalised to E.164 during parsing so the
 * database never stores a mix of "064/123-4567" and "+381641234567".
 */
export const inquirySchema = z
  .object({
    listingId: z.uuid(),
    senderName: z
      .string()
      .trim()
      .min(2, { message: COPY.validation.required })
      .max(80, { message: COPY.validation.required }),
    senderPhone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? normalizePhone(v) : null))
      .refine((v) => v === null || v !== null, {
        message: COPY.validation.invalidPhone,
      }),
    senderEmail: z
      .union([z.email({ message: COPY.validation.invalidEmail }), z.literal("")])
      .optional()
      .transform((v) => (v ? v : null)),
    message: z
      .string()
      .trim()
      .min(LIMITS.inquiryMessageMin, { message: COPY.validation.messageLength })
      .max(LIMITS.inquiryMessageMax, { message: COPY.validation.messageLength }),
  })
  .refine((data) => data.senderPhone !== null || data.senderEmail !== null, {
    message: COPY.validation.contactRequired,
    path: ["senderPhone"],
  });

export type InquiryInput = z.infer<typeof inquirySchema>;

/**
 * Raw phone validation, applied before the schema so a malformed number
 * reports "invalid phone" rather than silently becoming null and
 * tripping the "no contact channel" rule instead.
 */
export function phoneIsUsable(raw: string | undefined): boolean {
  if (!raw || raw.trim() === "") return true;
  return normalizePhone(raw) !== null;
}
