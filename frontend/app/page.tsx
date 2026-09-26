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

const featureItems = [
  {
    number: "01",
    label: "Announcements",
    title: "Keep everyone informed.",
    text: "Official campus announcements are published in one place, so students and staff can find current information without searching through scattered channels.",
    tone: "green",
  },
  {
    number: "02",
    label: "Events",
    title: "Never miss what is happening.",
    text: "Campus and academic events stay organized with dates, times, locations, and the information your campus community needs.",
    tone: "blue",
  },
  {
    number: "03",
    label: "Urgent Announcements",
    title: "Put important updates first.",
    text: "Urgent announcements are separated from the regular feed so time-sensitive campus information gets the attention it needs.",
    tone: "red",
  },
  {
    number: "04",
    label: "Role-aware communication",
    title: "The right information for the right people.",
    text: "NotifyHub supports targeted communication across roles and academic structures, including departments, branches, sections, hostels, and individual users.",
    tone: "violet",
  },
];

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
        <div className="nh-public-orbit nh-public-orbit-home" aria-hidden="true">
          <div className="nh-public-stars" />
          <div className="nh-public-sun" />
          <div className="nh-public-orbit-path nh-public-orbit-a"><i className="nh-public-planet nh-public-planet-a" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-b"><i className="nh-public-planet nh-public-planet-b" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-c"><i className="nh-public-planet nh-public-planet-c" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-d"><i className="nh-public-planet nh-public-planet-d" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-e"><i className="nh-public-planet nh-public-planet-e" /></div>
          <div className="nh-public-orbit-path nh-public-orbit-f"><i className="nh-public-planet nh-public-planet-f" /></div>
        </div>

        <div className="nh-bg-animation" aria-hidden="true">
          <span className="nh-bg-orb nh-bg-orb-1" />
          <span className="nh-bg-orb nh-bg-orb-2" />
          <span className="nh-bg-orb nh-bg-orb-3" />
          <span className="nh-bg-ring nh-bg-ring-1" />
          <span className="nh-bg-ring nh-bg-ring-2" />
          <span className="nh-bg-particles nh-bg-particles-1" />
          <span className="nh-bg-particles nh-bg-particles-2" />
          <span className="nh-bg-scanline" />
        </div>
        <div className="nh-hero-grid bg-grid-pattern pointer-events-none" />

        <div className="nh-home-hero-inner mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:pt-14">
          <div className="nh-hero-copy">
            <Reveal variant="fade">
              <span className="nh-kicker rounded-full px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff5a] shadow-[0_0_14px_rgba(184,255,90,.9)]" />
                Smart campus communication
              </span>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="nh-hero-title mt-8 font-display font-extrabold text-white">
                Your campus.
                <br />
                <span className="nh-title-accent">One clear signal.</span>
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p className="nh-hero-subtitle mt-7">
                NotifyHub brings official announcements, campus events, and urgent updates
                into one digital campus communication platform.
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
                Sign in to NotifyHub
              </Link>
            </Reveal>
          </div>

          <Reveal variant="scale" delay={340}>
            <div className="nh-product-stage">
              <div className="nh-stage-floor" />

              <div className="nh-float-card nh-float-left hidden md:block nh-card-urgent">
                <div className="flex items-center justify-between">
                  <span className="nh-card-label">Urgent announcement</span>
                  <span className="nh-status-dot nh-status-red" />
                </div>
                <strong className="mt-5 block text-sm font-extrabold text-white">
                  {urgent.length ? urgent[0].title : "Priority updates"}
                </strong>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/50">
                  {urgent.length ? urgent[0].content : "Time-sensitive campus announcements appear here."}
                </p>
              </div>

              <div className="nh-float-card nh-float-right hidden md:block nh-card-event">
                <div className="flex items-center justify-between">
                  <span className="nh-card-label">Upcoming event</span>
                  <span className="nh-status-dot nh-status-blue" />
                </div>
                <strong className="mt-5 block text-sm font-extrabold text-white">
                  {upcoming.length ? upcoming[0].title : "Campus events"}
                </strong>
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  {upcoming.length
                    ? formatDate(upcoming[0].startAt) + " · " + upcoming[0].location
                    : "Academic and campus events appear here."}
                </p>
              </div>

              <div className="nh-product-window">
                <div className="nh-product-topbar">
                  <div className="flex items-center gap-3">
                    <span className="nh-product-logo">N</span>
                    <div>
                      <p>NotifyHub</p>
                      <span>Campus communication</span>
                    </div>
                  </div>
                  <span className="nh-live-pill">
                    <span />
                    LIVE
                  </span>
                </div>

                <div className="nh-product-content">
                  <div className="nh-product-feed">
                    <div className="mb-5">
                      <span className="nh-product-eyebrow">Campus feed</span>
                      <h2>Latest announcements</h2>
                    </div>

                    <div className="nh-product-list">
                      {items.length ? (
                        items.map((item) => (
                          <div className="nh-product-row" key={item.id}>
                            <span className="nh-row-icon">◈</span>
                            <div>
                              <strong>{item.title}</strong>
                              <span>
                                {item.publishedAt
                                  ? formatDate(item.publishedAt)
                                  : "Published announcement"}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="nh-empty-row">No announcements published yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="nh-product-side">
                    <div>
                      <span>Announcements</span>
                      <strong>{items.length}</strong>
                    </div>
                    <div>
                      <span>Events</span>
                      <strong>{upcoming.length}</strong>
                    </div>
                    <div className="nh-product-urgent">
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

      <section className="nh-features mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="nh-section-intro">
          <span>Everything your campus needs to communicate clearly</span>
          <h2>One platform for everyday updates and important moments.</h2>
          <p>
            NotifyHub keeps the public campus signal simple while giving authorized users
            the tools to publish and manage communication.
          </p>
        </Reveal>

        <div className="nh-feature-grid">
          {featureItems.map((item, index) => (
            <Reveal key={item.number} delay={index * 80}>
              <article className={"nh-feature-panel nh-feature-" + item.tone}>
                <span className="nh-feature-number">{item.number}</span>
                <span className="nh-feature-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="nh-live-section mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6 sm:pb-28">
        {loading ? (
          <CardSkeletons count={3} />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Reveal className="nh-content-heading">
              <div>
                <span className="nh-heading-green">01 — Announcements</span>
                <h2>Latest campus announcements</h2>
                <p>Official updates published for the campus community.</p>
              </div>
              <Link href="/announcements" className={buttonClasses("secondary")}>View all →</Link>
            </Reveal>
            {items.length ? (
              <div className="nh-card-grid">
                {items.map((item, index) => (
                  <Reveal key={item.id} delay={index * 70}>
                    <AnnouncementCard item={item} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="nh-empty-content">No announcements are published yet.</div>
            )}

            <Reveal className="nh-content-heading nh-content-heading-gap">
              <div>
                <span className="nh-heading-blue">02 — Events</span>
                <h2>Upcoming campus events</h2>
                <p>See what is happening next, with the schedule and location.</p>
              </div>
              <Link href="/events" className={buttonClasses("secondary")}>View all →</Link>
            </Reveal>
            {upcoming.length ? (
              <div className="nh-card-grid">
                {upcoming.map((item, index) => (
                  <Reveal key={item.id} delay={index * 70}>
                    <EventCard item={item} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="nh-empty-content">No upcoming events are scheduled.</div>
            )}

            <Reveal className="nh-content-heading nh-content-heading-gap">
              <div>
                <span className="nh-heading-red">03 — Urgent announcements</span>
                <h2>Priority campus updates</h2>
                <p>Important announcements are separated so they remain easy to notice.</p>
              </div>
              <Link href="/urgent" className={buttonClasses("secondary")}>View all →</Link>
            </Reveal>
            {urgent.length ? (
              <div className="nh-card-grid nh-card-grid-two">
                {urgent.map((item, index) => (
                  <Reveal key={item.id} delay={index * 70}>
                    <AnnouncementCard item={item} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="nh-empty-content nh-empty-urgent">No urgent announcements right now.</div>
            )}
          </>
        )}
      </section>

      <section className="nh-final-cta mx-auto w-full max-w-[1240px] px-4 pb-24 sm:px-6 sm:pb-32">
        <Reveal className="nh-cta-panel">
          <div className="nh-cta-glow" aria-hidden="true" />
          <span>NotifyHub</span>
          <h2>Keep your campus informed.</h2>
          <p>Explore the public campus feed or sign in to your NotifyHub workspace.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className={buttonClasses("primary", "!border-0 !bg-[#b8ff5a] !text-[#07100a] !px-7 !py-3.5")} href="/announcements">
              Explore campus updates →
            </Link>
            <Link className={buttonClasses("secondary", "!border-white/10 !bg-white/[.04] !px-7 !py-3.5 !text-white")} href="/auth/login">
              Sign in
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
