/**
 * Minimal class-name joiner. Avoids pulling in clsx + tailwind-merge for
 * what is, in this codebase, a filter-and-join. Variant maps below never
 * emit conflicting utilities for the same property, so merge semantics
 * are not needed.
 */
export type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue) => {
    if (!value && value !== 0) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    out.push(String(value));
  };

  inputs.forEach(walk);
  return out.join(" ");
}
