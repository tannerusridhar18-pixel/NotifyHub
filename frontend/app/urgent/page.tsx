"use client";
import { useEffect, useMemo, useState } from "react";
import { announcements } from "@/lib/api";
import type { Announcement } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import { Empty, ErrorState, CardSkeletons } from "@/components/States";
import Reveal from "@/components/ui/Reveal";
import { inputBase } from "@/components/ui/classes";

export default function UrgentPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    announcements({ size: 50, urgent: true })
      .then((x) => setItems(x.content))
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load urgent alerts."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((x) => !q || x.title.toLowerCase().includes(q) || x.content.toLowerCase().includes(q));
  }, [items, query]);

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
        <div className="nh-public-sun" />
        <div className="nh-public-orbit-path nh-public-orbit-a"><i className="nh-public-planet nh-public-planet-a" /></div>
        <div className="nh-public-orbit-path nh-public-orbit-b"><i className="nh-public-planet nh-public-planet-b" /></div>
        <div className="nh-public-orbit-path nh-public-orbit-c"><i className="nh-public-planet nh-public-planet-c" /></div>
      </div>

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

      {!loading && !error && items.length > 0 && (
        <Reveal delay={100} className="my-8 flex flex-wrap items-center gap-3.5 rounded-2xl border border-danger/20 bg-surface/85 p-3.5 shadow-lift backdrop-blur-2xl">
          <div className="relative min-w-[260px] flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff8ba0] text-sm pointer-events-none">⌕</span>
            <input
              className={inputBase + " !pl-10 !bg-surface-2/95 focus:!border-danger/50"}
              placeholder="Search urgent alerts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search urgent alerts"
            />
          </div>
          <span className="rounded-xl border border-danger/25 bg-danger-soft/20 px-4 py-3 text-xs font-bold text-[#ff8ba0]">
            Priority channel
          </span>
        </Reveal>
      )}

      <div className="mt-8">
        {loading ? (
          <CardSkeletons count={4} />
        ) : error ? (
          <ErrorState message={error} />
        ) : filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {items.map((x, i) => (
              <Reveal key={x.id} delay={Math.min(i, 6) * 70}>
                <AnnouncementCard item={x} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Empty label="urgent alerts matching your search" />
        )}
      </div>
    </section>
  );
}


