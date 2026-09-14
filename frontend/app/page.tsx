"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { announcements, upcomingEvents } from "@/lib/api";
import type { Announcement, EventItem } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import { ErrorState, CardSkeletons } from "@/components/States";
import { buttonClasses } from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Counter from "@/components/ui/Counter";

const chips = ["Announcements", "Urgent alerts", "Events calendar", "Campus questions", "Role-aware feeds", "One login"];

export default function Home() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [urgent, setUrgent] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  useEffect(() => {
    Promise.all([announcements({ size: 3 }), upcomingEvents(0, 2), announcements({ size: 2, urgent: true })])
      .then(([a, e, u]) => {
        setItems(a.content);
        setUpcoming(e.content);
        setUrgent(u.content);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load the campus signal."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section
        className="relative overflow-hidden"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setSpot({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
      >
        {/* Mesh-gradient blobs — decorative, purely CSS-animated */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 top-[-120px] h-[380px] w-[380px] rounded-full bg-brand/25 blur-3xl animate-blob" />
          <div className="absolute right-[-100px] top-[80px] h-[420px] w-[420px] rounded-full bg-brand-2/20 blur-3xl animate-blob [animation-delay:-6s]" />
          <div className="absolute bottom-[-140px] left-1/3 h-[320px] w-[320px] rounded-full bg-[#6be2ff]/12 blur-3xl animate-blob [animation-delay:-11s]" />
          <div
            className="absolute inset-0 opacity-40 transition-[background] duration-300"
            style={{ background: `radial-gradient(600px circle at ${spot.x}% ${spot.y}%, color-mix(in srgb, var(--color-brand) 8%, transparent), transparent 60%)` }}
          />
        </div>

        <div className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:min-h-[560px] lg:grid-cols-[1.06fr_0.94fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-surface-2/70 px-3 py-1.5 text-[11px] font-bold text-brand backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" /> Smart campus signal
              </span>
              <h1 className="my-4 text-[42px] leading-[1.04] tracking-tight sm:text-6xl lg:text-[74px]">
                Know what matters.
                <br />
                <em className="not-italic text-gradient-animated font-semibold">Before it is missed.</em>
              </h1>
              <p className="max-w-[650px] text-base leading-relaxed text-muted sm:text-lg">
                NotifyHub brings announcements, urgent alerts, events and campus questions into one calm, searchable place.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link className={buttonClasses("primary")} href="/announcements">
                  Explore the feed
                </Link>
                <Link className={buttonClasses("secondary")} href="/auth/login">
                  Sign in
                </Link>
              </div>

              {!loading && !error && (
                <div className="mt-10 flex flex-wrap gap-8">
                  <div>
                    <strong className="font-display text-3xl">
                      <Counter value={urgent.length + items.length + upcoming.length} />+
                    </strong>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Live items right now</p>
                  </div>
                  <div>
                    <strong className="font-display text-3xl">
                      <Counter value={upcoming.length} />
                    </strong>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Events coming up</p>
                  </div>
                  <div>
                    <strong className="font-display text-3xl text-danger">
                      <Counter value={urgent.length} />
                    </strong>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Urgent right now</p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative min-h-[380px] overflow-hidden rounded-[26px] border border-white/[0.06] bg-gradient-to-br from-ink-900 to-ink-700 p-7 text-ink shadow-glow transition-transform duration-500 hover:-rotate-1 hover:scale-[1.01] sm:min-h-[450px]">
              <div className="pointer-events-none absolute -right-[170px] -top-40 h-[400px] w-[400px] rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -bottom-36 -left-36 h-[230px] w-[230px] rounded-full border border-white/10" />
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-2">NOTIFYHUB / LIVE</span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold before:h-2 before:w-2 before:animate-pulse before:rounded-full before:bg-success before:shadow-[0_0_0_5px_rgba(61,220,155,0.16)]">
                  LIVE SIGNAL
                </span>
              </div>
              <div className="relative z-10 mt-16 grid gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-surface/95 p-4.5 text-ink shadow-[0_20px_45px_rgba(0,0,0,0.45)] animate-float transition-transform duration-300 hover:scale-[1.03]">
                  <strong className="font-display">New campus update</strong>
                  <p className="text-sm text-muted">One place. Every important message.</p>
                  <div className="mt-2.5 h-1.5 rounded-full bg-white/10">
                    <span className="block h-full w-[62%] rounded-full bg-gradient-to-r from-brand to-brand-2" />
                  </div>
                </div>
                <div className="ml-8 rounded-2xl border border-white/[0.06] bg-surface/95 p-4.5 text-ink shadow-[0_20px_45px_rgba(0,0,0,0.45)] animate-float transition-transform duration-300 [animation-delay:-1.5s] hover:scale-[1.03]">
                  <strong className="font-display">Upcoming event</strong>
                  <p className="text-sm text-muted">Your calendar, without the clutter.</p>
                </div>
                <div className="ml-16 rounded-2xl border border-white/[0.06] bg-surface/95 p-4.5 text-ink shadow-[0_20px_45px_rgba(0,0,0,0.45)] animate-float transition-transform duration-300 [animation-delay:-3s] hover:scale-[1.03]">
                  <strong className="font-display">Priority alert</strong>
                  <p className="text-sm text-muted">Urgent information stays visible.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee trust strip */}
        <div className="overflow-hidden border-y border-border bg-surface/60 py-3.5">
          <div className="marquee-track gap-10">
            {[...chips, ...chips].map((c, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap px-4 text-xs font-bold text-muted">
                <span className="h-1 w-1 rounded-full bg-brand/60" /> {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 py-16">
        {loading ? (
          <CardSkeletons count={3} />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Reveal className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-[11px] font-bold text-brand">Attention now</span>
                <h2 className="mt-1.5 text-2xl sm:text-3xl">Urgent signals</h2>
              </div>
              <Link href="/urgent" className={buttonClasses("secondary")}>
                View all
              </Link>
            </Reveal>
            {urgent.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {urgent.map((x, i) => (
                  <Reveal key={x.id} delay={i * 80}>
                    <AnnouncementCard item={x} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-muted">No urgent alerts right now.</p>
            )}

            <Reveal className="mb-5 mt-20 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-[11px] font-bold text-brand">Latest</span>
                <h2 className="mt-1.5 text-2xl sm:text-3xl">Campus announcements</h2>
              </div>
              <Link href="/announcements" className={buttonClasses("secondary")}>
                Open feed
              </Link>
            </Reveal>
            {items.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((x, i) => (
                  <Reveal key={x.id} delay={i * 80}>
                    <AnnouncementCard item={x} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-muted">No announcements are published yet.</p>
            )}

            <Reveal className="mb-5 mt-20 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-[11px] font-bold text-brand">On the calendar</span>
                <h2 className="mt-1.5 text-2xl sm:text-3xl">Upcoming events</h2>
              </div>
              <Link href="/events" className={buttonClasses("secondary")}>
                See events
              </Link>
            </Reveal>
            {upcoming.length ? (
              <div className="grid gap-4">
                {upcoming.map((x, i) => (
                  <Reveal key={x.id} delay={i * 80}>
                    <EventCard item={x} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-muted">No upcoming events are scheduled.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
