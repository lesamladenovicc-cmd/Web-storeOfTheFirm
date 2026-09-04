"use client";

import { useActionState, useState, useTransition } from "react";
import { COPY } from "@/config/copy";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { ACTION_IDLE, type CategoryWithCount } from "@/types/domain";
import {
  createCategoryAction,
  deleteCategoryAction,
  toggleCategoryActiveAction,
  updateCategoryAction,
} from "./actions";

export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      {creating ? (
        <CategoryForm
          mode="create"
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <Button onClick={() => setCreating(true)}>{COPY.dashboard.categories.create}</Button>
      )}

      <ul className="divide-line border-line divide-y overflow-hidden rounded-md border">
        {categories.map((category) =>
          editing === category.id ? (
            <li key={category.id} className="bg-panel p-5">
              <CategoryForm
                mode="edit"
                category={category}
                onDone={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <CategoryRow
              key={category.id}
              category={category}
              onEdit={() => setEditing(category.id)}
            />
          ),
        )}
      </ul>
    </div>
  );
}

function CategoryRow({ category, onEdit }: { category: CategoryWithCount; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className={cn("bg-panel p-5", !category.isActive && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="font-display text-fg font-semibold">{category.name}</p>
            {!category.isActive ? (
              <Badge tone="danger">{COPY.dashboard.users.inactive}</Badge>
            ) : null}
          </div>
          <p className="u-numeric text-fg-faint mt-1 text-xs">
            /{category.slug} · {COPY.dashboard.categories.colCount}: {category.listingCount} ·{" "}
            {COPY.dashboard.categories.colOrder}: {category.sortOrder}
          </p>
          {category.description ? (
            <p className="text-fg-muted mt-2 max-w-[60ch] text-sm">{category.description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs">
          <button
            type="button"
            onClick={onEdit}
            className="text-fg-muted hover:text-accent-text underline-offset-4 transition-colors hover:underline"
          >
            {COPY.common.edit}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(
                () => void toggleCategoryActiveAction(category.id, !category.isActive),
              )
            }
            className="text-fg-muted hover:text-accent-text underline-offset-4 transition-colors hover:underline disabled:opacity-40"
          >
            {category.isActive ? COPY.dashboard.users.deactivate : COPY.dashboard.users.activate}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteCategoryAction(category.id);
                if (!result.ok) setError(result.message ?? COPY.validation.genericError);
              })
            }
            className="text-fg-faint hover:text-danger underline-offset-4 transition-colors hover:underline disabled:opacity-40"
          >
            {COPY.common.delete}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
    </li>
  );
}

function CategoryForm({
  mode,
  category,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  category?: CategoryWithCount;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createCategoryAction : updateCategoryAction,
    ACTION_IDLE,
  );

  if (state.ok) {
    // Fires during render of the success state; cheap and idempotent.
    queueMicrotask(onDone);
  }

  return (
    <form
      action={formAction}
      className={cn("space-y-5", mode === "create" && "border-line bg-panel rounded-md border p-6")}
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      {state.message && !state.ok ? <Alert tone="danger">{state.message}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={COPY.dashboard.categories.name} name="name" error={state.fieldErrors?.name}>
          {(aria) => (
            <Input
              {...aria}
              name="name"
              defaultValue={category?.name ?? ""}
              required
              maxLength={60}
              hasError={Boolean(state.fieldErrors?.name)}
            />
          )}
        </Field>

        <Field
          label={COPY.dashboard.categories.slug}
          name="slug"
          optional
          error={state.fieldErrors?.slug}
          hint="Ostavite prazno da se generiše iz naziva."
        >
          {(aria) => (
            <Input
              {...aria}
              name="slug"
              defaultValue={category?.slug ?? ""}
              maxLength={60}
              className="u-numeric"
              hasError={Boolean(state.fieldErrors?.slug)}
            />
          )}
        </Field>
      </div>

      <Field
        label={COPY.dashboard.categories.description}
        name="description"
        optional
        error={state.fieldErrors?.description}
      >
        {(aria) => (
          <Input
            {...aria}
            name="description"
            defaultValue={category?.description ?? ""}
            maxLength={300}
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-6">
        <Field
          label={COPY.dashboard.categories.sortOrder}
          name="sortOrder"
          error={state.fieldErrors?.sortOrder}
        >
          {(aria) => (
            <Input
              {...aria}
              name="sortOrder"
              inputMode="numeric"
              defaultValue={category?.sortOrder ?? 0}
              className="u-numeric w-28"
            />
          )}
        </Field>

        <div className="pt-6">
          <Checkbox
            name="isActive"
            defaultChecked={category?.isActive ?? true}
            label={COPY.dashboard.categories.isActive}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {COPY.common.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {COPY.common.cancel}
        </Button>
      </div>
    </form>
  );
}
