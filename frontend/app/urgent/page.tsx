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
    <section className="nh-public-page mx-auto w-full max-w-[1240px] px-4 py-14 sm:py-20 sm:px-6">
      <Reveal className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-danger/50 bg-gradient-to-r from-danger-soft via-[#3b121c] to-danger-soft px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-[#ff8ba0] uppercase shadow-[0_0_20px_rgba(244,63,94,0.4)] backdrop-blur-xl animate-pulse-glow">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-85" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
          </span>
          Priority Broadcast Channel
        </span>
        <h1 className="my-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">Urgent Campus Alerts</h1>
        <p className="text-base sm:text-lg leading-relaxed text-muted/95">
          Time-critical campus notifications, security advisories, campus emergency notices, and high-priority administrative signals.
        </p>
      </Reveal>

      <div className="mt-12">
        {loading ? (
          <CardSkeletons count={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : items.length ? (
          <div className="grid gap-5 sm:grid-cols-2">
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


