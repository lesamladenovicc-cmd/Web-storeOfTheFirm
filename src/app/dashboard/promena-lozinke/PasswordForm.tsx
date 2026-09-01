"use client";

import { useActionState } from "react";
import { COPY } from "@/config/copy";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { ACTION_IDLE } from "@/types/domain";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, ACTION_IDLE);

  return (
    <form action={formAction} className="max-w-sm space-y-5">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field label={COPY.auth.newPassword} name="password" error={state.fieldErrors?.password}>
        {(aria) => (
          <Input
            {...aria}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            autoFocus
            hasError={Boolean(state.fieldErrors?.password)}
          />
        )}
      </Field>

      <Field
        label={COPY.auth.confirmPassword}
        name="passwordConfirm"
        error={state.fieldErrors?.passwordConfirm}
      >
        {(aria) => (
          <Input
            {...aria}
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            hasError={Boolean(state.fieldErrors?.passwordConfirm)}
          />
        )}
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Spinner /> : null}
        {COPY.auth.changePasswordSubmit}
      </Button>
    </form>
  );
}
