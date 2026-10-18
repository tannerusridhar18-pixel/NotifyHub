"use client";
import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { Announcement } from "@/types";
import { cx } from "@/components/ui/classes";
import { AudienceBadge, UrgentBadge, formatAudienceLabel } from "@/components/ui/Badge";
import Spotlight from "@/components/ui/Spotlight";
import { Loading } from "@/components/States";
import { safeUrl } from "@/lib/api";

const DetailModal = dynamic(() => import("@/components/ui/DetailModal"), {
  loading: () => <Loading label="Opening announcement details…" />,
});

export default function AnnouncementCard({ item }: { item: Announcement }) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const rawImage = item.imageUrl || item.photoUrl || item.attachmentUrl;
  const imageUrl = safeUrl(rawImage);
  const hasImage = Boolean(imageUrl) && !imageError;

  return (
    <>
      <Spotlight
        as="article"
        tone={item.urgent ? "danger" : "brand"}
        className={cx(
          "nh-public-content-card group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[var(--nh-radius-lg)] border p-6 cursor-pointer transition-[border-color,background-color] duration-200 ease-out",
          item.urgent
            ? "nh-card-urgent-theme border-danger/35 bg-surface hover:border-danger/55"
            : "border-white/10 bg-surface hover:border-brand/35"
        )}
      >
        <div onClick={() => setOpen(true)}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <AudienceBadge audience={formatAudienceLabel(item)} urgent={item.urgent} tone="brand" />
            {item.urgent && <UrgentBadge />}
          </div>

          {hasImage && (
            <div
              className="mb-3 overflow-hidden rounded-xl cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
            >
              <Image
                src={imageUrl!}
                alt={item.title}
                width={1200}
                height={128}
                loader={({ src }) => src}
                unoptimized
                onError={() => setImageError(true)}
                className="h-32 w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              />
            </div>
          )}

          <h3 className="mb-2 text-xl font-extrabold tracking-tight text-ink [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-brand">
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
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted/80 group-hover:text-ink transition-colors hover:text-brand-light"
          >
            <span>Read update</span>
            <span className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1 text-brand-light">→</span>
          </button>
          <div className="h-1.5 w-1.5 rounded-full bg-border transition-all duration-300 group-hover:scale-150 group-hover:bg-brand-light group-hover:shadow-[0_0_8px_rgba(124,58,237,0.85)]" />
        </div>

        {/* Radiant accent line on card hover — GPU accelerated scale-x */}
        <div
          className={cx(
            "pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100",
            item.urgent
              ? "bg-danger"
              : "bg-brand"
          )}
        />
      </Spotlight>

      {open && <DetailModal item={{ type: "announcement", data: item }} onClose={() => setOpen(false)} />}
    </>
  );
}

