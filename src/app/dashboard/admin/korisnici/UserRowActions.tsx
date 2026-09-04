"use client";

import { useTransition } from "react";
import { COPY } from "@/config/copy";
import { ROLE_LABELS, USER_ROLES } from "@/config/taxonomy";
import { setUserActiveAction, setUserRoleAction } from "./actions";
import type { Profile } from "@/types/domain";

/**
 * `isSelf` disables both controls: an admin demoting or deactivating
 * themselves is the one move that can lock the last administrator out
 * of the system. The server refuses it too — this only avoids offering
 * an action that would fail.
 */
export function UserRowActions({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3">
      <label className="sr-only" htmlFor={`role-${user.id}`}>
        {COPY.dashboard.users.changeRole}
      </label>
      <select
        id={`role-${user.id}`}
        defaultValue={user.role}
        disabled={isSelf || pending}
        onChange={(e) => startTransition(() => void setUserRoleAction(user.id, e.target.value))}
        className="border-line bg-ground text-fg h-8 cursor-pointer rounded-xs border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        {USER_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={isSelf || pending}
        onClick={() => startTransition(() => void setUserActiveAction(user.id, !user.isActive))}
        className="text-fg-faint hover:text-accent-text text-xs underline-offset-4 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
      >
        {user.isActive ? COPY.dashboard.users.deactivate : COPY.dashboard.users.activate}
      </button>
    </div>
  );
}
