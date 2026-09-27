import { cx, statusClasses } from "./classes";

export function StatusBadge({ status }: { status: string }) {
  const isLive = status.toUpperCase() === "PUBLISHED" || status.toUpperCase() === "ANSWERED";
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-normal tracking-wider uppercase transition-colors duration-200", statusClasses(status))}>
      <span className="relative flex h-2 w-2 items-center justify-center">
        {isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-signal-blue)] opacity-40" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-signal-blue)]" />
      </span>
      {status}
    </span>
  );
}

export function UrgentBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-signal-blue)]/50 bg-[var(--color-carbon)] px-3 py-1 text-[9px] font-normal tracking-[0.14em] text-[var(--color-paper)]">
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-signal-blue)] opacity-40" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-signal-blue)]" />
      </span>
      URGENT SIGNAL
    </span>
  );
}

export function SoftBadge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "violet" | "cyan" | "amber" | "muted" | "success" }) {
  const toneMap = {
    brand: "border border-[var(--color-signal-blue)]/50 bg-[var(--color-carbon)] text-[var(--color-paper)]",
    violet: "border border-[var(--color-signal-blue)]/50 bg-[var(--color-carbon)] text-[var(--color-paper)]",
    cyan: "border border-[var(--color-signal-blue)]/50 bg-[var(--color-carbon)] text-[var(--color-paper)]",
    amber: "border border-white/20 bg-[var(--color-iron)] text-[var(--color-paper)]",
    success: "border border-[var(--color-signal-blue)]/50 bg-[var(--color-carbon)] text-[var(--color-paper)]",
    muted: "border border-white/12 bg-[var(--color-graphite)] text-[var(--color-ash)]",
  };
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-normal tracking-wide uppercase", toneMap[tone])}>{children}</span>;
}
