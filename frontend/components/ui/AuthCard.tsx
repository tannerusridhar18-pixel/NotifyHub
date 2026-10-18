import { cx } from "./classes";

export default function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "relative w-full max-w-[480px] overflow-hidden rounded-[var(--nh-radius-lg)] border border-white/10 bg-surface p-7 shadow-[var(--nh-shadow-card)] transition-[border-color,box-shadow] duration-200 ease-out hover:border-brand/40 sm:p-10 after:absolute after:inset-x-0 after:top-0 after:z-10 after:h-1.5 after:bg-brand",
        className
      )}
    >
      {children}
    </div>
  );
}
