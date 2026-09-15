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
        "fixed bottom-6 right-6 z-[100] flex max-w-[min(460px,calc(100vw-32px))] items-center gap-3.5 rounded-2xl border p-4 shadow-lift backdrop-blur-2xl animate-toast-in",
        type === "success"
          ? "border-teal-light/40 bg-gradient-to-r from-surface/98 via-surface-2/95 to-teal-soft/90 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
          : "border-danger/45 bg-gradient-to-r from-surface/98 via-surface-2/95 to-danger-soft/90 shadow-[0_0_24px_rgba(244,63,94,0.25)]"
      )}
    >
      <span
        className={cx(
          "grid h-9 w-9 flex-none place-items-center rounded-xl font-black text-sm shadow-sm",
          type === "success"
            ? "border border-teal-light/50 bg-teal-soft text-teal-light shadow-[0_0_12px_rgba(45,212,191,0.3)]"
            : "border border-danger/50 bg-danger-soft text-[#ff8ba0] shadow-[0_0_12px_rgba(244,63,94,0.3)]"
        )}
      >
        {type === "success" ? "✓" : "!"}
      </span>
      <p className="m-0 text-[13px] font-semibold leading-snug text-ink">{message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="ml-auto flex h-7 w-7 flex-none items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-muted hover:bg-white/[0.12] hover:text-white transition-all duration-200"
      >
        ✕
      </button>
    </div>
  );
}


