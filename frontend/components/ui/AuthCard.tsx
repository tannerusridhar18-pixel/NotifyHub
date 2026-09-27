import { cx } from "./classes";

export default function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("nh-rekki-auth-card relative w-full max-w-[480px] overflow-hidden rounded-[var(--radius-cards)] border border-white/12 bg-[var(--color-graphite)] p-7 shadow-[var(--shadow-subtle)] sm:p-10", className)}>
      {children}
    </div>
  );
}
