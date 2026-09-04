"use client";

import { useActionState } from "react";
import { COPY } from "@/config/copy";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { formatPhone } from "@/lib/format";
import { ACTION_IDLE, type Profile } from "@/types/domain";
import { updateProfileAction } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, ACTION_IDLE);

  return (
    <form action={formAction} className="max-w-md space-y-5">
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert> : null}

      <Field
        label={COPY.dashboard.settings.fullName}
        name="fullName"
        error={state.fieldErrors?.fullName}
      >
        {(aria) => (
          <Input {...aria} name="fullName" defaultValue={profile.fullName} maxLength={120} />
        )}
      </Field>

      <Field
        label={COPY.dashboard.settings.phone}
        name="phone"
        error={state.fieldErrors?.phone}
        hint={COPY.dashboard.settings.profileHint}
      >
        {(aria) => (
          <Input
            {...aria}
            name="phone"
            type="tel"
            defaultValue={profile.phone ? formatPhone(profile.phone) : ""}
            placeholder={COPY.contact.phonePlaceholder}
            hasError={Boolean(state.fieldErrors?.phone)}
          />
        )}
      </Field>

      <Field
        label={COPY.dashboard.settings.location}
        name="location"
        error={state.fieldErrors?.location}
      >
        {(aria) => (
          <Input
            {...aria}
            name="location"
            defaultValue={profile.location ?? ""}
            placeholder={COPY.listings.locationPlaceholder}
            maxLength={80}
          />
        )}
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : null}
        {COPY.common.save}
      </Button>
    </form>
  );
}
