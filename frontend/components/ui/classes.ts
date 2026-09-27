// Shared visual primitives. Values resolve to the home-page design tokens.
export const page = "w-full max-w-[1240px] mx-auto px-4 py-12 sm:py-16 lg:py-20";
export const kicker = "text-[11px] font-medium tracking-[0.14em] text-muted uppercase";
export const card = "min-w-0 rounded-[var(--nh-radius-lg)] border border-white/10 bg-surface p-6 shadow-[var(--nh-shadow-card)] transition-[border-color,background-color] duration-200 ease-out hover:border-white/14 hover:bg-surface-2";
export const cardStatic = "min-w-0 rounded-[var(--nh-radius-lg)] border border-white/10 bg-surface p-6 shadow-[var(--nh-shadow-card)]";
export const inputBase = "w-full rounded-[var(--nh-radius-md)] border border-white/10 bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-muted/70 focus:border-brand focus:bg-surface-3 focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50";
export const textareaBase = `${inputBase} min-h-[130px] resize-y`;
export const selectBase = inputBase;
export const label = "text-xs font-medium tracking-wide text-ink";
export const errorBox = "rounded-[var(--nh-radius-md)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-normal text-ink shadow-[var(--nh-shadow-inset)]";
export const successBox = "rounded-[var(--nh-radius-md)] border border-success/30 bg-success-soft px-4 py-3 text-sm font-normal text-ink shadow-[var(--nh-shadow-inset)]";

export function statusClasses(status: string): string {
  const s = status.toUpperCase();
  if (s === "PUBLISHED" || s === "ANSWERED") return "border border-success/35 bg-success-soft text-ink";
  if (s === "ARCHIVED" || s === "CANCELLED") return "border border-danger/35 bg-danger-soft text-ink";
  if (s === "PENDING" || s === "OPEN" || s === "DRAFT") return "border border-warning/35 bg-warning-soft text-ink";
  return "border border-white/10 bg-surface-2 text-muted";
}
export function cx(...parts: Array<string | false | null | undefined>): string { return parts.filter(Boolean).join(" "); }
