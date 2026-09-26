"use client";
import { useEffect, useState } from "react";
import { upcomingEvents } from "@/lib/api";
import type { EventItem } from "@/types";
import EventCard from "@/components/EventCard";
import { Empty, ErrorState, CardSkeletons } from "@/components/States";
import Reveal from "@/components/ui/Reveal";

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    upcomingEvents(0, 24)
      .then((x) => setItems(x.content))
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load events."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:py-20 sm:px-6">
      <div className="nh-public-orbit" aria-hidden="true">
          <div className="nh-public-stars" />
          <div className="nh-public-sun"><span /></div>
          <div className="nh-public-orbit-path nh-public-orbit-a"><i className="nh-public-planet nh-public-planet-a" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-b"><i className="nh-public-planet nh-public-planet-b" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-c"><i className="nh-public-planet nh-public-planet-c" /></div>
        </div>
<Reveal className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-2/40 bg-brand-50/90 px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-brand-2-light uppercase shadow-[0_0_16px_rgba(168,85,247,0.25)] backdrop-blur-xl">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-2-light opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-2-light" />
          </span>
          Campus Activity Stream
        </span>
        <h1 className="my-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">Upcoming Campus Events</h1>
        <p className="text-base sm:text-lg leading-relaxed text-muted/95">
          Track academic milestones, tech symposiums, workshops, and campus gatherings with synchronized real-time start countdowns.
        </p>
      </Reveal>

      <div className="mt-12">
        {loading ? (
          <CardSkeletons count={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : items.length ? (
          <div className="grid gap-5">
            {items.map((x, i) => (
              <Reveal key={x.id} delay={Math.min(i, 8) * 70}>
                <EventCard item={x} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Empty label="upcoming events" />
        )}
      </div>
    </section>
  );
}


