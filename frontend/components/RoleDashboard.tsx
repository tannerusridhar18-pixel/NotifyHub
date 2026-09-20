"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { announcements, currentUser, logout, upcomingEvents, type CurrentUser } from "@/lib/api";
import type { Announcement, EventItem } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import { Empty, ErrorState } from "@/components/States";
import { buttonClasses } from "@/components/ui/Button";
import { cx } from "@/components/ui/classes";
import Counter from "@/components/ui/Counter";
import Reveal from "@/components/ui/Reveal";

import StudentDashboardView from "@/components/dashboards/StudentDashboardView";
import FacultyDashboardView from "@/components/dashboards/FacultyDashboardView";
import HodDashboardView from "@/components/dashboards/HodDashboardView";
import PrincipalDashboardView from "@/components/dashboards/PrincipalDashboardView";
import DeanDashboardView from "@/components/dashboards/DeanDashboardView";

export default function RoleDashboard({ role }: { role?: string }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const u = await currentUser();
      const currentLevel = u.roleLevel !== undefined ? u.roleLevel : 5;
      const expectedRole = (role || "").toUpperCase();
      const expectedLevel =
        expectedRole === "PRINCIPAL" ? 1 :
        expectedRole === "DEAN" ? 2 :
        expectedRole === "HOD" ? 3 :
        expectedRole === "FACULTY" ? 4 :
        expectedRole === "STUDENT" ? 5 : 0;

      if (expectedRole && currentLevel !== expectedLevel) {
        if (currentLevel === 0) {
          router.replace("/admin/dashboard");
        } else if (currentLevel === 1) {
          router.replace("/dashboard/principal");
        } else if (currentLevel === 2) {
          router.replace("/dashboard/dean");
        } else if (currentLevel === 3) {
          router.replace("/dashboard/hod");
        } else if (currentLevel === 4) {
          router.replace("/dashboard/faculty");
        } else if (currentLevel === 5) {
          router.replace("/dashboard/student");
        } else {
          router.replace("/");
        }
        return;
      }
      const [a, e] = await Promise.all([announcements({ size: 8 }), upcomingEvents(0, 6)]);
      setUser(u);
      setAnns(a.content);
      setEvents(e.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [role, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void load();
  }, [load]);

  async function signOut() {
    try {
      await logout();
    } finally {
      router.replace("/auth/login");
    }
  }

  if (loading)
    return (
      <div className="grid min-h-screen place-content-center place-items-center gap-4 bg-bg text-ink">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white font-black shadow-glow animate-spin-slow text-xl">
          ◈
        </div>
        <p className="text-sm font-bold tracking-wide text-muted">Preparing your campus workspace…</p>
      </div>
    );

  if (user) {
    const r = (user.role || role || "").toUpperCase();
    if (r === "STUDENT") return <StudentDashboardView user={user} />;
    if (r === "FACULTY") return <FacultyDashboardView user={user} />;
    if (r === "HOD") return <HodDashboardView user={user} />;
    if (r === "PRINCIPAL") return <PrincipalDashboardView user={user} />;
    if (r === "DEAN") return <DeanDashboardView user={user} />;
  }

  const displayRole = (user?.role || role || "MEMBER").toUpperCase();
  const student = user?.student;
  const faculty = user?.faculty;
  const title =
    displayRole === "STUDENT"
      ? student?.name || "Student"
      : displayRole === "FACULTY"
      ? faculty?.name || "Faculty Member"
      : `${displayRole.replace(/_/g, " ")}`;

  const subtitle =
    displayRole === "STUDENT"
      ? `${student?.studentId || "Campus student"} · Year ${student?.year || "—"} · Semester ${student?.semester || "—"}`
      : displayRole === "FACULTY"
      ? `${faculty?.designation || "Faculty"} · ${faculty?.facultyId || "Campus staff"}`
      : `${user?.department ? user.department + " · " : ""}Campus Executive (Level ${user?.roleLevel ?? "—"})`;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 flex h-auto min-h-[74px] flex-wrap items-center gap-4 border-b border-white/[0.08] bg-bg/85 px-4 py-3 backdrop-blur-2xl sm:h-[82px] sm:flex-nowrap sm:px-8 sm:py-0">
        <Link href="/" className="group flex items-center gap-3 font-display text-lg font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white shadow-glow transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-violet">
            ◈
          </span>
          <span className="tracking-tight text-xl font-extrabold">
            Notify<span className="text-brand-light">Hub</span>
          </span>
        </Link>
        <div className="hidden flex-1 items-center gap-2.5 text-xs font-semibold text-muted md:flex">
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-md shadow-sm",
              displayRole === "STUDENT"
                ? "border border-teal-light/40 bg-teal-soft text-teal-light shadow-[0_0_12px_rgba(45,212,191,0.2)]"
                : "border border-brand-2/40 bg-brand-50 text-brand-2-light shadow-[0_0_12px_rgba(168,85,247,0.2)]"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {displayRole.replace(/_/g, " ")} WORKSPACE
          </span>
          <span>Personalized campus feed</span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href={`/dashboard/feed?from=${displayRole.toLowerCase()}`}
            className="hidden rounded-xl px-3 py-2 text-xs font-extrabold text-muted hover:bg-surface-2 hover:text-white transition-all duration-200 sm:inline-block"
          >
            Feed
          </Link>
          <Link
            href={`/dashboard/calendar?from=${displayRole.toLowerCase()}`}
            className="hidden rounded-xl px-3 py-2 text-xs font-extrabold text-muted hover:bg-surface-2 hover:text-white transition-all duration-200 sm:inline-block"
          >
            Calendar
          </Link>
          <Link
            href={`/dashboard/ask?from=${displayRole.toLowerCase()}`}
            className="rounded-xl px-3 py-2 text-xs font-extrabold text-muted hover:bg-surface-2 hover:text-white transition-all duration-200"
          >
            Ask Campus
          </Link>
          <Link
            href={`/dashboard/profile?from=${displayRole.toLowerCase()}`}
            className="rounded-xl px-3 py-2 text-xs font-extrabold text-muted hover:bg-surface-2 hover:text-white transition-all duration-200"
          >
            Profile
          </Link>
          <button className={buttonClasses("secondary", "!px-3.5 !py-2 !text-xs")} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:py-14 sm:px-6">
        <section className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-50/90 px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-brand-light uppercase shadow-[0_0_16px_rgba(99,102,241,0.25)] backdrop-blur-xl">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-light" />
              </span>
              {displayRole.replace(/_/g, " ")} Workspace
            </span>
            <h1 className="my-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              Good to see you, <em className="not-italic text-gradient-animated">{title}</em>.
            </h1>
            <p className="text-muted text-base sm:text-lg">{subtitle}</p>
          </Reveal>
          <Reveal delay={100} className="w-full rounded-2xl border border-white/12 bg-surface/90 p-5 shadow-lift backdrop-blur-2xl md:w-[340px] transition-all hover:border-white/20">
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-muted/80">Account Overview</span>
              <Link
                href={`/dashboard/profile?from=${displayRole.toLowerCase()}`}
                className="text-[10px] font-bold text-brand-light hover:underline"
              >
                View Profile →
              </Link>
            </div>
            <strong className="my-2 block text-sm font-extrabold text-ink">{user?.email}</strong>
            <small className="inline-flex items-center gap-2 rounded-xl bg-surface-2/95 px-3 py-1.5 text-[10px] font-bold text-muted border border-white/[0.06]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-light" />
              {displayRole === "STUDENT"
                ? student?.hosteller ? "Hosteller Resident" : "Day Scholar"
                : user?.department ? user.department : `${displayRole.replace(/_/g, " ")} Profile`}
            </small>
          </Reveal>
        </section>

        {error && <ErrorState message={error} onRetry={() => void load()} />}

        {!error && (
          <>
            <section className="mb-14 grid gap-5 sm:grid-cols-3">
              <Reveal className="rounded-2xl border border-white/12 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-light/50 hover:shadow-card-hover hover:shadow-glow/30">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-brand-light">Announcements</span>
                <strong className="my-2.5 block font-display text-4xl sm:text-5xl font-extrabold text-white">
                  <Counter value={anns.length} />
                </strong>
                <small className="text-xs font-bold text-muted/90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-light" /> Relevant published updates
                </small>
              </Reveal>
              <Reveal delay={80} className="rounded-2xl border border-white/12 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-2/50 hover:shadow-card-hover hover:shadow-glow-violet/30">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-brand-2-light">Upcoming Events</span>
                <strong className="my-2.5 block font-display text-4xl sm:text-5xl font-extrabold text-white">
                  <Counter value={events.length} />
                </strong>
                <small className="text-xs font-bold text-muted/90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-2" /> Events scheduled on feed
                </small>
              </Reveal>
              <Reveal delay={160} className="rounded-2xl border border-white/12 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-light/50 hover:shadow-card-hover hover:shadow-glow-cyan/30">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-teal-light">Access Level</span>
                <strong className="my-2.5 block font-display text-4xl sm:text-5xl font-extrabold text-white">
                  {`L${user?.roleLevel ?? "—"}`}
                </strong>
                <small className="text-xs font-bold text-muted/90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-light" /> {displayRole.replace(/_/g, " ")} portal active
                </small>
              </Reveal>
            </section>

            <section className="mt-14">
              <Reveal className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <span className="text-[11px] font-extrabold tracking-widest text-brand-light uppercase flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-light" /> Tailored Stream
                  </span>
                  <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold">Recent announcements</h2>
                </div>
                <Link href={`/dashboard/feed?from=${displayRole.toLowerCase()}`} className={buttonClasses("secondary")}>
                  View all announcements →
                </Link>
              </Reveal>
              {anns.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {anns.map((x, i) => (
                    <Reveal key={x.id} delay={i * 80}>
                      <AnnouncementCard item={x} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <Empty label="relevant announcements" />
              )}
            </section>

            <section className="mt-16">
              <Reveal className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <span className="text-[11px] font-extrabold tracking-widest text-brand-2-light uppercase flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-2" /> Scheduled Dates
                  </span>
                  <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold">Upcoming events</h2>
                </div>
                <Link href={`/dashboard/calendar?from=${displayRole.toLowerCase()}`} className={buttonClasses("secondary")}>
                  Open campus calendar →
                </Link>
              </Reveal>
              {events.length ? (
                <div className="grid gap-5">
                  {events.map((x, i) => (
                    <Reveal key={x.id} delay={i * 80}>
                      <EventCard item={x} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <Empty label="upcoming events" />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
