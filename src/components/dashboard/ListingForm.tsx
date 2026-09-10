"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { COPY } from "@/config/copy";
import {
  CONDITION_HINTS,
  CONDITION_LABELS,
  LISTING_CONDITIONS,
  LISTING_PURPOSES,
  PURPOSE_LABELS,
  type ListingPurpose,
} from "@/config/taxonomy";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { formatPhone } from "@/lib/format";
import { ACTION_IDLE, type ActionState, type Category, type Listing } from "@/types/domain";
import { ImageUploader, type UploadedImage } from "./ImageUploader";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Shared create/edit form.
 *
 * `status` is submitted by whichever button was pressed, which is what
 * selects the lenient draft schema or the strict publish schema on the
 * server. Client-side `required` attributes are UX only — the server
 * schema is the authority and RLS is the boundary behind it.
 */
export function ListingForm({
  action,
  listingId,
  sellerId,
  categories,
  listing,
  defaults,
  saved = false,
}: {
  action: Action;
  listingId: string;
  sellerId: string;
  categories: Category[];
  listing?: Listing;
  defaults?: { contactName: string; contactPhone: string; location: string };
  saved?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, ACTION_IDLE);

  const [images, setImages] = useState<UploadedImage[]>(
    () =>
      listing?.images.map((img) => ({
        key: img.id,
        path: img.storagePath,
        status: "done" as const,
      })) ?? [],
  );

  const [purpose, setPurpose] = useState<ListingPurpose>(listing?.purpose ?? "prodaja");
  const isRental = purpose === "izdavanje";

  const isEdit = Boolean(listing);
  const isPublished = listing?.status === "aktivan" || listing?.status === "prodato";
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-9">
      <input type="hidden" name="listingId" value={listingId} />

      {saved && !state.message ? (
        <Alert tone="success">
          {/* The listing's real status decides this. Hard-coding the
              draft copy told sellers "sačuvan kao nacrt" directly under
              an AKTIVAN badge, which reads as a failed publish. */}
          {listing?.status === "nacrt"
            ? COPY.dashboard.form.savedDraft
            : COPY.dashboard.form.published}
        </Alert>
      ) : null}
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert> : null}

      {/* ---------------- Basics ---------------- */}
      <section className="border-line bg-panel space-y-5 rounded-md border p-6">
        <h2 className="u-eyebrow text-fg-faint">{COPY.dashboard.form.sectionBasics}</h2>

        <Field
          label={COPY.dashboard.form.title}
          name="title"
          error={err?.title}
          hint={COPY.dashboard.form.titleHint}
        >
          {(aria) => (
            <Input
              {...aria}
              name="title"
              defaultValue={listing?.title ?? ""}
              placeholder={COPY.dashboard.form.titlePlaceholder}
              maxLength={120}
              required
              hasError={Boolean(err?.title)}
            />
          )}
        </Field>

        <Field label={COPY.dashboard.form.description} name="description" error={err?.description}>
          {(aria) => (
            <Textarea
              {...aria}
              name="description"
              defaultValue={listing?.description ?? ""}
              placeholder={COPY.dashboard.form.descriptionPlaceholder}
              rows={9}
              maxLength={5000}
              hasError={Boolean(err?.description)}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Controlled, unlike every other field here: the price label
              and the terminal-status button both have to follow it, and
              a seller who picks "Izdavanje" and still reads "Cena (€)"
              above an empty box types a sale price into a rent. */}
          <Field label={COPY.dashboard.form.purpose} name="purpose" error={err?.purpose}>
            {(aria) => (
              <Select
                {...aria}
                name="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as ListingPurpose)}
                hasError={Boolean(err?.purpose)}
              >
                {LISTING_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {PURPOSE_LABELS[p]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label={COPY.dashboard.form.condition} name="condition" error={err?.condition}>
            {(aria) => (
              <Select
                {...aria}
                name="condition"
                defaultValue={listing?.condition ?? ""}
                hasError={Boolean(err?.condition)}
              >
                <option value="" disabled>
                  {COPY.dashboard.form.conditionPlaceholder}
                </option>
                {LISTING_CONDITIONS.map((c) => (
                  <option key={c} value={c} title={CONDITION_HINTS[c]}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label={COPY.dashboard.form.category} name="categoryId" error={err?.categoryId}>
            {(aria) => (
              <Select
                {...aria}
                name="categoryId"
                defaultValue={listing?.categoryId ?? ""}
                hasError={Boolean(err?.categoryId)}
              >
                <option value="" disabled>
                  {COPY.dashboard.form.categoryPlaceholder}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isActive ? "" : " (neaktivna)"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={isRental ? COPY.listing.monthlyRent : COPY.dashboard.form.price}
            name="priceEur"
            error={err?.priceEur}
            hint={isRental ? COPY.dashboard.form.rentHint : COPY.dashboard.form.priceHint}
          >
            {(aria) => (
              <Input
                {...aria}
                name="priceEur"
                inputMode="numeric"
                defaultValue={listing?.priceEur ?? ""}
                placeholder={
                  isRental
                    ? COPY.dashboard.form.rentPlaceholder
                    : COPY.dashboard.form.pricePlaceholder
                }
                className="u-numeric"
                hasError={Boolean(err?.priceEur)}
              />
            )}
          </Field>

          <Field label={COPY.dashboard.form.location} name="location" error={err?.location}>
            {(aria) => (
              <Input
                {...aria}
                name="location"
                defaultValue={listing?.location ?? defaults?.location ?? ""}
                placeholder={COPY.dashboard.form.locationPlaceholder}
                maxLength={80}
                hasError={Boolean(err?.location)}
              />
            )}
          </Field>
        </div>

        <Checkbox
          name="isNegotiable"
          defaultChecked={listing?.isNegotiable ?? false}
          label={COPY.dashboard.form.negotiable}
        />
      </section>

      {/* ---------------- Specification ----------------
          The spec sheet the buyer reads, entered in the order they read
          it. Field names are prefixed `attr.` and land in the
          `attributes` jsonb rather than in columns — see
          listingAttributesSchema, which does all coercion, so every
          input here can stay a plain text/number box.

          Nothing is `required`: a garage has no room count, and a draft
          may be half-finished. Blank simply means "no such row". */}
      <section className="border-line bg-panel space-y-5 rounded-md border p-6">
        <div>
          <h2 className="u-eyebrow text-fg-faint">{COPY.dashboard.form.sectionAttributes}</h2>
          <p className="text-fg-muted mt-2 max-w-prose text-sm leading-relaxed">
            {COPY.dashboard.form.attributesHint}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={COPY.dashboard.form.attrKvadratura} name="attr.kvadratura">
            {(aria) => (
              <Input
                {...aria}
                name="attr.kvadratura"
                inputMode="decimal"
                defaultValue={listing?.attributes.kvadratura ?? ""}
                placeholder={COPY.dashboard.form.attrKvadraturaPlaceholder}
                className="u-numeric"
              />
            )}
          </Field>

          <Field label={COPY.dashboard.form.attrBrojSoba} name="attr.brojSoba">
            {(aria) => (
              <Input
                {...aria}
                name="attr.brojSoba"
                inputMode="decimal"
                defaultValue={listing?.attributes.brojSoba ?? ""}
                placeholder={COPY.dashboard.form.attrBrojSobaPlaceholder}
                className="u-numeric"
              />
            )}
          </Field>

          <Field label={COPY.dashboard.form.attrBrojKupatila} name="attr.brojKupatila">
            {(aria) => (
              <Input
                {...aria}
                name="attr.brojKupatila"
                inputMode="numeric"
                defaultValue={listing?.attributes.brojKupatila ?? ""}
                className="u-numeric"
              />
            )}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={COPY.dashboard.form.attrSprat} name="attr.sprat">
            {(aria) => (
              <Input
                {...aria}
                name="attr.sprat"
                defaultValue={listing?.attributes.sprat ?? ""}
                placeholder={COPY.dashboard.form.attrSpratPlaceholder}
                maxLength={60}
                className="u-numeric"
              />
            )}
          </Field>

          <Field label={COPY.dashboard.form.attrTerasa} name="attr.terasaM2">
            {(aria) => (
              <Input
                {...aria}
                name="attr.terasaM2"
                inputMode="decimal"
                defaultValue={listing?.attributes.terasaM2 ?? ""}
                className="u-numeric"
              />
            )}
          </Field>

          <Field label={COPY.dashboard.form.attrOrijentacija} name="attr.orijentacija">
            {(aria) => (
              <Input
                {...aria}
                name="attr.orijentacija"
                defaultValue={listing?.attributes.orijentacija ?? ""}
                placeholder={COPY.dashboard.form.attrOrijentacijaPlaceholder}
                maxLength={60}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={COPY.dashboard.form.attrGrejanje} name="attr.grejanje">
            {(aria) => (
              <Input
                {...aria}
                name="attr.grejanje"
                defaultValue={listing?.attributes.grejanje ?? ""}
                placeholder={COPY.dashboard.form.attrGrejanjePlaceholder}
                maxLength={60}
              />
            )}
          </Field>

          <Field label={COPY.dashboard.form.attrRokUseljenja} name="attr.rokUseljenja">
            {(aria) => (
              <Input
                {...aria}
                name="attr.rokUseljenja"
                defaultValue={listing?.attributes.rokUseljenja ?? ""}
                placeholder={COPY.dashboard.form.attrRokUseljenjaPlaceholder}
                maxLength={60}
              />
            )}
          </Field>

          <Field label={COPY.dashboard.form.attrEnergetskiRazred} name="attr.energetskiRazred">
            {(aria) => (
              <Input
                {...aria}
                name="attr.energetskiRazred"
                defaultValue={listing?.attributes.energetskiRazred ?? ""}
                placeholder={COPY.dashboard.form.attrEnergetskiRazredPlaceholder}
                maxLength={60}
                className="u-numeric"
              />
            )}
          </Field>
        </div>

        <div className="border-line grid gap-4 border-t pt-5 sm:grid-cols-3">
          <Checkbox
            name="attr.lift"
            defaultChecked={listing?.attributes.lift ?? false}
            label={COPY.dashboard.form.attrLift}
          />
          <Checkbox
            name="attr.garaznoMesto"
            defaultChecked={listing?.attributes.garaznoMesto ?? false}
            label={COPY.dashboard.form.attrGaraznoMesto}
          />
          <Checkbox
            name="attr.uknjizen"
            defaultChecked={listing?.attributes.uknjizen ?? false}
            label={COPY.dashboard.form.attrUknjizen}
          />
        </div>
      </section>

      {/* ---------------- Images ---------------- */}
      <section className="border-line bg-panel space-y-5 rounded-md border p-6">
        <div>
          <h2 className="u-eyebrow text-fg-faint">{COPY.dashboard.form.sectionImages}</h2>
          {err?.imagePaths ? (
            <p role="alert" className="text-danger mt-2 text-sm">
              {err.imagePaths}
            </p>
          ) : null}
        </div>

        <ImageUploader
          sellerId={sellerId}
          listingId={listingId}
          value={images}
          onChange={setImages}
        />
      </section>

      {/* ---------------- Contact ---------------- */}
      <section className="border-line bg-panel space-y-5 rounded-md border p-6">
        <div>
          <h2 className="u-eyebrow text-fg-faint">{COPY.dashboard.form.sectionContact}</h2>
          <p className="text-fg-faint mt-2 text-sm">{COPY.dashboard.form.contactHint}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label={COPY.dashboard.form.contactName}
            name="contactName"
            error={err?.contactName}
          >
            {(aria) => (
              <Input
                {...aria}
                name="contactName"
                defaultValue={listing?.contactName ?? defaults?.contactName ?? ""}
                maxLength={120}
                hasError={Boolean(err?.contactName)}
              />
            )}
          </Field>

          <Field
            label={COPY.dashboard.form.contactPhone}
            name="contactPhone"
            error={err?.contactPhone}
          >
            {(aria) => (
              <Input
                {...aria}
                name="contactPhone"
                type="tel"
                defaultValue={
                  listing?.contactPhone
                    ? formatPhone(listing.contactPhone)
                    : defaults?.contactPhone
                      ? formatPhone(defaults.contactPhone)
                      : ""
                }
                placeholder={COPY.contact.phonePlaceholder}
                hasError={Boolean(err?.contactPhone)}
              />
            )}
          </Field>

          <Field
            label={COPY.dashboard.form.contactEmail}
            name="contactEmail"
            error={err?.contactEmail}
          >
            {(aria) => (
              <Input
                {...aria}
                name="contactEmail"
                type="email"
                defaultValue={listing?.contactEmail ?? ""}
                placeholder={COPY.contact.emailPlaceholder}
                hasError={Boolean(err?.contactEmail)}
              />
            )}
          </Field>
        </div>
      </section>

      {/* ---------------- Actions ---------------- */}
      <div className="border-line flex flex-wrap items-center gap-3 border-t pt-6">
        <Button type="submit" name="status" value="nacrt" variant="outline" disabled={pending}>
          {COPY.dashboard.form.saveDraft}
        </Button>

        <Button type="submit" name="status" value="aktivan" variant="primary" disabled={pending}>
          {pending ? <Spinner /> : null}
          {isPublished ? COPY.dashboard.form.update : COPY.dashboard.form.publish}
        </Button>

        {isEdit && listing?.status === "aktivan" ? (
          <Button
            type="submit"
            name="status"
            value="prodato"
            variant="secondary"
            disabled={pending}
          >
            {isRental ? COPY.dashboard.form.markRented : COPY.dashboard.form.markSold}
          </Button>
        ) : null}

        {isEdit && listing?.status === "prodato" ? (
          <Button
            type="submit"
            name="status"
            value="aktivan"
            variant="secondary"
            disabled={pending}
          >
            {isRental ? COPY.dashboard.form.markAvailable : COPY.dashboard.form.markActive}
          </Button>
        ) : null}

        <Link
          href="/dashboard/oglasi"
          className="text-fg-muted hover:text-fg ml-auto text-sm transition-colors"
        >
          {COPY.common.cancel}
        </Link>
      </div>
    </form>
  );
}
