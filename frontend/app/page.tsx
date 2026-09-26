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

const modules = [
  { icon: "◈", title: "Campus Announcements", text: "Publish and discover official campus communication from one reliable public feed.", tone: "brand" },
  { icon: "◌", title: "Urgent Alerts", text: "Surface high-priority broadcasts clearly so critical information is not buried.", tone: "danger" },
  { icon: "◇", title: "Campus Events", text: "Keep academic and campus events visible with schedules, locations, and registration details.", tone: "cyan" },
  { icon: "⌁", title: "Targeted Delivery", text: "Role, department, branch, section, hostel, or user targeting keeps communication relevant.", tone: "violet" },
  { icon: "◎", title: "Role-Aware Workspace", text: "Give admins, faculty, and students the right workflows without mixing responsibilities.", tone: "amber" },
  { icon: "↗", title: "Ask Campus", text: "Turn student questions into a structured communication channel with administrators.", tone: "white" },
];

const chips = [
  "Announcements",
  "Urgent Alerts",
  "Events",
  "Targeted Delivery",
  "Admin Workspace",
  "Faculty Workspace",
  "Student Workspace",
  "Ask Campus",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Home() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [urgent, setUrgent] = useState<Announcement[]>([]);
  const [announcementTotal, setAnnouncementTotal] = useState(0);
  const [eventTotal, setEventTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      announcements({ size: 3 }),
      upcomingEvents(0, 2),
      announcements({ size: 2, urgent: true }),
    ])
      .then(([a, e, u]) => {
        setItems(a.content);
        setUpcoming(e.content);
        setUrgent(u.content);
        setAnnouncementTotal(a.totalElements);
        setEventTotal(e.totalElements);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load the campus signal."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-x-hidden">
      <section className="nh-hero">
        <div className="nh-hero-grid bg-grid-pattern pointer-events-none" />
        <div className="nh-orb nh-orb-a" />
        <div className="nh-orb nh-orb-b" />
        <div className="nh-orb nh-orb-c" />

        <div className="mx-auto w-full max-w-[1240px] px-4 pb-8 pt-16 sm:px-6 sm:pt-24 lg:pt-28">
          <div className="nh-hero-copy">
            <Reveal variant="fade">
              <div className="nh-kicker rounded-full px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-200 sm:text-[11px]">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-brand-light opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-brand-light shadow-[0_0_12px_rgba(124,58,237,.9)]" />
                </span>
                Smart Campus Communication
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="nh-hero-title mt-7 font-display font-extrabold">
                Every campus signal.
                <br />
                <span className="text-gradient-animated">In one place.</span>
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p className="nh-hero-subtitle mt-7">
                NotifyHub replaces scattered notice boards and disconnected updates with a
                single digital campus signal for announcements, urgent alerts, events, and
                student communication.
              </p>
            </Reveal>

            <Reveal delay={260} className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                className={buttonClasses("primary", "!px-7 !py-3.5 !text-base btn-shine")}
                href="/announcements"
              >
                Explore campus feed →
              </Link>
              <Link
                className={buttonClasses("secondary", "!px-7 !py-3.5 !text-base")}
                href="/auth/login"
              >
                Sign in to NotifyHub
              </Link>
            </Reveal>
          </div>

          <Reveal variant="scale" delay={320}>
            <div className="nh-hero-stage">
              <div className="nh-stage-floor" />

              <div className="nh-float-card nh-float-left hidden sm:block">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Priority channel</span>
                  <span className="h-2 w-2 rounded-full bg-danger shadow-[0_0_12px_rgba(255,42,95,.8)]" />
                </div>
                <strong className="block text-sm font-extrabold text-white">
                  {urgent.length ? urgent[0].title : "Urgent alerts"}
                </strong>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                  {urgent.length ? urgent[0].content : "Critical campus updates are surfaced here."}
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-danger to-brand-magenta" />
                </div>
              </div>

              <div className="nh-float-card nh-float-right hidden sm:block">
                <div className="mb-4 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan/10 text-cyan-light">◇</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Next event</span>
                </div>
                <strong className="block text-sm font-extrabold text-white">
                  {upcoming.length ? upcoming[0].title : "Campus events"}
                </strong>
                <p className="mt-2 text-xs text-muted">
                  {upcoming.length
                    ? `${formatDate(upcoming[0].startAt)} · ${upcoming[0].location}`
                    : "Upcoming academic and campus events."}
                </p>
              </div>

              <div className="nh-dashboard">
                <div className="nh-dashboard-bar">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-xs font-bold text-white shadow-glow">
                      ◈
                    </span>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-white">NotifyHub</p>
                      <p className="text-[9px] text-muted">Campus command center</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-light/20 bg-teal-soft/60 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-teal-light">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-light shadow-[0_0_8px_rgba(0,245,160,.9)]" />
                    Live
                  </span>
                </div>

                <div className="nh-dashboard-body">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-brand-2-light">Live campus stream</p>
                        <h2 className="mt-1 text-base font-extrabold text-white">What matters now</h2>
                      </div>
                      <span className="text-[9px] text-muted">Public feed</span>
                    </div>

                    <div className="nh-live-list">
                      {items.length ? (
                        items.map((item) => (
                          <div className="nh-live-row" key={item.id}>
                            <span className={`grid h-8 w-8 place-items-center rounded-lg ${item.urgent ? "bg-danger-soft text-danger-light" : "bg-brand-50 text-brand-2-light"}`}>
                              {item.urgent ? "!" : "◈"}
                            </span>
                            <div className="min-w-0">
                              <strong className="block truncate text-white">{item.title}</strong>
                              <span className="block truncate">{item.publishedAt ? formatDate(item.publishedAt) : "Published announcement"}</span>
                            </div>
                            <span className="rounded-full bg-white/[.05] px-2 py-1 text-[8px] font-bold uppercase text-slate-300">
                              {item.urgent ? "Urgent" : "Published"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="nh-live-row">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[.05] text-muted">◈</span>
                          <div>
                            <strong className="block text-white">No published announcements</strong>
                            <span className="block">The live stream is ready for campus updates.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="nh-metrics">
                    <div className="nh-metric">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted">Announcements</span>
                      <strong className="text-white">{announcementTotal}</strong>
                      <span className="text-[9px] text-teal-light">published signal</span>
                    </div>
                    <div className="nh-metric">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted">Upcoming events</span>
                      <strong className="text-white">{eventTotal}</strong>
                      <span className="text-[9px] text-cyan-light">campus calendar</span>
                    </div>
                    <div className="nh-metric">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted">Urgent now</span>
                      <strong className="text-danger-light">{urgent.length}</strong>
                      <span className="text-[9px] text-danger-light">priority feed</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="nh-float-card nh-float-bottom hidden md:block">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Targeted delivery</span>
                  <span className="text-brand-2-light">◎</span>
                </div>
                <div className="mt-4 flex gap-2">
                  {["Admin", "Faculty", "Student"].map((role) => (
                    <span key={role} className="rounded-full border border-white/[.08] bg-white/[.04] px-2.5 py-1 text-[9px] font-bold text-slate-300">
                      {role}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted">
                  Role-aware communication without a noisy one-size-fits-all feed.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="overflow-hidden border-y border-white/[.07] bg-white/[.015] py-4 backdrop-blur-xl">
          <div className="marquee-track gap-10">
            {[...chips, ...chips].map((chip, index) => (
              <span key={index} className="flex items-center gap-3 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[.16em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-light to-cyan shadow-[0_0_8px_rgba(124,58,237,.7)]" />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="nh-section mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-[.2em] text-brand-2-light">Built around campus communication</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">One platform. Every important signal.</h2>
          <p className="mt-5 text-sm leading-7 text-muted sm:text-base">
            The visual language is expressive, but every surface below maps to a real NotifyHub workflow.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, index) => (
            <Reveal key={module.title} delay={index * 70}>
              <article className={`nh-feature-card spotlight spotlight-${module.tone} p-6`}>
                <div className="relative z-10">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/[.08] bg-white/[.045] text-lg text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
                    {module.icon}
                  </span>
                  <h3 className="mt-7 text-lg font-extrabold text-white">{module.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{module.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6 sm:pb-28">
        {loading ? (
          <CardSkeletons count={3} />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Reveal className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[.2em] text-danger-light">Priority attention</span>
                <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Urgent broadcasts</h2>
                <p className="mt-2 text-sm text-muted">Important campus information stays visible.</p>
              </div>
              <Link href="/urgent" className={buttonClasses("secondary")}>View all alerts →</Link>
            </Reveal>

            {urgent.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {urgent.map((item, index) => (
                  <Reveal key={item.id} delay={index * 90}><AnnouncementCard item={item} /></Reveal>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-6 text-sm text-muted">No urgent alerts right now.</div>
            )}

            <Reveal className="mb-8 mt-24 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[.2em] text-brand-2-light">Published campus signal</span>
                <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Latest announcements</h2>
              </div>
              <Link href="/announcements" className={buttonClasses("secondary")}>Open full feed →</Link>
            </Reveal>

            {items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, index) => (
                  <Reveal key={item.id} delay={index * 90}><AnnouncementCard item={item} /></Reveal>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-6 text-sm text-muted">No announcements are published yet.</div>
            )}

            <Reveal className="mb-8 mt-24 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[.2em] text-cyan-light">Academic & campus calendar</span>
                <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Upcoming events</h2>
              </div>
              <Link href="/events" className={buttonClasses("secondary")}>See all events →</Link>
            </Reveal>

            {upcoming.length ? (
              <div className="grid gap-5">
                {upcoming.map((item, index) => (
                  <Reveal key={item.id} delay={index * 90}><EventCard item={item} /></Reveal>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-6 text-sm text-muted">No upcoming events are scheduled.</div>
            )}
          </>
        )}
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-24 sm:px-6 sm:pb-32">
        <Reveal className="nh-glass-cta relative overflow-hidden rounded-[30px] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-light/20 blur-3xl" />
          <span className="relative text-[10px] font-extrabold uppercase tracking-[.22em] text-cyan-light">The campus signal is ready</span>
          <h2 className="relative mx-auto mt-4 max-w-3xl text-3xl font-extrabold sm:text-5xl">
            Stop searching for updates.
            <br />
            <span className="text-gradient-cyan">Start receiving the signal.</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
            Explore the public campus feed or sign in to your role-specific NotifyHub workspace.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link className={buttonClasses("primary", "!px-7 !py-3.5 btn-shine")} href="/announcements">Explore NotifyHub →</Link>
            <Link className={buttonClasses("secondary", "!px-7 !py-3.5")} href="/auth/login">Sign in</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
