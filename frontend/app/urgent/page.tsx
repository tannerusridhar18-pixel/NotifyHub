"use client";
import { useEffect, useState } from "react";
import { announcements } from "@/lib/api";
import type { Announcement } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import { Empty, ErrorState, CardSkeletons } from "@/components/States";
import Reveal from "@/components/ui/Reveal";

export default function UrgentPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    announcements({ size: 50, urgent: true })
      .then((x) => setItems(x.content))
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load urgent alerts."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:py-16">
      <span className="text-[11px] font-bold text-danger">Priority channel</span>
      <h1 className="my-3 text-4xl sm:text-5xl">Urgent alerts</h1>
      <p className="max-w-[700px] text-base leading-relaxed text-muted sm:text-lg">Time-sensitive published notices are surfaced here so they stay visible.</p>
      <div className="mt-8">
        {loading ? (
          <CardSkeletons count={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : items.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((x, i) => (
              <Reveal key={x.id} delay={Math.min(i, 6) * 70}>
                <AnnouncementCard item={x} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Empty label="urgent alerts" />
        )}
      </div>
    </section>
  );
}
