// Central Tailwind utility strings for NotifyHub's design system.
// Keeping these in one place ensures every page composes the same
// high-aesthetic primitives (glass surfaces, glowing borders, crisp inputs).

export const page = "w-full max-w-[1240px] mx-auto px-4 py-12 sm:py-16 lg:py-20";

export const kicker = "text-[11px] font-extrabold tracking-[0.14em] text-brand-light uppercase";

export const card =
  "min-w-0 rounded-2xl border border-border/90 bg-surface p-6 shadow-soft transition-[transform,opacity,border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-brand-light/60 hover:bg-surface-2 hover:shadow-card-hover hover:shadow-glow/40";

export const cardStatic = "min-w-0 rounded-2xl border border-border/90 bg-surface p-6 shadow-soft";

export const inputBase =
  "w-full rounded-xl border border-border/90 bg-surface-2/95 px-4 py-3 text-sm text-ink outline-none transition-[border-color,box-shadow,background-color] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-muted/60 focus:border-brand-light focus:bg-surface-3/90 focus:ring-4 focus:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50";

export const textareaBase = `${inputBase} min-h-[130px] resize-y`;

export const selectBase = inputBase;

export const label = "text-xs font-bold tracking-wide text-ink";

export const errorBox = "rounded-xl border border-danger/45 bg-danger-soft/95 px-4 py-3 text-sm font-medium text-[#fca5a5] shadow-[0_0_20px_rgba(255,42,95,0.2)] backdrop-blur-sm";

export const successBox = "rounded-xl border border-success/45 bg-success-soft/95 px-4 py-3 text-sm font-medium text-[#6ee7b7] shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-sm";

export function statusClasses(status: string): string {
  const s = status.toUpperCase();
  if (s === "PUBLISHED" || s === "ANSWERED") return "border border-success/45 bg-success-soft/90 text-[#6ee7b7] shadow-[0_0_12px_rgba(16,185,129,0.25)]";
  if (s === "ARCHIVED" || s === "CANCELLED") return "border border-danger/45 bg-danger-soft/90 text-[#fca5a5] shadow-[0_0_12px_rgba(255,42,95,0.25)]";
  if (s === "PENDING" || s === "OPEN" || s === "DRAFT") return "border border-warning/45 bg-warning-soft/90 text-[#fde047] shadow-[0_0_12px_rgba(245,158,11,0.25)]";
  return "border border-border/90 bg-surface-2 text-muted";
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}


