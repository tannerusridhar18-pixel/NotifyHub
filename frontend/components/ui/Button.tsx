import { cx } from "./classes";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "cyan" | "danger" | "dark";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold tracking-wide transition-[transform,opacity,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:active:translate-y-0 select-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "btn-shine bg-gradient-to-r from-brand via-brand-light to-brand-2 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_12px_28px_-6px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.28),0_18px_36px_-4px_rgba(147,51,234,0.7)]",
  secondary:
    "border border-border/90 bg-surface-2 text-ink hover:-translate-y-0.5 hover:border-brand-light/60 hover:bg-surface-3 hover:shadow-card-hover hover:text-white",
  ghost:
    "border border-brand/40 bg-brand-50/70 text-brand-light hover:bg-brand-50 hover:border-brand-light/80 hover:shadow-glow/40",
  cyan:
    "btn-shine bg-gradient-to-r from-cyan via-cyan-light to-teal-light text-[#021019] font-extrabold shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_12px_28px_-6px_rgba(0,210,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_18px_36px_-4px_rgba(0,245,160,0.65)]",
  danger:
    "btn-shine bg-gradient-to-r from-danger via-[#ff6b8b] to-danger text-white shadow-[0_10px_25px_-5px_rgba(255,42,95,0.55)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-4px_rgba(255,42,95,0.7)]",
  dark:
    "btn-shine bg-ink-900 text-ink border border-white/12 hover:-translate-y-0.5 hover:shadow-lift hover:border-white/25",
};

// Class string for non-<button> elements (e.g. <Link>) styled as buttons.
export function buttonClasses(variant: ButtonVariant = "primary", extra = ""): string {
  return cx(base, variants[variant], extra);
}

export default function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={cx(base, variants[variant], className)} {...props} />;
}


