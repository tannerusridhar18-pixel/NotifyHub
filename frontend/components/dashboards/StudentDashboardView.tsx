"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  announcements,
  upcomingEvents,
  myEventRegistrations,
  myQueries,
  submitStudentQuery,
  departmentFacultyList,
  registerForEvent,
  logout,
  type CurrentUser,
  type DepartmentFacultyItem,
} from "@/lib/api";
import type { Announcement, CampusQuery, EventItem } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import { Empty, ErrorState, Loading } from "@/components/States";
import { StatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Reveal from "@/components/ui/Reveal";
import Spotlight from "@/components/ui/Spotlight";
import { inputBase, textareaBase } from "@/components/ui/classes";

export default function StudentDashboardView({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<"feed" | "registrations" | "queries">("feed");
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [myRegs, setMyRegs] = useState<EventItem[]>([]);
  const [queriesList, setQueriesList] = useState<CampusQuery[]>([]);
  const [deptFaculty, setDeptFaculty] = useState<DepartmentFacultyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Query Form state
  const [targetType, setTargetType] = useState<"DEPARTMENT_ADMIN" | "FACULTY">("FACULTY");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [querySubject, setQuerySubject] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const [querySubmitting, setQuerySubmitting] = useState(false);
  const [querySuccess, setQuerySuccess] = useState("");
  const [queryError, setQueryError] = useState("");

  const student = user.student;
  const deptId = student?.departmentId || user.departmentId;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, e, r, q] = await Promise.all([
        announcements({ size: 12 }),
        upcomingEvents(0, 8),
        myEventRegistrations(0, 20).catch(() => ({ content: [] })),
        myQueries(0, 50).catch(() => ({ content: [] })),
      ]);
      setAnns(a.content || []);
      setEventsList(e.content || []);
      setMyRegs(r.content || []);
      setQueriesList(q.content || []);

      if (deptId) {
        const fac = await departmentFacultyList(deptId).catch(() => []);
        setDeptFaculty(fac || []);
        if (fac && fac.length > 0) {
          setSelectedFacultyId(String(fac[0].id));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleRegister(eventId: number) {
    try {
      await registerForEvent(eventId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not register for event.");
    }
  }

  async function handleSendQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!queryMessage.trim()) return;
    setQuerySubmitting(true);
    setQuerySuccess("");
    setQueryError("");
    try {
      await submitStudentQuery({
        subject: querySubject || "Student Inquiry",
        message: queryMessage,
        targetType,
        targetFacultyId: targetType === "FACULTY" && selectedFacultyId ? Number(selectedFacultyId) : undefined,
      });
      setQuerySuccess("Your inquiry has been routed successfully!");
      setQuerySubject("");
      setQueryMessage("");
      const qRes = await myQueries(0, 50);
      setQueriesList(qRes.content || []);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : "Failed to submit query.");
    } finally {
      setQuerySubmitting(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  if (loading) {
    return <Loading label="Loading your student workspace…" />;
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 flex min-h-[74px] flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-bg/85 px-4 py-3 backdrop-blur-2xl sm:px-8">
        <Link href="/" className="group flex items-center gap-3 font-display text-lg font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white shadow-glow transition-all duration-300 group-hover:scale-110">
            ◈
          </span>
          <span className="tracking-tight text-xl font-extrabold">
            Notify<span className="text-brand-light">Hub</span>
          </span>
        </Link>
        <div className="hidden items-center gap-2 text-xs font-semibold text-muted md:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-light/40 bg-teal-soft px-3 py-0.5 text-[10px] font-extrabold uppercase text-teal-light shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            STUDENT PORTAL
          </span>
          <span>{student?.studentId ? `ID: ${student.studentId}` : user.email}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/feed?from=student"
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Campus Feed
          </Link>
          <Link
            href="/dashboard/profile?from=student"
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            My Profile
          </Link>
          <button
            onClick={() => void handleSignOut()}
            className="rounded-xl border border-white/10 bg-surface-2/60 px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[1300px] px-4 py-8 sm:px-8">
        {/* Banner Section */}
        <section className="mb-8 rounded-3xl border border-white/12 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 shadow-lift backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-light/30 bg-teal-soft/80 px-3 py-1 text-[10px] font-extrabold tracking-widest text-teal-light uppercase">
                Academic Year {student?.year || 1} · Semester {student?.semester || 1}
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome, <span className="text-gradient-animated">{student?.name || "Student"}</span>
              </h1>
              <p className="mt-1 text-sm text-muted">
                {user.department || "Academic Department"} · {student?.hosteller ? "Hostel Resident" : "Day Scholar"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Updates</span>
                <span className="text-2xl font-extrabold text-white">{anns.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Registrations</span>
                <span className="text-2xl font-extrabold text-teal-light">{myRegs.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">My Queries</span>
                <span className="text-2xl font-extrabold text-brand-light">{queriesList.length}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-white/[0.08] pt-6 overflow-x-auto">
            <button
              onClick={() => setTab("feed")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "feed"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📢 Announcements & Upcoming Events
            </button>
            <button
              onClick={() => setTab("registrations")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "registrations"
                  ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              🎟️ My Event Registrations ({myRegs.length})
            </button>
            <button
              onClick={() => setTab("queries")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "queries"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              💬 Ask Faculty & Dept Admin ({queriesList.length})
            </button>
          </div>
        </section>

        {error && <ErrorState message={error} onRetry={() => void loadData()} />}

        {!error && tab === "feed" && (
          <div className="space-y-10">
            {/* Announcements Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-white">Targeted Campus Notices</h2>
                <span className="text-xs font-bold text-muted">{anns.length} Active Notices</span>
              </div>
              {anns.length === 0 ? (
                <Empty label="No notices for your section or year at this moment." />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {anns.map((a) => (
                    <AnnouncementCard key={a.id} item={a} />
                  ))}
                </div>
              )}
            </div>

            {/* Events Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-white">Upcoming Campus Events</h2>
                <span className="text-xs font-bold text-muted">{eventsList.length} Scheduled</span>
              </div>
              {eventsList.length === 0 ? (
                <Empty label="upcoming events" />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {eventsList.map((e) => (
                    <EventCard key={e.id} item={e} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!error && tab === "registrations" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white">My Event Registrations</h2>
                <p className="text-xs text-muted">All active events you have successfully registered for.</p>
              </div>
            </div>
            {myRegs.length === 0 ? (
              <Empty label="registered events" />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {myRegs.map((e) => (
                  <EventCard key={e.id} item={e} />
                ))}
              </div>
            )}
          </div>
        )}

        {!error && tab === "queries" && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Ask Query Form */}
            <div className="lg:col-span-5">
              <Spotlight tone="brand" className="rounded-3xl border border-white/12 bg-surface/95 p-6 shadow-lift">
                <h2 className="text-xl font-extrabold text-white">Send Direct Inquiry</h2>
                <p className="mt-1 text-xs text-muted">
                  Route your question to your department faculty coordinator or administrative desk.
                </p>

                <form onSubmit={handleSendQuery} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                      Inquiry Recipient
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetType("FACULTY")}
                        className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                          targetType === "FACULTY"
                            ? "border-brand bg-brand-50 text-brand-light shadow-sm"
                            : "border-white/10 bg-surface-2/60 text-muted"
                        }`}
                      >
                        👨‍🏫 Specific Faculty
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetType("DEPARTMENT_ADMIN")}
                        className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                          targetType === "DEPARTMENT_ADMIN"
                            ? "border-brand bg-brand-50 text-brand-light shadow-sm"
                            : "border-white/10 bg-surface-2/60 text-muted"
                        }`}
                      >
                        🏛️ Dept Admin Desk
                      </button>
                    </div>
                  </div>

                  {targetType === "FACULTY" && (
                    <Field label="Select Faculty Member (Department Scoped)">
                      <select
                        value={selectedFacultyId}
                        onChange={(e) => setSelectedFacultyId(e.target.value)}
                        className={inputBase}
                        required
                      >
                        {deptFaculty.length === 0 && <option value="">No faculty mapped to your department</option>}
                        {deptFaculty.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.designation} · {f.relationship})
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label="Subject / Topic">
                    <input
                      type="text"
                      placeholder="e.g. Lab schedule clarification, assignment submission"
                      value={querySubject}
                      onChange={(e) => setQuerySubject(e.target.value)}
                      className={inputBase}
                      required
                    />
                  </Field>

                  <Field label="Message / Question">
                    <textarea
                      rows={4}
                      placeholder="Describe your inquiry in detail…"
                      value={queryMessage}
                      onChange={(e) => setQueryMessage(e.target.value)}
                      className={textareaBase}
                      required
                    />
                  </Field>

                  {querySuccess && (
                    <p className="rounded-xl border border-teal-light/40 bg-teal-soft p-3 text-xs font-bold text-teal-light">
                      ✓ {querySuccess}
                    </p>
                  )}

                  {queryError && (
                    <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-bold text-red-400">
                      ⚠ {queryError}
                    </p>
                  )}

                  <Button type="submit" variant="primary" disabled={querySubmitting} className="w-full">
                    {querySubmitting ? "Submitting Inquiry…" : "Send Inquiry →"}
                  </Button>
                </form>
              </Spotlight>
            </div>

            {/* Inquiries History */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 shadow-lift">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-white">Your Sent Inquiries</h2>
                  <span className="text-xs font-bold text-muted">{queriesList.length} Total</span>
                </div>

                {queriesList.length === 0 ? (
                  <Empty label="You haven't submitted any questions yet." />
                ) : (
                  <div className="space-y-4">
                    {queriesList.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-2xl border border-white/10 bg-surface-2/70 p-4 transition-all hover:border-white/20"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-white">{q.subject || "Campus Inquiry"}</span>
                          <StatusBadge status={q.status} />
                        </div>
                        <p className="mt-2 text-xs text-muted/90">{q.message || q.question}</p>
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-muted">
                          <span>Target: {q.targetType === "FACULTY" ? `Faculty ${q.targetFacultyName || ""}` : "Department Admin Desk"}</span>
                          <span>·</span>
                          <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>

                        {q.adminResponse && (
                          <div className="mt-3 rounded-xl border border-brand/30 bg-brand-50/60 p-3">
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-brand-light">
                              Official Response:
                            </span>
                            <p className="mt-1 text-xs text-ink">{q.adminResponse}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
