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

export default function RoleDashboard({ role }: { role: "STUDENT" | "FACULTY" }) {
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
      if (u.role !== role) {
        router.replace(u.role === "ADMIN" ? "/admin/dashboard" : "/");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount; setLoading/setUser run inside the async call
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
      <div className="grid min-h-screen place-content-center place-items-center gap-3 bg-ink-900 text-ink">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 font-extrabold animate-spin-slow">N</div>
        <p className="text-muted">Preparing your campus dashboard…</p>
      </div>
    );

  const student = user?.student;
  const faculty = user?.faculty;
  const title = role === "STUDENT" ? student?.name || "Student" : "Faculty";
  const subtitle =
    role === "STUDENT"
      ? `${student?.studentId || "Campus student"} · Year ${student?.year || "—"} · Semester ${student?.semester || "—"}`
      : `${faculty?.designation || "Faculty"} · ${faculty?.facultyId || "Campus staff"}`;

  return (
    <div className={cx("min-h-screen text-ink", "bg-[radial-gradient(circle_at_80%_0,var(--color-brand-50),transparent_30%),var(--color-bg)]")}>
      <header className="sticky top-0 z-20 flex h-auto min-h-[70px] flex-wrap items-center gap-4 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-md sm:h-[78px] sm:flex-nowrap sm:px-[max(22px,5vw)] sm:py-0">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-ink text-lg text-bg">◈</span>
          <span>
            Notify<span className="text-brand">Hub</span>
          </span>
        </Link>
        <div className="hidden flex-1 items-center gap-2 text-[11px] font-semibold text-muted md:flex">
          <span className={cx("rounded-full px-2.5 py-1.5 text-[9px] tracking-[0.08em]", role === "STUDENT" ? "bg-success-soft text-[#8ff0c8]" : "bg-brand-50 text-brand-2")}>
            {role}
          </span>
          <span>Personal campus signal</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href={`/dashboard/feed?from=${role.toLowerCase()}`} className="hidden text-[11px] font-bold text-muted sm:inline-block">
            Public feed
          </Link>
          <Link href={`/dashboard/ask?from=${role.toLowerCase()}`} className="text-[11px] font-bold text-muted">
            Ask
          </Link>
          <button className={buttonClasses("secondary", "!px-3 !py-2 !text-[11px]")} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:py-14">
        <section className="mb-7 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <span className="text-[11px] font-bold text-brand">{role === "STUDENT" ? "Your student space" : "Your faculty space"}</span>
            <h1 className="my-2.5 text-4xl sm:text-5xl">
              Good to see you, <em className="not-italic text-brand">{title}</em>.
            </h1>
            <p className="text-muted">{subtitle}</p>
          </div>
          <div className="w-full rounded-2xl border border-border bg-surface p-4.5 shadow-soft md:w-[310px]">
            <span className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">Account</span>
            <strong className="my-2 block text-xs">{user?.email}</strong>
            <small className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">
              {role === "STUDENT" ? (student?.hosteller ? "Hosteller" : "Day scholar") : faculty?.departmentId ? `Department ${faculty.departmentId}` : "Faculty profile"}
            </small>
          </div>
        </section>
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {!error && (
          <>
            <section className="mb-12 grid gap-3 sm:grid-cols-3">
              <Reveal className="rounded-2xl border border-border bg-surface p-5 transition-transform duration-300 hover:-translate-y-1">
                <span className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">Announcements</span>
                <strong className="my-3 block font-display text-3xl">
                  <Counter value={anns.length} />
                </strong>
                <small className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">Relevant published updates</small>
              </Reveal>
              <Reveal delay={80} className="rounded-2xl border border-border bg-surface p-5 transition-transform duration-300 hover:-translate-y-1">
                <span className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">Upcoming</span>
                <strong className="my-3 block font-display text-3xl">
                  <Counter value={events.length} />
                </strong>
                <small className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">Events on your feed</small>
              </Reveal>
              <Reveal delay={160} className="rounded-2xl border border-border bg-surface p-5 transition-transform duration-300 hover:-translate-y-1">
                <span className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">Role</span>
                <strong className="my-3 block font-display text-3xl">{role === "STUDENT" ? "01" : "02"}</strong>
                <small className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">{role === "STUDENT" ? "Student view" : "Faculty view"}</small>
              </Reveal>
            </section>
            <section className="mt-12">
              <div className="mb-4.5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <span className="text-[11px] font-bold text-brand">For you</span>
                  <h2 className="mt-1.5 text-2xl">Recent announcements</h2>
                </div>
                <Link href="/announcements" className={buttonClasses("secondary")}>
                  View all
                </Link>
              </div>
              {anns.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {anns.map((x) => (
                    <AnnouncementCard key={x.id} item={x} />
                  ))}
                </div>
              ) : (
                <Empty label="relevant announcements" />
              )}
            </section>
            <section className="mt-12">
              <div className="mb-4.5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <span className="text-[11px] font-bold text-brand">Next up</span>
                  <h2 className="mt-1.5 text-2xl">Upcoming events</h2>
                </div>
                <Link href="/events" className={buttonClasses("secondary")}>
                  Open calendar
                </Link>
              </div>
              {events.length ? (
                <div className="grid gap-4">
                  {events.map((x) => (
                    <EventCard key={x.id} item={x} />
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
