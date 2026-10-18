"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventItem } from "@/types";
import Countdown from "./Countdown";
import { AudienceBadge, formatAudienceLabel } from "@/components/ui/Badge";
import Spotlight from "@/components/ui/Spotlight";

const EventRegistrationPanel = dynamic(() => import("@/components/EventRegistrationPanel"), {
  loading: () => (
    <div className="mt-4 h-10 animate-pulse rounded-lg border border-border bg-surface-2" aria-hidden="true" />
  ),
});

export default function EventCard({
  item,
  canManageRegistrations = false,
  onRegistered,
}: {
  item: EventItem;
  canManageRegistrations?: boolean;
  onRegistered?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const startDate = new Date(item.startAt);
  const dayStr = startDate.toLocaleDateString(undefined, { day: "2-digit" });
  const monthStr = startDate.toLocaleDateString(undefined, { month: "short" });

  const navigateToDetails = () => {
    router.push(`/events/${item.id}`);
  };

  return (
    <Spotlight
      as="article"
      id={`event-${item.id}`}
      tone="violet"
      className="nh-public-content-card group relative grid min-w-0 grid-cols-[76px_1fr] sm:grid-cols-[100px_1fr] gap-4 sm:gap-6 overflow-hidden rounded-[var(--nh-radius-lg)] border border-white/10 bg-surface p-5 sm:p-6 cursor-pointer transition-[border-color,background-color] duration-200 ease-out hover:border-brand-2/35"
    >
      {/* 3D Calendar date badge */}
      <div
        onClick={navigateToDetails}
        className="flex flex-col items-center justify-center rounded-[var(--nh-radius-lg)] border border-brand-2/30 bg-surface-2 p-3 text-center text-brand-2-light shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_20px_-4px_rgba(147,51,234,0.35)] transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:-rotate-2 group-hover:border-brand-2/70 group-hover:shadow-[0_12px_28px_-4px_rgba(147,51,234,0.55)]"
      >
        <span className="text-xs font-extrabold uppercase tracking-widest text-brand-2-light">{monthStr}</span>
        <b className="font-display text-2xl sm:text-3xl font-extrabold leading-none text-white my-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{dayStr}</b>
        <span className="text-xs font-extrabold uppercase tracking-wider text-muted/90">EVENT</span>
      </div>

      <div
        className="min-w-0 flex flex-col justify-between"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button") || target.closest("a") || target.closest("[data-no-card-click]")) {
            return;
          }
          navigateToDetails();
        }}
      >
        <div>
          {item.photoUrl && !imageError && (
            <div
              className="mb-3 overflow-hidden rounded-xl cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigateToDetails();
              }}
            >
              <Image
                src={item.photoUrl}
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
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <AudienceBadge audience={formatAudienceLabel(item)} tone="violet" />
          </div>
          <h3 className="mb-2 text-xl font-extrabold tracking-tight text-ink [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-brand-2-light">
            {item.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted/95 [overflow-wrap:anywhere]">
            {item.description}
          </p>
          {item.externalLink && (
            <a
              href={item.externalLink}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-block text-xs font-bold text-brand-light underline"
            >
              Open event link
            </a>
          )}
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted/90">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2/90 px-3 py-1.5 border border-white/[0.06] transition-colors group-hover:border-white/20">
              <span className="text-cyan-light font-bold">⌖</span> {item.location}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2/90 px-3 py-1.5 border border-white/[0.06] transition-colors group-hover:border-white/20">
              <span className="text-brand-2-light font-bold">◷</span> {startDate.toLocaleString()}
            </span>
            <Link
              href={`/events/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-brand-2-light group-hover:text-brand-light transition-colors"
              aria-label={`View details for ${item.title}`}
            >
              <span>View details</span>
              <span>→</span>
            </Link>
          </div>
          {item.status === "PUBLISHED" && <Countdown target={item.startAt} />}
          {item.status === "PUBLISHED" && (
            <div data-no-card-click="true" onClick={(e) => e.stopPropagation()}>
              <EventRegistrationPanel
                event={item}
                canManageRegistrations={canManageRegistrations}
                onRegistered={onRegistered}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hover bottom light accent — GPU accelerated scale-x */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] w-full origin-left scale-x-0 bg-brand-2 transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
    </Spotlight>
  );
}
