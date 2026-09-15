import { cx } from "./classes";

export default function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "relative w-full max-w-[480px] overflow-hidden rounded-[26px] border border-white/12 bg-surface/98 p-7 shadow-2xl transition-[border-color,box-shadow] duration-200 ease-out hover:border-brand-light/40 hover:shadow-card-hover after:absolute after:inset-x-0 after:top-0 after:z-10 after:h-1.5 after:bg-gradient-to-r after:from-brand after:via-brand-magenta after:to-cyan sm:p-10",
        className
      )}
    >
      {children}
    </div>
  );
}
