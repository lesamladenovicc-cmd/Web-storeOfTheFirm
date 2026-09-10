import { z } from "zod";
import { COPY } from "@/config/copy";
import { LIMITS } from "@/config/site";
import { LISTING_CONDITIONS, LISTING_PURPOSES, LISTING_STATUSES } from "@/config/taxonomy";
import { normalizePhone } from "@/lib/format";

/**
 * LISTING VALIDATION — the server-side authority.
 *
 * Two schemas, because a draft and a published listing have genuinely
 * different requirements: a seller must be able to save a half-finished
 * listing, but must not be able to publish one that a buyer cannot act
 * on. Every bound mirrors a CHECK constraint in the migrations, so a
 * bypass of this layer still fails at the database.
 */

const title = z
  .string()
  .trim()
  .min(LIMITS.titleMin, { message: COPY.validation.titleLength })
  .max(LIMITS.titleMax, { message: COPY.validation.titleLength });

const description = z
  .string()
  .trim()
  .max(LIMITS.descriptionMax, { message: COPY.validation.descriptionTooLong });

const priceEur = z
  .number()
  .int({ message: COPY.validation.invalidPrice })
  .min(0, { message: COPY.validation.invalidPrice })
  .max(LIMITS.priceMax, { message: COPY.validation.priceTooHigh })
  .nullable();

const location = z
  .string()
  .trim()
  .max(LIMITS.locationMax, { message: COPY.validation.locationLength });

const contactPhone = z
  .string()
  .trim()
  .nullable()
  .transform((v) => (v ? normalizePhone(v) : null));

const contactEmail = z
  .union([z.email({ message: COPY.validation.invalidEmail }), z.literal("")])
  .nullable()
  .transform((v) => (v ? v : null));

/** Storage paths are validated for ownership separately, in the action. */
const imagePaths = z
  .array(z.string().min(3).max(400))
  .max(LIMITS.maxImages, { message: COPY.validation.tooManyImages });

/**
 * Property specification (listings.attributes jsonb).
 *
 * Every field is optional AND every empty-ish value is stripped to
 * `undefined`, so a blank form field never writes `""` or `0` into the
 * document. That matters downstream: the spec sheet and the JSON-LD both
 * decide whether to render a row by presence, and a zero area would
 * otherwise reach schema.org `floorSize` as a factual claim.
 *
 * `.strip()` (the zod default) drops unknown keys rather than throwing,
 * so an older client posting a field we have since removed still saves.
 */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const attrNumber = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ message: COPY.validation.invalidNumber })
      .positive({ message: COPY.validation.invalidNumber })
      .max(max, { message: COPY.validation.invalidNumber })
      .optional(),
  );

const attrText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(LIMITS.attrTextMax).optional(),
);

/** Unchecked boxes are simply absent from FormData, hence the coercion. */
const attrBool = z.preprocess(
  (v) => (v === undefined || v === null || v === "" ? undefined : v === "on" || v === "true" || v === true),
  z.boolean().optional(),
);

export const listingAttributesSchema = z
  .object({
    kvadratura: attrNumber(LIMITS.kvadraturaMax),
    brojSoba: attrNumber(LIMITS.brojSobaMax),
    sprat: attrText,
    brojKupatila: attrNumber(LIMITS.brojKupatilaMax),
    grejanje: attrText,
    orijentacija: attrText,
    terasaM2: attrNumber(LIMITS.terasaMax),
    lift: attrBool,
    garaznoMesto: attrBool,
    uknjizen: attrBool,
    rokUseljenja: attrText,
    energetskiRazred: attrText,
  })
  // Defaulted, so a caller that has no specification to send — a draft
  // saved from an older client, a test fixture — is still valid. Every
  // field inside is optional, but the KEY would otherwise be required.
  .default({});

const base = {
  title,
  description,
  attributes: listingAttributesSchema,
  // Optional in the base, required by the publish schema below — the
  // same shape as categoryId and contact. A draft exists to hold
  // half-finished work, so nothing that only a buyer needs may block
  // saving one. Mirrors listings_active_needs_condition.
  condition: z.enum(LISTING_CONDITIONS, { message: COPY.validation.invalidCondition }).nullable(),
  // NOT nullable, and required on drafts too: the column is NOT NULL
  // with a `prodaja` default, and a listing whose price could mean
  // either a sale or a monthly rent is not a half-finished draft, it is
  // an ambiguous one.
  purpose: z.enum(LISTING_PURPOSES, { message: COPY.validation.invalidPurpose }),
  priceEur,
  isNegotiable: z.boolean(),
  location,
  categoryId: z.uuid({ message: COPY.validation.invalidCategory }).nullable(),
  contactName: z.string().trim().max(120),
  contactPhone,
  contactEmail,
  imagePaths,
};

/** Lenient: lets a seller park an incomplete listing as a draft. */
export const listingDraftSchema = z.object({
  ...base,
  status: z.literal("nacrt"),
});

/**
 * Strict: everything a buyer needs in order to act on the listing.
 * Mirrors the listings_active_needs_contact / _needs_category CHECK
 * constraints, and adds the at-least-one-photo rule.
 */
export const listingPublishSchema = z
  .object({
    ...base,
    condition: z.enum(LISTING_CONDITIONS, {
      message: COPY.validation.invalidCondition,
    }),
    description: description.min(LIMITS.descriptionMin, {
      message: COPY.validation.descriptionLength,
    }),
    location: location.min(LIMITS.locationMin, {
      message: COPY.validation.locationLength,
    }),
    categoryId: z.uuid({ message: COPY.validation.invalidCategory }),
    imagePaths: imagePaths.min(1, { message: COPY.validation.imagesRequired }),
    status: z.enum(["aktivan", "prodato"]),
  })
  .refine((data) => data.contactPhone !== null || data.contactEmail !== null, {
    message: COPY.validation.contactRequired,
    path: ["contactPhone"],
  });

export type ListingDraftInput = z.infer<typeof listingDraftSchema>;
export type ListingPublishInput = z.infer<typeof listingPublishSchema>;
export type ListingInput = ListingDraftInput | ListingPublishInput;

export const listingStatusSchema = z.enum(LISTING_STATUSES);

/**
 * Picks the schema from the submitted status, so the caller does not
 * have to branch. A status the client made up falls through to the
 * strict schema and is rejected there.
 */
export function schemaForStatus(status: unknown) {
  return status === "nacrt" ? listingDraftSchema : listingPublishSchema;
}

/**
 * Raw phone check, run before parsing. Without it a malformed number
 * transforms to null and then surfaces as the misleading "enter a phone
 * or an email" error instead of "this phone number is invalid".
 */
export function phoneIsUsable(raw: string | null | undefined): boolean {
  if (!raw || raw.trim() === "") return true;
  return normalizePhone(raw) !== null;
}
