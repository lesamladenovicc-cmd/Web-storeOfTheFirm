import { cn } from "@/lib/cn";

/**
 * The printer's colour control strip — four signal squares in a row.
 *
 * On a real technical sheet the bar sits in the margin so the press can
 * check its inks; here it is the one place all four signal colours
 * appear together, and it marks the corners where the sheet is "signed":
 * the hero data plate and the footer. Decorative, so always aria-hidden.
 */
export function ColorBar({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 gap-1", className)}>
      <span className="bg-signal h-1.5 w-1.5" />
      <span className="bg-signal-blue h-1.5 w-1.5" />
      <span className="bg-signal-red h-1.5 w-1.5" />
      <span className="bg-signal-green h-1.5 w-1.5" />
    </span>
  );
}
