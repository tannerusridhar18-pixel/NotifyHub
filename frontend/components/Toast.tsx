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
      className="fixed bottom-5 right-5 z-[100] flex max-w-[min(420px,calc(100vw-32px))] items-center gap-3 rounded-2xl border border-border bg-surface/98 px-3.5 py-3 shadow-lift animate-toast-in"
    >
      <span
        className={cx(
          "grid h-7 w-7 flex-none place-items-center rounded-lg font-extrabold",
          type === "success" ? "bg-success-soft text-[#8ff0c8]" : "bg-danger-soft text-[#ffb4ac]"
        )}
      >
        {type === "success" ? "✓" : "!"}
      </span>
      <p className="m-0 text-[13px] leading-snug text-muted">{message}</p>
      <button onClick={onClose} aria-label="Dismiss notification" className="ml-1 border-0 bg-transparent text-lg text-muted hover:text-ink">
        ×
      </button>
    </div>
  );
}
