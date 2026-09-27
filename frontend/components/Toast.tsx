"use client";
import { useEffect } from "react";
import { cx } from "@/components/ui/classes";

export function Toast({ message, type = "success", onClose }: { message: string; type?: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(id);
  }, [onClose]);

  return (
    <div
      role="status"
      className={cx(
        "fixed bottom-6 right-6 z-[100] flex max-w-[min(460px,calc(100vw-32px))] items-center gap-3.5 rounded-[var(--nh-radius-lg)] border border-white/10 bg-surface p-4 shadow-[var(--nh-shadow-float)] backdrop-blur-2xl animate-toast-in",
        type === "success" ? "border-success/35" : "border-danger/35"
      )}
    >
      <span
        className={cx(
          "grid h-9 w-9 flex-none place-items-center rounded-[var(--nh-radius-md)] font-medium text-sm",
          type === "success" ? "border border-success/35 bg-success-soft text-success" : "border border-danger/35 bg-danger-soft text-danger"
        )}
      >
        {type === "success" ? "✓" : "!"}
      </span>
      <p className="m-0 text-[13px] font-semibold leading-snug text-ink">{message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="ml-auto flex h-7 w-7 flex-none items-center justify-center rounded-[var(--nh-radius-md)] border border-white/10 bg-surface-2 text-xs font-bold text-muted hover:bg-white/[0.12] hover:text-white transition-all duration-200"
      >
        ✕
      </button>
    </div>
  );
}


