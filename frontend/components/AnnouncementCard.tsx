"use client";
import { useState } from "react";
import type { Announcement } from "@/types";
import { cx } from "@/components/ui/classes";
import { StatusBadge, UrgentBadge } from "@/components/ui/Badge";
import Spotlight from "@/components/ui/Spotlight";
import DetailModal from "@/components/ui/DetailModal";

const targetLabel = (x: Announcement) => (x.targetType === "GLOBAL" ? "Everyone" : x.targetType.toLowerCase());

export default function AnnouncementCard({ item }: { item: Announcement }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Spotlight
        as="article"
        tone={item.urgent ? "danger" : "brand"}
        className={cx(
          "group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[22px] border p-6 cursor-pointer transition-[transform,opacity,border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-card-hover",
          item.urgent
            ? "border-danger/45 bg-gradient-to-br from-[#240c17] via-surface to-[#190810] hover:border-danger/80 hover:shadow-glow-danger"
            : "border-border/90 bg-gradient-to-br from-surface via-surface-2 to-surface hover:border-brand-light/70 hover:shadow-glow"
        )}
      >
        <div onClick={() => setOpen(true)}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-2/95 px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase text-muted transition-[transform,border-color] duration-200 ease-out group-hover:scale-105 group-hover:border-white/25">
              <span className={cx("h-1.5 w-1.5 rounded-full transition-transform duration-300 group-hover:scale-125", item.urgent ? "bg-danger shadow-[0_0_8px_rgba(255,42,95,0.85)]" : "bg-brand-light shadow-[0_0_8px_rgba(124,58,237,0.85)]")} />
              {targetLabel(item)}
            </span>
            {item.urgent && <UrgentBadge />}
          </div>
          <h3 className="mb-2 text-xl font-extrabold tracking-tight text-ink [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-brand-light">
            {item.title}
          </h3>
          <p className="mb-3 text-xs font-semibold text-muted/80">
            Published {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "Recently"}
          </p>
          <p className="line-clamp-4 text-[14px] leading-relaxed text-muted/95 [overflow-wrap:anywhere]">
            {item.content}
          </p>
        </div>

        <div className="mt-6 pt-3.5 border-t border-white/[0.08] flex items-center justify-between" onClick={() => setOpen(true)}>
          {item.status !== "PUBLISHED" ? (
            <StatusBadge status={item.status} />
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted/80 group-hover:text-ink transition-colors hover:text-brand-light"
            >
              <span>Read update</span>
              <span className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1 text-brand-light">→</span>
            </button>
          )}
          <div className="h-1.5 w-1.5 rounded-full bg-border transition-all duration-300 group-hover:scale-150 group-hover:bg-brand-light group-hover:shadow-[0_0_8px_rgba(124,58,237,0.85)]" />
        </div>

        {/* Radiant accent line on card hover — GPU accelerated scale-x */}
        <div
          className={cx(
            "pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100",
            item.urgent
              ? "bg-gradient-to-r from-danger via-[#ff6b8b] to-amber"
              : "bg-gradient-to-r from-brand via-brand-2 to-cyan"
          )}
        />
      </Spotlight>

      {open && <DetailModal item={{ type: "announcement", data: item }} onClose={() => setOpen(false)} />}
    </>
  );
}


