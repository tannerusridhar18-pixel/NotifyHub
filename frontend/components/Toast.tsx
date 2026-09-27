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
        "fixed bottom-6 right-6 z-[100] flex max-w-[min(460px,calc(100vw-32px))] items-center gap-3.5 rounded-[var(--radius-cards)] border p-4 shadow-[var(--shadow-subtle)] backdrop-blur-2xl animate-toast-in",
        "border-white/12 bg-[var(--color-graphite)]"
      )}
    >
      <span
        className={cx(
          "grid h-9 w-9 flex-none place-items-center rounded-xl font-black text-sm shadow-sm",
          "border border-white/12 bg-[var(--color-carbon)] text-[var(--color-paper)]"
        )}
      >
        {type === "success" ? "✓" : "!"}
      </span>
      <p className="m-0 text-[13px] font-semibold leading-snug text-ink">{message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="ml-auto flex h-7 w-7 flex-none items-center justify-center rounded-[var(--radius-inputs)] border border-white/12 bg-[var(--color-iron)] text-xs font-bold text-muted hover:bg-white/[0.12] hover:text-white transition-all duration-200"
      >
        ✕
      </button>
    </div>
  );
}


