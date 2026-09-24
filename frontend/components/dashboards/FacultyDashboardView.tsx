"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  currentUser,
  myAnnouncements,
  myEvents,
  facultyQueryInbox,
  answerScopedQuery,
  submitFacultyQuery,
  createAnnouncement,
  createEvent,
  deleteAnnouncement,
  deleteEvent,
  structureSections,
  logout,
  safeUrl,
  type CurrentUser,
  type StructureSection,
} from "@/lib/api";
import type { Announcement, CampusQuery, EventItem, FacultyDepartmentMappingItem } from "@/types";
import { Empty, ErrorState, Loading } from "@/components/States";
import { StatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import { inputBase, textareaBase } from "@/components/ui/classes";

export default function FacultyDashboardView({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<"notices" | "inbox" | "askAdmin">("notices");
  const [myAnns, setMyAnns] = useState<Announcement[]>([]);
  const [myEvts, setMyEvts] = useState<EventItem[]>([]);
  const [studentQueries, setStudentQueries] = useState<CampusQuery[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Post composer state
  const [postType, setPostType] = useState<"ANNOUNCEMENT" | "EVENT">("ANNOUNCEMENT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<number>(user.faculty?.departmentId || user.departmentId || 1);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [urgent, setUrgent] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [composerBusy, setComposerBusy] = useState(false);
  const [composerMsg, setComposerMsg] = useState("");

  // Answer query modal / inline state
  const [replyingQueryId, setReplyingQueryId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  // Ask Admin state
  const [adminSubject, setAdminSubject] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");

  const faculty = user.faculty;
  const mappings: FacultyDepartmentMappingItem[] = faculty?.departmentMappings || [];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, e, q, s] = await Promise.all([
        myAnnouncements({ size: 30 }),
        myEvents({ size: 30 }),
        facultyQueryInbox(0, 50),
        structureSections().catch(() => []),
      ]);
      setMyAnns(a.content || []);
      setMyEvts(e.content || []);
      setStudentQueries(q.content || []);
      setSections(s || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load faculty workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void loadData();
  }, [loadData]);

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setComposerBusy(true);
    setComposerMsg("");
    try {
      if (postType === "ANNOUNCEMENT") {
        await createAnnouncement({
          title,
          content,
          urgent,
          targetType: selectedSectionId ? "SECTION" : "DEPARTMENT",
          departmentId: selectedDeptId,
          sectionId: selectedSectionId ? Number(selectedSectionId) : undefined,
          attachmentUrl: attachmentUrl.trim() || undefined,
          attachmentName: attachmentName.trim() || undefined,
        });
      } else {
        await createEvent({
          title,
          description: content,
          location: eventLocation || "Campus Seminar Hall",
          startAt: eventStart ? new Date(eventStart).toISOString() : new Date().toISOString(),
          endAt: eventEnd ? new Date(eventEnd).toISOString() : new Date(Date.now() + 3600000).toISOString(),
          targetType: selectedSectionId ? "SECTION" : "DEPARTMENT",
          departmentId: selectedDeptId,
          sectionId: selectedSectionId ? Number(selectedSectionId) : undefined,
          registrationEnabled: true,
        });
      }
      setComposerMsg("✓ Notice broadcasted successfully!");
      setTitle("");
      setContent("");
      setAttachmentUrl("");
      setAttachmentName("");
      setEventLocation("");
      setEventStart("");
      setEventEnd("");
      await loadData();
    } catch (err) {
      setComposerMsg(`⚠ ${err instanceof Error ? err.message : "Could not publish notice."}`);
    } finally {
      setComposerBusy(false);
    }
  }

  async function handleAnswerQuery(queryId: number) {
    if (!replyText.trim()) return;
    setReplyBusy(true);
    try {
      await answerScopedQuery(queryId, replyText);
      setReplyingQueryId(null);
      setReplyText("");
      const q = await facultyQueryInbox(0, 50);
      setStudentQueries(q.content || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit answer.");
    } finally {
      setReplyBusy(false);
    }
  }

  async function handleAskAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminMessage.trim()) return;
    setAdminBusy(true);
    setAdminMsg("");
    try {
      await submitFacultyQuery({
        subject: adminSubject || "Faculty Administrative Request",
        message: adminMessage,
      });
      setAdminMsg("✓ Inquiry dispatched to your Home Department Administration.");
      setAdminSubject("");
      setAdminMessage("");
    } catch (err) {
      setAdminMsg(`⚠ ${err instanceof Error ? err.message : "Failed to contact department admin."}`);
    } finally {
      setAdminBusy(false);
    }
  }

  async function handleDeletePost(id: number, type: "announcement" | "event") {
    if (!confirm("Are you sure you want to remove this notice?")) return;
    try {
      if (type === "announcement") await deleteAnnouncement(id);
      else await deleteEvent(id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete notice.");
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  if (loading) {
    return <Loading label="Loading faculty academic workspace…" />;
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-50 px-3 py-0.5 text-[10px] font-extrabold uppercase text-brand-light shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            FACULTY WORKSPACE
          </span>
          <span>{faculty?.facultyId ? `Staff ID: ${faculty.facultyId}` : user.email}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard/my-posts" className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all">My Posts</Link>
          <Link
            href="/dashboard/feed?from=faculty"
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Campus Feed
          </Link>
          <Link
            href="/dashboard/profile?from=faculty"
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Faculty Profile
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                  ★ HOME: {user.department || "Engineering"}
                </span>
                {mappings.filter((m) => m.relationship !== "HOME").map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold text-muted"
                  >
                    {m.relationship}: {m.departmentName}
                  </span>
                ))}
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                {faculty?.name || "Faculty Professor"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {faculty?.designation || "Senior Faculty Member"} · Level 4 Academic Staff
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">My Posts</span>
                <span className="text-2xl font-extrabold text-white">{myAnns.length + myEvts.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Student Inquiries</span>
                <span className="text-2xl font-extrabold text-brand-light">{studentQueries.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Pending Replies</span>
                <span className="text-2xl font-extrabold text-amber-400">
                  {studentQueries.filter((q) => q.status === "OPEN").length}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-white/[0.08] pt-6 overflow-x-auto">
            <button
              onClick={() => setTab("notices")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "notices"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📢 Post Composer & My Published Notices
            </button>
            <button
              onClick={() => setTab("inbox")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "inbox"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📥 Student Inquiries Desk ({studentQueries.filter((q) => q.status === "OPEN").length} Open)
            </button>
            <button
              onClick={() => setTab("askAdmin")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "askAdmin"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              🏛️ Ask Dept Administration
            </button>
          </div>
        </section>

        {error && <ErrorState message={error} onRetry={() => void loadData()} />}

        {!error && tab === "notices" && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Post Composer */}
            <div className="lg:col-span-5">
              <Spotlight tone="brand" className="rounded-3xl border border-white/12 bg-surface/95 p-6 shadow-lift">
                <h2 className="text-xl font-extrabold text-white">Broadcast Class / Dept Notice</h2>
                <p className="mt-1 text-xs text-muted">
                  Post targeted academic updates or schedule class events with attachments.
                </p>

                <form onSubmit={handleCreatePost} className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPostType("ANNOUNCEMENT")}
                      className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                        postType === "ANNOUNCEMENT"
                          ? "border-brand bg-brand-50 text-brand-light shadow-sm"
                          : "border-white/10 bg-surface-2/60 text-muted"
                      }`}
                    >
                      📢 Announcement
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostType("EVENT")}
                      className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                        postType === "EVENT"
                          ? "border-brand bg-brand-50 text-brand-light shadow-sm"
                          : "border-white/10 bg-surface-2/60 text-muted"
                      }`}
                    >
                      📅 Class / Lab Event
                    </button>
                  </div>

                  <Field label="Target Department Scope">
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                      className={inputBase}
                    >
                      {mappings.length > 0 ? (
                        mappings.map((m) => (
                          <option key={m.id} value={m.departmentId}>
                            {m.departmentName} ({m.relationship})
                          </option>
                        ))
                      ) : (
                        <option value={user.departmentId || 1}>{user.department || "Assigned Department"}</option>
                      )}
                    </select>
                  </Field>

                  <Field label="Specific Section (Optional)">
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className={inputBase}
                    >
                      <option value="">All Department Sections</option>
                      {sections
                        .filter((s) => s.departmentId === selectedDeptId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            Year {s.academicYear} — Section {s.name}
                          </option>
                        ))}
                    </select>
                  </Field>

                  <Field label="Title / Header">
                    <input
                      type="text"
                      placeholder="e.g. Midterm Lab Practical Schedule"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={inputBase}
                      required
                    />
                  </Field>

                  <Field label="Detailed Content / Instructions">
                    <textarea
                      rows={4}
                      placeholder="Write syllabus updates, assignment requirements, or event agenda…"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={textareaBase}
                      required
                    />
                  </Field>

                  {postType === "ANNOUNCEMENT" ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Attachment Document URL (Optional)">
                          <input
                            type="url"
                            placeholder="https://…/syllabus.pdf"
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            className={inputBase}
                          />
                        </Field>
                        <Field label="Attachment Display Name">
                          <input
                            type="text"
                            placeholder="e.g. Lab_Manual_v2.pdf"
                            value={attachmentName}
                            onChange={(e) => setAttachmentName(e.target.value)}
                            className={inputBase}
                          />
                        </Field>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={urgent}
                          onChange={(e) => setUrgent(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-surface text-brand"
                        />
                        <span className="text-xs font-bold text-red-400">Mark as High Priority / Urgent Notice</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <Field label="Location / Room">
                        <input
                          type="text"
                          placeholder="e.g. Lab 402, Block B"
                          value={eventLocation}
                          onChange={(e) => setEventLocation(e.target.value)}
                          className={inputBase}
                          required
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Start Time">
                          <input
                            type="datetime-local"
                            value={eventStart}
                            onChange={(e) => setEventStart(e.target.value)}
                            className={inputBase}
                            required
                          />
                        </Field>
                        <Field label="End Time">
                          <input
                            type="datetime-local"
                            value={eventEnd}
                            onChange={(e) => setEventEnd(e.target.value)}
                            className={inputBase}
                            required
                          />
                        </Field>
                      </div>
                    </>
                  )}

                  {composerMsg && (
                    <p className="rounded-xl border border-white/10 bg-surface-2/80 p-3 text-xs font-bold">
                      {composerMsg}
                    </p>
                  )}

                  <Button type="submit" variant="primary" disabled={composerBusy} className="w-full">
                    {composerBusy ? "Broadcasting…" : "Broadcast Notice →"}
                  </Button>
                </form>
              </Spotlight>
            </div>

            {/* My Sent Posts Manager */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 shadow-lift">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-white">Your Broadcasted Posts</h2>
                  <span className="text-xs font-bold text-muted">{myAnns.length + myEvts.length} Sent</span>
                </div>

                {myAnns.length === 0 && myEvts.length === 0 ? (
                  <Empty label="broadcasted notices" />
                ) : (
                  <div className="space-y-4">
                    {myAnns.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-white/10 bg-surface-2/70 p-4 transition-all hover:border-white/20"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white">{a.title}</span>
                            {a.urgent && (
                              <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-[9px] font-extrabold text-red-400">
                                URGENT
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => void handleDeletePost(a.id, "announcement")}
                            className="text-xs font-bold text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-muted line-clamp-2">{a.content}</p>
                        {safeUrl(a.attachmentUrl) && (
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-brand-light">
                            <span>📎</span>
                            <a href={safeUrl(a.attachmentUrl)} target="_blank" rel="noreferrer" className="hover:underline truncate">
                              {a.attachmentName || a.attachmentUrl}
                            </a>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                          <span>Target: {a.targetType}</span>
                          <span>·</span>
                          <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}

                    {myEvts.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-2xl border border-white/10 bg-surface-2/70 p-4 transition-all hover:border-white/20"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white">📅 {e.title}</span>
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[9px] font-extrabold text-brand-light">
                              EVENT
                            </span>
                          </div>
                          <button
                            onClick={() => void handleDeletePost(e.id, "event")}
                            className="text-xs font-bold text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-muted line-clamp-2">{e.description}</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                          <span>⌖ {e.location}</span>
                          <span>·</span>
                          <span>{new Date(e.startAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!error && tab === "inbox" && (
          <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Student Inquiries Desk</h2>
                <p className="text-xs text-muted">Inquiries sent directly to you from students in your department.</p>
              </div>
              <span className="rounded-xl border border-brand/30 bg-brand-50 px-3.5 py-1.5 text-xs font-extrabold text-brand-light">
                {studentQueries.filter((q) => q.status === "OPEN").length} Queries Awaiting Answer
              </span>
            </div>

            {studentQueries.length === 0 ? (
              <Empty label="student inquiries" />
            ) : (
              <div className="space-y-4">
                {studentQueries.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-white/10 bg-surface-2/80 p-5 transition-all hover:border-white/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-extrabold text-white">{q.subject || "Student Inquiry"}</span>
                        <p className="text-xs text-muted">
                          From: <strong className="text-ink">{q.name || q.email}</strong> ({q.department})
                        </p>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>

                    <div className="my-3 rounded-xl border border-white/[0.06] bg-surface/60 p-4 text-xs leading-relaxed text-ink">
                      {q.message || q.question}
                    </div>

                    {q.adminResponse ? (
                      <div className="rounded-xl border border-teal-500/30 bg-teal-soft/60 p-3.5 text-xs">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-teal-light">
                          Your Answer:
                        </span>
                        <p className="mt-1 text-ink">{q.adminResponse}</p>
                      </div>
                    ) : (
                      <div>
                        {replyingQueryId === q.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              rows={3}
                              placeholder="Write your explanation or response to the student…"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className={textareaBase}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                disabled={replyBusy}
                                onClick={() => void handleAnswerQuery(q.id)}
                              >
                                {replyBusy ? "Sending…" : "Submit Answer"}
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setReplyingQueryId(null);
                                  setReplyText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            className="!px-4 !py-1.5 !text-xs"
                            onClick={() => {
                              setReplyingQueryId(q.id);
                              setReplyText("");
                            }}
                          >
                            ✍ Respond to Student
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!error && tab === "askAdmin" && (
          <div className="max-w-2xl mx-auto">
            <Spotlight tone="brand" className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
              <h2 className="text-2xl font-extrabold text-white">Contact Department Administration</h2>
              <p className="mt-1 text-xs text-muted">
                Submit academic requests, lab requirements, or administrative inquiries to your Home Department Admin.
              </p>

              <form onSubmit={handleAskAdmin} className="mt-6 space-y-4">
                <Field label="Topic / Subject">
                  <input
                    type="text"
                    placeholder="e.g. Lab equipment requisition, Timetable adjustment"
                    value={adminSubject}
                    onChange={(e) => setAdminSubject(e.target.value)}
                    className={inputBase}
                    required
                  />
                </Field>

                <Field label="Inquiry / Message">
                  <textarea
                    rows={5}
                    placeholder="Describe your request or submission to department leadership…"
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    className={textareaBase}
                    required
                  />
                </Field>

                {adminMsg && (
                  <p className="rounded-xl border border-white/10 bg-surface-2/80 p-3 text-xs font-bold">
                    {adminMsg}
                  </p>
                )}

                <Button type="submit" variant="primary" disabled={adminBusy} className="w-full">
                  {adminBusy ? "Sending…" : "Send Upward Request →"}
                </Button>
              </form>
            </Spotlight>
          </div>
        )}
      </main>
    </div>
  );
}
