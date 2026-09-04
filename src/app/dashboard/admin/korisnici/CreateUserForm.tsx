"use client";

import { useActionState, useState } from "react";
import { COPY } from "@/config/copy";
import { ROLE_LABELS, USER_ROLES } from "@/config/taxonomy";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { ACTION_IDLE } from "@/types/domain";
import { createUserAction } from "./actions";

export function CreateUserForm() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(createUserAction, ACTION_IDLE);

  // Shown exactly once; there is no way to retrieve it afterwards.
  const credentials = state.ok ? state.data : undefined;

  if (credentials) {
    return (
      <div className="border-success/40 bg-success-soft rounded-md border p-6">
        <h2 className="font-display text-success text-base font-semibold">
          {COPY.dashboard.users.tempPasswordTitle}
        </h2>
        <p className="text-fg-muted mt-2 max-w-[60ch] text-sm">
          {COPY.dashboard.users.tempPasswordBody}
        </p>

        <dl className="mt-5 space-y-3">
          <div>
            <dt className="u-eyebrow text-fg-faint">{COPY.auth.email}</dt>
            <dd className="u-numeric text-fg mt-1">{credentials.email}</dd>
          </div>
          <div>
            <dt className="u-eyebrow text-fg-faint">{COPY.dashboard.users.tempPasswordLabel}</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3">
              <code className="u-numeric border-line bg-ground text-accent-text rounded-sm border px-3 py-2 text-lg">
                {credentials.password}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(credentials.password).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="border-line-strong text-fg hover:border-accent hover:text-accent-text h-9 rounded-sm border px-3.5 text-sm transition-colors"
              >
                {copied ? COPY.common.copied : COPY.common.copy}
              </button>
            </dd>
          </div>
        </dl>

        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setOpen(false);
            // Full reload drops the one-time credentials from memory and
            // refreshes the user table.
            window.location.reload();
          }}
        >
          {COPY.common.close}
        </Button>
      </div>
    );
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>{COPY.dashboard.users.create}</Button>;
  }

  return (
    <form
      action={formAction}
      className="border-line bg-panel max-w-md space-y-5 rounded-md border p-6"
    >
      <div>
        <h2 className="font-display text-fg text-base font-semibold">
          {COPY.dashboard.users.createTitle}
        </h2>
        <p className="text-fg-faint mt-1.5 text-sm">{COPY.dashboard.users.createBody}</p>
      </div>

      {state.message && !state.ok ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field label={COPY.auth.email} name="email" error={state.fieldErrors?.email}>
        {(aria) => (
          <Input
            {...aria}
            name="email"
            type="email"
            required
            autoFocus
            hasError={Boolean(state.fieldErrors?.email)}
          />
        )}
      </Field>

      <Field
        label={COPY.dashboard.settings.fullName}
        name="fullName"
        error={state.fieldErrors?.fullName}
      >
        {(aria) => (
          <Input
            {...aria}
            name="fullName"
            required
            hasError={Boolean(state.fieldErrors?.fullName)}
          />
        )}
      </Field>

      <Field label={COPY.dashboard.users.colRole} name="role" error={state.fieldErrors?.role}>
        {(aria) => (
          <Select {...aria} name="role" defaultValue="seller">
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {COPY.dashboard.users.create}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {COPY.common.cancel}
        </Button>
      </div>
    </form>
  );
}
