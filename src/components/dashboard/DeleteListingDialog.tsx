"use client";

import { useActionState, useState } from "react";
import { COPY } from "@/config/copy";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { ACTION_IDLE } from "@/types/domain";
import { deleteListingAction } from "@/app/dashboard/oglasi/actions";

/**
 * Deletion requires typing the listing title.
 *
 * The confirmation is re-checked on the server, not just here — a
 * client-side guard on a destructive, irreversible action is a UX
 * affordance, not a control.
 */
export function DeleteListingDialog({ listingId, title }: { listingId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteListingAction, ACTION_IDLE);

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        {COPY.common.delete}
      </Button>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="listingId" value={listingId} />

      {state.message && !state.ok ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field
        label={COPY.dashboard.delete.confirmLabel}
        name="confirmTitle"
        error={state.fieldErrors?.confirmTitle}
      >
        {(aria) => (
          <Input
            {...aria}
            name="confirmTitle"
            autoComplete="off"
            autoFocus
            placeholder={title}
            hasError={Boolean(state.fieldErrors?.confirmTitle)}
          />
        )}
      </Field>

      <div className="flex gap-3">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? <Spinner /> : null}
          {COPY.dashboard.delete.confirm}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {COPY.common.cancel}
        </Button>
      </div>
    </form>
  );
}
