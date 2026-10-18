"use client";
import { useCallback, useEffect, useState } from "react";
import { upcomingEvents } from "@/lib/api";
import type { EventItem } from "@/types";
import EventCard from "@/components/EventCard";
import { Empty, ErrorState, CardSkeletons } from "@/components/States";
import Reveal from "@/components/ui/Reveal";

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    upcomingEvents(0, 24)
      .then((x) => {
        setItems(x.content);
        if (typeof window !== "undefined") {
          const eventId = new URLSearchParams(window.location.search).get("event");
          if (eventId) {
            setTimeout(() => {
              const el = document.getElementById(`event-${eventId}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
          }
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load events."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadData();
  }, [loadData]);

  return (
    <section
      className="nh-public-page mx-auto w-full max-w-[1240px] px-4 py-14 sm:py-20 sm:px-6"
      onMouseMove={(e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        e.currentTarget.style.setProperty("--orbit-x", `${x * 10}px`);
        e.currentTarget.style.setProperty("--orbit-y", `${y * 8}px`);
        e.currentTarget.style.setProperty("--orbit-rx", `${y * -4}deg`);
        e.currentTarget.style.setProperty("--orbit-ry", `${x * 5}deg`);
      }}>
      <div className="nh-public-orbit" aria-hidden="true">
          <div className="nh-public-stars" />
          <div className="nh-public-sun"><span /></div>
          <div className="nh-public-orbit-path nh-public-orbit-a"><i className="nh-public-planet nh-public-planet-a" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-b"><i className="nh-public-planet nh-public-planet-b" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-c"><i className="nh-public-planet nh-public-planet-c" /></div>
        </div>
      <Reveal className="max-w-[760px]">
        <h1 className="mb-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">Upcoming Campus Events</h1>
        <p className="text-base sm:text-lg leading-relaxed text-muted">
          Track academic milestones, tech symposiums, workshops, and campus gatherings with synchronized real-time start countdowns.
        </p>
      </Reveal>

      <div className="mt-12">
        {loading ? (
          <CardSkeletons count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
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


