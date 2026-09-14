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
    return items.filter((x) => (!urgentOnly || x.urgent) && (!q || x.title.toLowerCase().includes(q) || x.content.toLowerCase().includes(q)));
  }, [items, query, urgentOnly]);

  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:py-16">
      <span className="text-[11px] font-bold text-brand">Campus signal</span>
      <h1 className="my-3 text-4xl sm:text-5xl">Announcements</h1>
      <p className="max-w-[700px] text-base leading-relaxed text-muted sm:text-lg">Important updates, published centrally and presented in one dependable feed.</p>

      {!loading && !error && items.length > 0 && (
        <div className="my-6 flex flex-wrap gap-2.5">
          <input
            className={`${inputBase} min-w-[240px] flex-[2]`}
            placeholder="Search announcements…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search announcements"
          />
          <label className="flex flex-1 min-w-[160px] items-center gap-2 rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-sm font-semibold text-muted">
            <input type="checkbox" className="accent-brand" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} />
            Urgent only
          </label>
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <CardSkeletons count={6} />
        ) : error ? (
          <ErrorState message={error} />
        ) : filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((x, i) => (
              <Reveal key={x.id} delay={Math.min(i, 6) * 70}>
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
