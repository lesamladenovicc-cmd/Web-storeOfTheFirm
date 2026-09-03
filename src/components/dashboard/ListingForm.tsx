"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { COPY } from "@/config/copy";
import {
  CONDITION_HINTS,
  CONDITION_LABELS,
  LISTING_CONDITIONS,
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
      {state.message ? (
        <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
      ) : null}

      {/* ---------------- Basics ---------------- */}
      <section className="space-y-5 rounded-md border border-border bg-surface p-6">
        <h2 className="u-eyebrow text-paper-faint">
          {COPY.dashboard.form.sectionBasics}
        </h2>

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
            label={COPY.dashboard.form.price}
            name="priceRsd"
            error={err?.priceRsd}
            hint={COPY.dashboard.form.priceHint}
          >
            {(aria) => (
              <Input
                {...aria}
                name="priceRsd"
                inputMode="numeric"
                defaultValue={listing?.priceRsd ?? ""}
                placeholder={COPY.dashboard.form.pricePlaceholder}
                className="u-numeric"
                hasError={Boolean(err?.priceRsd)}
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

      {/* ---------------- Images ---------------- */}
      <section className="space-y-5 rounded-md border border-border bg-surface p-6">
        <div>
          <h2 className="u-eyebrow text-paper-faint">
            {COPY.dashboard.form.sectionImages}
          </h2>
          {err?.imagePaths ? (
            <p role="alert" className="mt-2 text-sm text-danger">
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
      <section className="space-y-5 rounded-md border border-border bg-surface p-6">
        <div>
          <h2 className="u-eyebrow text-paper-faint">
            {COPY.dashboard.form.sectionContact}
          </h2>
          <p className="mt-2 text-sm text-paper-faint">
            {COPY.dashboard.form.contactHint}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={COPY.dashboard.form.contactName} name="contactName" error={err?.contactName}>
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

          <Field label={COPY.dashboard.form.contactPhone} name="contactPhone" error={err?.contactPhone}>
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

          <Field label={COPY.dashboard.form.contactEmail} name="contactEmail" error={err?.contactEmail}>
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
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button
          type="submit"
          name="status"
          value="nacrt"
          variant="outline"
          disabled={pending}
        >
          {COPY.dashboard.form.saveDraft}
        </Button>

        <Button
          type="submit"
          name="status"
          value="aktivan"
          variant="primary"
          disabled={pending}
        >
          {pending ? <Spinner /> : null}
          {isPublished ? COPY.dashboard.form.update : COPY.dashboard.form.publish}
        </Button>

        {isEdit && listing?.status === "aktivan" ? (
          <Button type="submit" name="status" value="prodato" variant="secondary" disabled={pending}>
            {COPY.dashboard.form.markSold}
          </Button>
        ) : null}

        {isEdit && listing?.status === "prodato" ? (
          <Button type="submit" name="status" value="aktivan" variant="secondary" disabled={pending}>
            {COPY.dashboard.form.markActive}
          </Button>
        ) : null}

        <Link
          href="/dashboard/oglasi"
          className="ml-auto text-sm text-paper-muted transition-colors hover:text-paper"
        >
          {COPY.common.cancel}
        </Link>
      </div>
    </form>
  );
}
