import { cx, statusClasses } from "./classes";

export function StatusBadge({ status }: { status: string }) {
  const isLive = status.toUpperCase() === "PUBLISHED" || status.toUpperCase() === "ANSWERED";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-md transition-all duration-300",
        statusClasses(status)
      )}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {status}
    </span>
  );
}

export function UrgentBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/50 bg-gradient-to-r from-danger-soft via-[#3d131f] to-danger-soft px-3 py-1 text-[9px] font-extrabold tracking-[0.14em] text-[#ff8ba0] shadow-[0_0_16px_rgba(244,63,94,0.4)] backdrop-blur-md animate-pulse-glow">
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-80" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
      </span>
      URGENT SIGNAL
    </span>
  );
}

export function SoftBadge({
  children,
  tone = "brand",
}: {
  children: React.ReactNode;
  tone?: "brand" | "violet" | "cyan" | "amber" | "muted" | "success";
}) {
  const toneMap = {
    brand: "border border-brand/40 bg-brand-50/90 text-brand-light shadow-[0_0_12px_rgba(99,102,241,0.2)]",
    violet: "border border-brand-2/40 bg-brand-50/90 text-brand-2-light shadow-[0_0_12px_rgba(168,85,247,0.2)]",
    cyan: "border border-cyan/40 bg-teal-soft/90 text-cyan-light shadow-[0_0_12px_rgba(6,182,212,0.2)]",
    amber: "border border-amber/40 bg-warning-soft/90 text-amber-light shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    success: "border border-success/40 bg-success-soft/90 text-[#6ee7b7] shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    muted: "border border-border/90 bg-surface-2/90 text-muted",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wide uppercase backdrop-blur-md transition-all duration-200",
        toneMap[tone]
      )}
    >
      {children}
    </span>
  );
}


