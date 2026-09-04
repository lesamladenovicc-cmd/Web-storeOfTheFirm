"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { COPY } from "@/config/copy";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { ACTION_IDLE } from "@/types/domain";
import { submitInquiryAction } from "@/app/oglas/[slug]/actions";

export function InquiryForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(submitInquiryAction, ACTION_IDLE);
  // Captured once at mount via a lazy initializer: a scripted post
  // fills and submits far faster than a human can. useRef(Date.now())
  // would be an impure call during render, and reading .current during
  // render is unsound under the React compiler.
  const [mountedAt] = useState(() => Date.now());

  if (state.ok) {
    return (
      <Alert tone="success" title={COPY.contact.successTitle}>
        {COPY.contact.successBody}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="text-h3 text-fg">{COPY.contact.inquiryTitle}</h2>
        <p className="text-fg-muted mt-1.5 text-sm">{COPY.contact.inquirySubtitle}</p>
      </div>

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="startedAt" value={mountedAt} />

      {/* Honeypot: hidden from humans, filled by naive bots. Not
          display:none — some bots skip those. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Ne popunjavajte ovo polje</label>
        <input id="website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Field label={COPY.contact.name} name="senderName" error={state.fieldErrors?.senderName}>
        {(aria) => (
          <Input
            {...aria}
            name="senderName"
            required
            autoComplete="name"
            placeholder={COPY.contact.namePlaceholder}
            hasError={Boolean(state.fieldErrors?.senderName)}
          />
        )}
      </Field>

      <Field label={COPY.contact.phone} name="senderPhone" error={state.fieldErrors?.senderPhone}>
        {(aria) => (
          <Input
            {...aria}
            name="senderPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={COPY.contact.phonePlaceholder}
            hasError={Boolean(state.fieldErrors?.senderPhone)}
          />
        )}
      </Field>

      <Field
        label={COPY.contact.email}
        name="senderEmail"
        optional
        error={state.fieldErrors?.senderEmail}
      >
        {(aria) => (
          <Input
            {...aria}
            name="senderEmail"
            type="email"
            autoComplete="email"
            placeholder={COPY.contact.emailPlaceholder}
            hasError={Boolean(state.fieldErrors?.senderEmail)}
          />
        )}
      </Field>

      <Field label={COPY.contact.message} name="message" error={state.fieldErrors?.message}>
        {(aria) => (
          <Textarea
            {...aria}
            name="message"
            required
            rows={5}
            placeholder={COPY.contact.messagePlaceholder}
            hasError={Boolean(state.fieldErrors?.message)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Spinner />
            {COPY.contact.submitting}
          </>
        ) : (
          COPY.contact.submit
        )}
      </Button>

      <p className="text-fg-faint text-xs leading-relaxed">
        <Link
          href="/politika-privatnosti"
          className="hover:text-fg underline underline-offset-2 transition-colors"
        >
          {COPY.contact.consent}
        </Link>
      </p>
    </form>
  );
}
