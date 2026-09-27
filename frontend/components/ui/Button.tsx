import { cx } from "./classes";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "cyan" | "danger" | "dark";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--nh-radius-pill)] px-5 py-2.5 text-sm font-medium tracking-[0.01em] transition-[transform,opacity,border-color,background-color] duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:active:translate-y-0 select-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "btn-shine bg-gradient-to-r from-brand via-brand-light to-brand-2 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_12px_28px_-6px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.28),0_18px_36px_-4px_rgba(147,51,234,0.7)]",
  secondary: "border border-white/10 bg-surface-2 text-ink hover:border-white/14 hover:bg-surface-3",
  ghost: "border border-white/10 bg-transparent text-muted hover:bg-surface-2 hover:text-ink",
  cyan: "btn-shine bg-brand text-black shadow-[var(--nh-shadow-inset)] hover:brightness-105",
  danger: "btn-shine bg-danger text-white shadow-[var(--nh-shadow-inset)] hover:brightness-105",
  dark: "btn-shine bg-ink-900 text-ink border border-white/10 hover:bg-surface-2 hover:border-white/14",
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
  return <button suppressHydrationWarning className={cx(base, variants[variant], className)} {...props} />;
}


