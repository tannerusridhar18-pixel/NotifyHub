import { cx } from "./classes";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary: "btn-shine bg-brand text-[#0a0b12] shadow-[0_0_0_1px_rgba(124,140,255,0.3),0_10px_28px_rgba(124,140,255,0.35)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(124,140,255,0.4),0_16px_36px_rgba(124,140,255,0.45)]",
  secondary: "border border-border bg-surface-2 text-ink hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-soft",
  ghost: "border border-brand-100 bg-transparent text-brand hover:bg-brand-50",
  danger: "btn-shine bg-danger text-[#0a0b12] shadow-[0_10px_24px_rgba(255,115,105,0.28)] hover:-translate-y-0.5",
  dark: "btn-shine bg-ink-900 text-ink border border-white/10 hover:-translate-y-0.5 hover:shadow-lift",
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
