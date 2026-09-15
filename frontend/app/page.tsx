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

const chips = [
  "Campus Announcements",
  "Priority Urgent Alerts",
  "Events Calendar",
  "Student Inquiries",
  "Role-Aware Dashboards",
  "Zero Noise Feed",
  "Real-Time Delivery",
  "Encrypted Channels",
  "Instant Push Sync",
];

export default function Home() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [urgent, setUrgent] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <div className="overflow-x-hidden">
      <section className="relative overflow-hidden">
        {/* High-performance GPU-friendly static ambient lighting */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 -top-24 h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.2)_0%,transparent_70%)]" />
          <div className="absolute -right-20 top-10 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.18)_0%,transparent_70%)]" />
          <div className="absolute bottom-[-80px] left-1/3 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,210,255,0.12)_0%,transparent_70%)]" />
        </div>

        <div className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:py-20 lg:py-28 sm:px-6">
          <div className="grid items-center gap-12 lg:min-h-[600px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <Reveal variant="fade" className="inline-flex items-center gap-2.5 rounded-full border border-brand/40 bg-brand-50/90 px-4 py-1.5 text-xs font-extrabold text-brand-light shadow-sm">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-light" />
                </span>
                <span className="tracking-wide uppercase text-[11px]">Next-Gen Campus Broadcast Signal</span>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="my-6 text-[46px] leading-[1.02] tracking-tight font-extrabold sm:text-6xl lg:text-[76px]">
                  Know what matters.
                  <br />
                  <em className="not-italic text-gradient-animated">Before it is missed.</em>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="max-w-[620px] text-base leading-relaxed text-muted/95 sm:text-xl font-normal">
                  NotifyHub unifies circulars, urgent priority alerts, scheduled academic events, and direct campus inquiries into one high-vibrancy, zero-latency signal.
                </p>
              </Reveal>

              <Reveal delay={300} className="mt-8 flex flex-wrap gap-4">
                <Link className={buttonClasses("primary", "!px-7 !py-3.5 !text-base")} href="/announcements">
                  Explore Public Feed →
                </Link>
                <Link className={buttonClasses("secondary", "!px-7 !py-3.5 !text-base")} href="/auth/login">
                  Sign In to Workspace
                </Link>
              </Reveal>

              {!loading && !error && (
                <Reveal delay={400} className="mt-12 flex flex-wrap gap-6 sm:gap-12 pt-8 border-t border-white/[0.08]">
                  <div className="flex flex-col">
                    <strong className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                      <Counter value={urgent.length + items.length + upcoming.length} />+
                    </strong>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted mt-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-light" /> Live Items Today
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <strong className="font-display text-3xl sm:text-4xl font-extrabold text-brand-2-light drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                      <Counter value={upcoming.length} />
                    </strong>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted mt-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-2" /> Upcoming Events
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <strong className="font-display text-3xl sm:text-4xl font-extrabold text-[#fb7185] drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]">
                      <Counter value={urgent.length} />
                    </strong>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted mt-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Urgent Broadcasts
                    </span>
                  </div>
                </Reveal>
              )}
            </div>

            {/* 3D Isometric Live Signal Showcase Board */}
            <Reveal variant="scale" delay={200} className="relative min-h-[440px] overflow-hidden rounded-[30px] border border-white/12 bg-gradient-to-br from-surface/98 via-surface-2/98 to-ink-900/98 p-7 sm:p-9 text-ink shadow-lift transition-all duration-300 hover:shadow-card-hover hover:border-brand-light/50">
              <div className="relative z-10 flex items-center justify-between pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-xs font-bold text-white shadow-glow">◈</span>
                  <span className="text-xs font-extrabold tracking-widest uppercase text-white">SIGNAL / LIVE STREAM</span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-teal-light/40 bg-teal-soft px-3 py-1 text-[10px] font-extrabold text-teal-light shadow-[0_0_12px_rgba(45,212,191,0.3)]">
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
                  </span>
                  ACTIVE
                </span>
              </div>

              <div className="relative z-10 mt-6 grid gap-4">
                {/* Notification Tile 1 - Announcement */}
                <div className="rounded-2xl border border-white/10 bg-surface-2 p-5 shadow-card animate-float transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:border-brand-light/60 hover:shadow-glow">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <strong className="font-display text-sm font-extrabold text-white">Midterm Circular Published</strong>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-light border border-brand/40">New</span>
                  </div>
                  <p className="text-xs text-muted/95 leading-relaxed">Examination schedules and hall allocations updated for all departments.</p>
                  <div className="mt-3.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <span className="block h-full w-[75%] rounded-full bg-gradient-to-r from-brand via-brand-light to-brand-2 animate-pulse" />
                  </div>
                </div>

                {/* Notification Tile 2 - Event */}
                <div className="ml-5 sm:ml-8 rounded-2xl border border-white/10 bg-surface-2 p-5 shadow-card animate-float-reverse transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:border-brand-2/60 hover:shadow-glow-violet">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <strong className="font-display text-sm font-extrabold text-white">Annual Tech Hackathon 2026</strong>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-2-light border border-brand-2/40">Event</span>
                  </div>
                  <p className="text-xs text-muted/95 leading-relaxed">Main Auditorium · Starts in 2d 14h (Registrations open)</p>
                </div>

                {/* Notification Tile 3 - Urgent Alert */}
                <div className="ml-10 sm:ml-16 rounded-2xl border border-danger/45 bg-gradient-to-r from-[#2e0e1d] via-surface-2 to-surface-2 p-5 shadow-card animate-float transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [animation-delay:-3s] hover:scale-[1.02] hover:border-danger/70 hover:shadow-glow-danger">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <strong className="font-display text-sm font-extrabold text-[#ff8ba0]">Campus South Gate Advisory</strong>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-danger-soft text-[#ff8ba0] border border-danger/40">Urgent</span>
                  </div>
                  <p className="text-xs text-muted/95 leading-relaxed">Scheduled civil maintenance active tonight from 10:00 PM onwards.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Marquee trust & features strip */}
        <div className="overflow-hidden border-y border-white/[0.08] bg-surface/90 py-4">
          <div className="marquee-track gap-12">
            {[...chips, ...chips].map((c, i) => (
              <span key={i} className="flex items-center gap-3 whitespace-nowrap text-xs font-extrabold tracking-wider text-muted/90 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand via-brand-2 to-cyan shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Main Feed Sections */}
      <section className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:py-24 sm:px-6">
        {loading ? (
          <CardSkeletons count={3} />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            {/* Urgent Alerts Section */}
            <Reveal className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[#ff8ba0]">
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
                  </span>
                  Priority Attention
                </span>
                <h2 className="mt-1.5 text-3xl sm:text-4xl font-extrabold">Urgent broadcasts</h2>
              </div>
              <Link href="/urgent" className={buttonClasses("secondary")}>
                View all priority alerts →
              </Link>
            </Reveal>
            {urgent.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {urgent.map((x, i) => (
                  <Reveal key={x.id} delay={i * 90}>
                    <AnnouncementCard item={x} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No urgent alerts right now.</p>
            )}

            {/* Campus Announcements Section */}
            <Reveal className="mb-8 mt-24 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-light flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-light shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  Latest Published Stream
                </span>
                <h2 className="mt-1.5 text-3xl sm:text-4xl font-extrabold">Campus announcements</h2>
              </div>
              <Link href="/announcements" className={buttonClasses("secondary")}>
                Open full feed →
              </Link>
            </Reveal>
            {items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((x, i) => (
                  <Reveal key={x.id} delay={i * 90}>
                    <AnnouncementCard item={x} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No announcements are published yet.</p>
            )}

            {/* Upcoming Events Section */}
            <Reveal className="mb-8 mt-24 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-2-light flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-2 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  Academic & Campus Calendar
                </span>
                <h2 className="mt-1.5 text-3xl sm:text-4xl font-extrabold">Upcoming events</h2>
              </div>
              <Link href="/events" className={buttonClasses("secondary")}>
                See all events →
              </Link>
            </Reveal>
            {upcoming.length ? (
              <div className="grid gap-5">
                {upcoming.map((x, i) => (
                  <Reveal key={x.id} delay={i * 90}>
                    <EventCard item={x} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No upcoming events are scheduled.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}


