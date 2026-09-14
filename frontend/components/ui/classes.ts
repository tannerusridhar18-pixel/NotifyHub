// Central Tailwind utility strings for NotifyHub's design system.
// Keeping these in one place means every page composes the same
// primitives instead of re-deriving spacing/border/shadow decisions.

export const page = "w-full max-w-[1180px] mx-auto px-4 py-14 sm:py-16 lg:py-20";

export const kicker = "text-[11px] font-bold tracking-wide text-brand uppercase";

export const card =
  "min-w-0 rounded-2xl border border-border bg-surface p-6 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-glow";

export const cardStatic = "min-w-0 rounded-2xl border border-border bg-surface p-6 shadow-soft";

export const inputBase =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60";

export const textareaBase = `${inputBase} min-h-[130px] resize-y`;

export const selectBase = inputBase;

export const label = "text-xs font-semibold text-ink";

export const errorBox = "rounded-xl border border-danger-soft bg-danger-soft px-3.5 py-3 text-sm font-medium text-[#ffb4ac]";

export const successBox = "rounded-xl border border-success-soft bg-success-soft px-3.5 py-3 text-sm font-medium text-[#8ff0c8]";

export function statusClasses(status: string): string {
  const s = status.toUpperCase();
  if (s === "PUBLISHED" || s === "ANSWERED") return "bg-success-soft text-[#8ff0c8]";
  if (s === "ARCHIVED" || s === "CANCELLED") return "bg-danger-soft text-[#ffb4ac]";
  if (s === "PENDING" || s === "OPEN") return "bg-warning-soft text-[#ffd98f]";
  return "bg-surface-2 text-muted";
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
