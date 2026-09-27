// Central Tailwind utility strings for NotifyHub's design system.
// Keeping these in one place ensures every page composes the same
// high-aesthetic primitives (glass surfaces, glowing borders, crisp inputs).

export const page = "w-full max-w-[1240px] mx-auto px-4 py-12 sm:py-16 lg:py-20";

export const kicker = "text-[11px] font-normal tracking-[0.14em] text-[var(--color-ash)] uppercase";

export const card = "min-w-0 rounded-[var(--radius-cards)] border border-white/12 bg-[var(--color-graphite)] p-6 shadow-[var(--shadow-subtle)] transition-colors duration-200 hover:border-white/20 hover:bg-[var(--color-carbon)]";

export const cardStatic = "min-w-0 rounded-[var(--radius-cards)] border border-white/12 bg-[var(--color-graphite)] p-6 shadow-[var(--shadow-subtle)]";

export const inputBase = "w-full rounded-[var(--radius-inputs)] border border-white/12 bg-[var(--color-iron)] px-4 py-3 text-sm text-[var(--color-paper)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-[var(--color-ash)] focus:border-[var(--color-signal-blue)] focus:bg-[var(--color-steel)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-signal-blue)_25%,transparent)] disabled:cursor-not-allowed disabled:opacity-50";

export const textareaBase = `${inputBase} min-h-[130px] resize-y`;

export const selectBase = inputBase;

export const label = "text-xs font-normal tracking-wide text-[var(--color-paper)]";

export const errorBox = "rounded-[var(--radius-inputs)] border border-white/12 bg-[var(--color-graphite)] px-4 py-3 text-sm font-normal text-[var(--color-paper)] shadow-[var(--shadow-subtle)]";

export const successBox = "rounded-[var(--radius-inputs)] border border-white/12 bg-[var(--color-graphite)] px-4 py-3 text-sm font-normal text-[var(--color-paper)] shadow-[var(--shadow-subtle)]";

export function statusClasses(status: string): string {
  const s = status.toUpperCase();
  if (s === "PUBLISHED" || s === "ANSWERED") return "border border-[var(--color-signal-blue)]/50 bg-[var(--color-carbon)] text-[var(--color-paper)]";
  if (s === "ARCHIVED" || s === "CANCELLED") return "border border-white/20 bg-[var(--color-graphite)] text-[var(--color-ash)]";
  if (s === "PENDING" || s === "OPEN" || s === "DRAFT") return "border border-white/20 bg-[var(--color-iron)] text-[var(--color-paper)]";
  return "border border-white/12 bg-[var(--color-graphite)] text-[var(--color-ash)]";
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}


