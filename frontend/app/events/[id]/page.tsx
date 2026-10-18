"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getEvent } from "@/lib/api";
import type { EventItem } from "@/types";
import { AudienceBadge, formatAudienceLabel } from "@/components/ui/Badge";
import Countdown from "@/components/Countdown";
import { Loading, ErrorState } from "@/components/States";
import Reveal from "@/components/ui/Reveal";

const EventRegistrationPanel = dynamic(() => import("@/components/EventRegistrationPanel"), {
  loading: () => (
    <div className="mt-4 h-10 animate-pulse rounded-lg border border-border bg-surface-2" aria-hidden="true" />
  ),
});

export default function EventDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const eventId = typeof rawId === "string" ? Number(rawId) : NaN;
  const isInvalidId = !rawId || isNaN(eventId);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(!isInvalidId);
  const [error, setError] = useState(isInvalidId ? "Invalid event ID." : "");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isInvalidId) return;

    let isSubscribed = true;
    getEvent(eventId)
      .then((data) => {
        if (!isSubscribed) return;
        setEvent(data);
        setError("");
      })
      .catch((err) => {
        if (!isSubscribed) return;
        setError(err instanceof Error ? err.message : "Unable to load event details.");
      })
      .finally(() => {
        if (!isSubscribed) return;
        setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [eventId, isInvalidId, reloadKey]);

  const handleRegistered = () => {
    setReloadKey((k) => k + 1);
  };


  const startDate = event ? new Date(event.startAt) : null;
  const endDate = event ? new Date(event.endAt) : null;

  return (
    <section className="nh-public-page mx-auto w-full max-w-[1000px] px-4 py-10 sm:py-16 sm:px-6">
      <div className="nh-public-orbit" aria-hidden="true">
        <div className="nh-public-stars" />
        <div className="nh-public-sun"><span /></div>
        <div className="nh-public-orbit-path nh-public-orbit-a"><i className="nh-public-planet nh-public-planet-a" /></div>
        <div className="nh-public-orbit-path nh-public-orbit-b"><i className="nh-public-planet nh-public-planet-b" /></div>
        <div className="nh-public-orbit-path nh-public-orbit-c"><i className="nh-public-planet nh-public-planet-c" /></div>
      </div>

      <div className="mb-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-2-light hover:text-white transition-colors"
        >
          <span>←</span> Back to Events
        </Link>
      </div>

      {loading ? (
        <Loading label="Loading event details…" />
      ) : error || !event ? (
        <div className="rounded-2xl border border-white/10 bg-surface p-8 text-center">
          <ErrorState message={error || "Event not found."} />
          <div className="mt-6">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-2 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-brand-2/80 transition-colors"
            >
              Browse All Events
            </Link>
          </div>
        </div>
      ) : (
        <article className="rounded-3xl border border-white/10 bg-surface/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <Reveal>
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <AudienceBadge audience={formatAudienceLabel(event)} tone="violet" />
            </div>

            <h1 className="mb-6 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {event.title}
            </h1>
          </Reveal>

          {/* Event Image Display */}
          {event.photoUrl && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-surface-2 shadow-2xl">
              <Image
                src={event.photoUrl}
                alt={event.title}
                width={1200}
                height={500}
                loader={({ src }) => src}
                unoptimized
                priority
                className="max-h-[460px] w-full object-cover"
                onClick={(e) => e.preventDefault()}
              />
            </div>
          )}

          {/* Schedule and Location info cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-surface-2/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted/90">Event Schedule</span>
              <strong className="mt-1.5 block text-base sm:text-lg font-bold text-white">
                {startDate ? startDate.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" }) : ""}
                {endDate ? ` — ${endDate.toLocaleTimeString(undefined, { timeStyle: "short" })}` : ""}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-surface-2/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted/90">Venue / Location</span>
              <strong className="mt-1.5 flex items-center gap-2 text-base sm:text-lg font-bold text-cyan-light">
                <span>⌖</span> {event.location}
              </strong>
            </div>
          </div>

          {event.status === "PUBLISHED" && (
            <div className="mb-8">
              <Countdown target={event.startAt} />
            </div>
          )}

          {/* Description */}
          <div className="mb-8 rounded-2xl border border-white/[0.08] bg-surface-2/70 p-6 sm:p-8 text-base sm:text-lg leading-relaxed text-muted/95 whitespace-pre-wrap">
            {event.description}
          </div>

          {event.externalLink && (
            <div className="mb-8">
              <a
                href={event.externalLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-light hover:bg-brand-100 hover:text-white transition-colors"
              >
                <span>🌐</span> Open official event link →
              </a>
            </div>
          )}

          {/* Registration Section */}
          {event.status === "PUBLISHED" && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-xl font-bold text-white mb-2">Event Registration</h2>
              <EventRegistrationPanel event={event} onRegistered={handleRegistered} />
            </div>
          )}
        </article>
      )}
    </section>
  );
}
