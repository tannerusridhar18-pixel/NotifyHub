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
    <section className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:py-16">
      <span className="text-[11px] font-bold text-brand">Campus calendar</span>
      <h1 className="my-3 text-4xl sm:text-5xl">Events</h1>
      <p className="max-w-[700px] text-base leading-relaxed text-muted sm:text-lg">See what is next, where it happens, and how long remains before it begins.</p>
      <div className="mt-8">
        {loading ? (
          <CardSkeletons count={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : items.length ? (
          <div className="grid gap-4">
            {items.map((x, i) => (
              <Reveal key={x.id} delay={Math.min(i, 6) * 70}>
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
