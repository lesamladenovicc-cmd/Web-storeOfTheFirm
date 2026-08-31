"use client";

import { useActionState } from "react";
import { COPY } from "@/config/copy";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { ACTION_IDLE } from "@/types/domain";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, ACTION_IDLE);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field label={COPY.auth.email} name="email" error={state.fieldErrors?.email}>
        {(aria) => (
          <Input
            {...aria}
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            hasError={Boolean(state.fieldErrors?.email)}
          />
        )}
      </Field>

      <Field label={COPY.auth.password} name="password" error={state.fieldErrors?.password}>
        {(aria) => (
          <Input
            {...aria}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            hasError={Boolean(state.fieldErrors?.password)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Spinner />
            {COPY.auth.submitting}
          </>
        ) : (
          COPY.auth.submit
        )}
      </Button>
    </form>
  );
}
