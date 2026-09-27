import { cx } from "./classes";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "cyan" | "danger" | "dark";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-buttons)] px-5 py-2.5 text-sm font-normal tracking-[0.01em] transition-[transform,opacity,border-color,background-color] duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-signal-blue)] text-[var(--color-paper)] hover:brightness-110",
  secondary: "border border-white/12 bg-[var(--color-graphite)] text-[var(--color-paper)] shadow-[var(--shadow-subtle)] hover:border-white/20 hover:bg-[var(--color-steel)]",
  ghost: "border border-white/12 bg-transparent text-[var(--color-ash)] hover:border-white/20 hover:bg-[var(--color-graphite)] hover:text-[var(--color-paper)]",
  cyan: "bg-[var(--color-signal-blue)] text-[var(--color-paper)] hover:brightness-110",
  danger: "bg-[var(--color-signal-blue)] text-[var(--color-paper)] hover:brightness-110",
  dark: "border border-white/12 bg-[var(--color-carbon)] text-[var(--color-paper)] shadow-[var(--shadow-subtle)] hover:border-white/20 hover:bg-[var(--color-steel)]",
};

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
