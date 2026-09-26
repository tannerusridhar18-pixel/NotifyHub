"use client";
import { useEffect, useMemo, useState } from "react";
import { announcements } from "@/lib/api";
import type { Announcement } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import { Empty, ErrorState, CardSkeletons } from "@/components/States";
import { inputBase } from "@/components/ui/classes";
import Reveal from "@/components/ui/Reveal";

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);

  useEffect(() => {
    announcements({ size: 24 })
      .then((x) => setItems(x.content))
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load announcements."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (x) => (!urgentOnly || x.urgent) && (!q || x.title.toLowerCase().includes(q) || x.content.toLowerCase().includes(q))
    );
  }, [items, query, urgentOnly]);

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
          <div className="nh-public-orbit-path nh-public-orbit-d"><i className="nh-public-planet nh-public-planet-d" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-e"><i className="nh-public-planet nh-public-planet-e" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-f"><i className="nh-public-planet nh-public-planet-f" /></div>
        </div>
<Reveal className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-50/90 px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-brand-light uppercase shadow-[0_0_16px_rgba(99,102,241,0.25)] backdrop-blur-xl">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-light" />
          </span>
          Campus Broadcast Stream
        </span>
        <h1 className="my-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">Campus Announcements</h1>
        <p className="text-base sm:text-lg leading-relaxed text-muted/95">
          Official campus updates, academic circulars, and departmental notices, unified into a real-time, searchable feed.
        </p>
      </Reveal>

      {!loading && !error && items.length > 0 && (
        <Reveal delay={100} className="my-8 flex flex-wrap items-center gap-3.5 rounded-2xl border border-white/12 bg-surface/85 p-3.5 shadow-lift backdrop-blur-2xl">
          <div className="relative min-w-[260px] flex-[3]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-light text-sm pointer-events-none">🔍</span>
            <input
              className={`${inputBase} !pl-10 !bg-surface-2/95 focus:!border-brand-light`}
              placeholder="Search announcements by keyword, topic, or department…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search announcements"
            />
          </div>
          <label className="flex min-w-[150px] cursor-pointer select-none items-center gap-2.5 rounded-xl border border-white/10 bg-surface-2/90 px-4 py-3 text-xs font-bold text-muted hover:text-white hover:border-white/20 transition-all duration-200">
            <input
              type="checkbox"
              className="accent-brand h-4 w-4 rounded"
              checked={urgentOnly}
              onChange={(e) => setUrgentOnly(e.target.checked)}
            />
            <span className="tracking-wide">Urgent only</span>
          </label>
        </Reveal>
      )}

      <div className="mt-8">
        {loading ? (
          <CardSkeletons count={6} />
        ) : error ? (
          <ErrorState message={error} />
        ) : filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((x, i) => (
              <Reveal key={x.id} delay={Math.min(i, 8) * 60}>
                <AnnouncementCard item={x} />
              </Reveal>
            ))}
          </div>
        ) : items.length ? (
          <Empty label="announcements matching your search" />
        ) : (
          <Empty label="announcements" />
        )}
      </div>
    </section>
  );
}


