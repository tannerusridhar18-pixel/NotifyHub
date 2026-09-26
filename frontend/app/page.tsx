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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      announcements({ size: 3 }),
      upcomingEvents(0, 3),
      announcements({ size: 3, urgent: true }),
    ])
      .then(([a, e, u]) => {
        setItems(a.content);
        setUpcoming(e.content);
        setUrgent(u.content);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load campus updates."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="nh-home overflow-x-hidden">
      <section className="nh-hero">
        <div className="nh-hero-grid bg-grid-pattern pointer-events-none" />
        <div className="nh-orb nh-orb-a" />
        <div className="nh-orb nh-orb-b" />

        <div className="mx-auto w-full max-w-[1240px] px-4 pb-10 pt-16 sm:px-6 sm:pt-24 lg:pt-28">
          <div className="nh-hero-copy">
            <Reveal variant="fade">
              <span className="nh-kicker rounded-full px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff5a] shadow-[0_0_12px_rgba(184,255,90,.8)]" />
                Smart campus communication
              </span>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="nh-hero-title mt-7 font-display font-extrabold text-white">
                Everything happening
                <br />
                <span className="nh-title-accent">on your campus.</span>
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p className="nh-hero-subtitle mt-7">
                One place for official announcements, campus events, and urgent updates.
                Stay informed without searching across notice boards, groups, and messages.
              </p>
            </Reveal>

            <Reveal delay={260} className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                className={buttonClasses("primary", "!border-0 !bg-[#b8ff5a] !text-[#07100a] !px-7 !py-3.5 !text-base btn-shine")}
                href="/announcements"
              >
                Explore announcements →
              </Link>
              <Link
                className={buttonClasses("secondary", "!border-white/10 !bg-white/[.04] !px-7 !py-3.5 !text-base !text-white")}
                href="/auth/login"
              >
                Sign in
              </Link>
            </Reveal>
          </div>

          <Reveal variant="scale" delay={320}>
            <div className="nh-hero-stage">
              <div className="nh-stage-floor" />

              <div className="nh-float-card nh-float-left hidden sm:block nh-card-urgent">
                <div className="mb-4 flex items-center justify-between">
                  <span className="nh-card-label">Urgent announcement</span>
                  <span className="h-2 w-2 rounded-full bg-[#ff5d73] shadow-[0_0_12px_rgba(255,93,115,.8)]" />
                </div>
                <strong className="block text-sm font-extrabold text-white">
                  {urgent.length ? urgent[0].title : "No urgent announcements"}
                </strong>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55">
                  {urgent.length ? urgent[0].content : "Critical campus updates will appear here."}
                </p>
              </div>

              <div className="nh-float-card nh-float-right hidden sm:block nh-card-event">
                <div className="mb-4 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#76d7ff]/10 text-[#76d7ff]">◇</span>
                  <span className="nh-card-label">Upcoming event</span>
                </div>
                <strong className="block text-sm font-extrabold text-white">
                  {upcoming.length ? upcoming[0].title : "No upcoming events"}
                </strong>
                <p className="mt-2 text-xs leading-relaxed text-white/55">
                  {upcoming.length
                    ? formatDate(upcoming[0].startAt) + " · " + upcoming[0].location
                    : "Campus events will appear here."}
                </p>
              </div>

              <div className="nh-dashboard">
                <div className="nh-dashboard-bar">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-xs font-black text-[#0a0d12]">N</span>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-white">NotifyHub</p>
                      <p className="text-[9px] text-white/40">Campus updates</p>
                    </div>
                  </div>
                  <span className="nh-live-pill">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff5a]" />
                    LIVE
                  </span>
                </div>

                <div className="nh-dashboard-body">
                  <div>
                    <div className="mb-4">
                      <p className="nh-dashboard-eyebrow">Latest announcements</p>
                      <h2 className="mt-1 text-lg font-extrabold text-white">What&apos;s new</h2>
                    </div>

                    <div className="nh-live-list">
                      {items.length ? (
                        items.map((item) => (
                          <div className="nh-live-row" key={item.id}>
                            <span className="nh-row-icon">◈</span>
                            <div className="min-w-0">
                              <strong className="block truncate text-white">{item.title}</strong>
                              <span className="block truncate">
                                {item.publishedAt ? formatDate(item.publishedAt) : "Published announcement"}
                              </span>
                            </div>
                            <span className="nh-row-tag">ANNOUNCEMENT</span>
                          </div>
                        ))
                      ) : (
                        <div className="nh-empty-row">No announcements published yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="nh-dashboard-side">
                    <div className="nh-side-stat">
                      <span>Announcements</span>
                      <strong>{items.length}</strong>
                    </div>
                    <div className="nh-side-stat">
                      <span>Events</span>
                      <strong>{upcoming.length}</strong>
                    </div>
                    <div className="nh-side-stat nh-side-stat-urgent">
                      <span>Urgent</span>
                      <strong>{urgent.length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="nh-content mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 sm:py-24">
        {loading ? (
          <CardSkeletons count={3} />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Reveal className="nh-section-heading">
              <span className="nh-section-number">01</span>
              <div>
                <span className="nh-section-label nh-label-announcement">Announcements</span>
                <h2>Latest campus announcements</h2>
                <p>Official updates published for the campus community.</p>
              </div>
              <Link href="/announcements" className={buttonClasses("secondary")}>View all →</Link>
            </Reveal>

            {items.length ? (
              <div className="nh-content-grid nh-announcement-grid">
                {items.map((item, index) => (
                  <Reveal key={item.id} delay={index * 80}><AnnouncementCard item={item} /></Reveal>
                ))}
              </div>
            ) : (
              <div className="nh-empty-content">No announcements are published yet.</div>
            )}

            <Reveal className="nh-section-heading nh-section-gap">
              <span className="nh-section-number">02</span>
              <div>
                <span className="nh-section-label nh-label-event">Events</span>
                <h2>Upcoming campus events</h2>
                <p>Academic and campus events with their schedule and location.</p>
              </div>
              <Link href="/events" className={buttonClasses("secondary")}>View all →</Link>
            </Reveal>

            {upcoming.length ? (
              <div className="nh-content-grid nh-event-grid">
                {upcoming.map((item, index) => (
                  <Reveal key={item.id} delay={index * 80}><EventCard item={item} /></Reveal>
                ))}
              </div>
            ) : (
              <div className="nh-empty-content">No upcoming events are scheduled.</div>
            )}

            <Reveal className="nh-section-heading nh-section-gap">
              <span className="nh-section-number">03</span>
              <div>
                <span className="nh-section-label nh-label-urgent">Urgent announcements</span>
                <h2>Priority campus updates</h2>
                <p>Important announcements that need attention are separated from the regular feed.</p>
              </div>
              <Link href="/urgent" className={buttonClasses("secondary")}>View all →</Link>
            </Reveal>

            {urgent.length ? (
              <div className="nh-content-grid nh-urgent-grid">
                {urgent.map((item, index) => (
                  <Reveal key={item.id} delay={index * 80}><AnnouncementCard item={item} /></Reveal>
                ))}
              </div>
            ) : (
              <div className="nh-empty-content nh-empty-urgent">No urgent announcements right now.</div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
