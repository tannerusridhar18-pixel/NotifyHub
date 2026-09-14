import { cx, statusClasses } from "./classes";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cx("inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide", statusClasses(status))}>
      {status}
    </span>
  );
}

export function UrgentBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-danger-soft bg-danger-soft px-2.5 py-1 text-[9px] font-extrabold tracking-[0.09em] text-[#ffb4ac]">
      URGENT
    </span>
  );
}

export function SoftBadge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "muted" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-extrabold",
        tone === "brand" ? "bg-brand-50 text-brand" : "bg-surface-2 text-muted"
      )}
    >
      {children}
    </span>
  );
}
