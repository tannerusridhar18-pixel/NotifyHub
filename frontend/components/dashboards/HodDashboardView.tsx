"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  announcements,
  createAnnouncement,
  departmentAnalytics,
  departmentStudents,
  structureSections,
  reassignStudentSection,
  logout,
  type CurrentUser,
  type StructureSection,
} from "@/lib/api";
import type { Announcement, DepartmentAnalytics } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import { Empty, ErrorState, Loading } from "@/components/States";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import { inputBase, textareaBase } from "@/components/ui/classes";

export default function HodDashboardView({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<"analytics" | "directives" | "broadcast" | "roster">("analytics");
  const [analytics, setAnalytics] = useState<DepartmentAnalytics | null>(null);
  const [directives, setDirectives] = useState<Announcement[]>([]);
  const [students, setStudents] = useState<Array<{ id: number; studentId: string; name: string; email: string; year: number; semester: number; branchId: number; branchName: string; sectionId: number; sectionName: string }>>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastUrgent, setBroadcastUrgent] = useState(false);
  const [broadcastAttachmentUrl, setBroadcastAttachmentUrl] = useState("");
  const [broadcastAttachmentName, setBroadcastAttachmentName] = useState("");
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");

  // Reassign section state
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string; sectionId: number; year: number } | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [reassignBusy, setReassignBusy] = useState(false);

  const deptId = user.departmentId || user.student?.departmentId || user.faculty?.departmentId || 1;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [an, d, st, sc] = await Promise.all([
        departmentAnalytics(deptId).catch(() => null),
        announcements({ size: 20 }),
        departmentStudents(deptId).catch(() => []),
        structureSections().catch(() => []),
      ]);
      setAnalytics(an);
      setDirectives(d.content || []);
      setStudents(st || []);
      setSections(sc || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HOD workspace.");
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void loadData();
  }, [loadData]);

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setBroadcastBusy(true);
    setBroadcastMsg("");
    try {
      await createAnnouncement({
        title: broadcastTitle,
        content: broadcastContent,
        urgent: broadcastUrgent,
        targetType: "DEPARTMENT",
        departmentId: deptId,
        attachmentUrl: broadcastAttachmentUrl.trim() || undefined,
        attachmentName: broadcastAttachmentName.trim() || undefined,
      });
      setBroadcastMsg("✓ Department announcement published successfully!");
      setBroadcastTitle("");
      setBroadcastContent("");
      setBroadcastAttachmentUrl("");
      setBroadcastAttachmentName("");
      await loadData();
    } catch (err) {
      setBroadcastMsg(`⚠ ${err instanceof Error ? err.message : "Failed to publish notice."}`);
    } finally {
      setBroadcastBusy(false);
    }
  }

  async function handleReassignSection() {
    if (!selectedStudent || !targetSectionId) return;
    setReassignBusy(true);
    try {
      await reassignStudentSection(deptId, selectedStudent.id, Number(targetSectionId));
      setSelectedStudent(null);
      setTargetSectionId("");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not reassign section.");
    } finally {
      setReassignBusy(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  if (loading) {
    return <Loading label="Loading Head of Department Command Center…" />;
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-0.5 text-[10px] font-extrabold uppercase text-purple-400 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            HOD EXECUTIVE
          </span>
          <span>{user.department ? `${user.department} Department` : user.email}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard/my-posts" className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all">My Posts</Link>
          <Link
            href="/dashboard/feed?from=hod"
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all"
          >
            Campus Feed
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-2/30 bg-brand-50 px-3 py-1 text-[10px] font-extrabold tracking-widest text-brand-2-light uppercase">
                Department Leadership (Level 3)
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                {user.department ? `${user.department} Department` : "Department"} Command Center
              </h1>
              <p className="mt-1 text-sm text-muted">
                Executive governance, academic oversight, student roster management, and institutional directives.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Enrolled Students</span>
                <span className="text-2xl font-extrabold text-white">{analytics?.totalStudents ?? students.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Faculty Staff</span>
                <span className="text-2xl font-extrabold text-brand-light">{analytics?.totalFaculty ?? "—"}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Open Inquiries</span>
                <span className="text-2xl font-extrabold text-amber-400">{analytics?.openQueries ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-white/[0.08] pt-6 overflow-x-auto">
            <button
              onClick={() => setTab("analytics")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "analytics"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📊 Department Analytics & Overview
            </button>
            <button
              onClick={() => setTab("directives")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "directives"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📜 Executive Directives ({directives.length})
            </button>
            <button
              onClick={() => setTab("broadcast")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "broadcast"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📢 Department Notice Publisher
            </button>
            <button
              onClick={() => setTab("roster")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "roster"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              👥 Student Roster & Sections ({students.length})
            </button>
          </div>
        </section>

        {error && <ErrorState message={error} onRetry={() => void loadData()} />}

        {!error && tab === "analytics" && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-surface/90 p-6 shadow-lift">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Total Students</span>
                <p className="mt-2 text-4xl font-extrabold text-white">{analytics?.totalStudents ?? 0}</p>
                <span className="mt-2 block text-xs text-muted">Across all branches & batches</span>
              </div>
              <div className="rounded-3xl border border-white/10 bg-surface/90 p-6 shadow-lift">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Faculty Staff</span>
                <p className="mt-2 text-4xl font-extrabold text-brand-light">{analytics?.totalFaculty ?? 0}</p>
                <span className="mt-2 block text-xs text-muted">HOME & Cross-Department mappings</span>
              </div>
              <div className="rounded-3xl border border-white/10 bg-surface/90 p-6 shadow-lift">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Active Announcements</span>
                <p className="mt-2 text-4xl font-extrabold text-teal-light">{analytics?.activeAnnouncements ?? 0}</p>
                <span className="mt-2 block text-xs text-muted">Live department bulletins</span>
              </div>
              <div className="rounded-3xl border border-white/10 bg-surface/90 p-6 shadow-lift">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Inquiries Desk</span>
                <p className="mt-2 text-4xl font-extrabold text-amber-400">{analytics?.openQueries ?? 0}</p>
                <span className="mt-2 block text-xs text-muted">Pending student & staff resolutions</span>
              </div>
            </div>
          </div>
        )}

        {!error && tab === "directives" && (
          <div className="space-y-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Institutional Directives</h2>
                <p className="text-xs text-muted">Official communications and executive notices from Principal & Dean offices.</p>
              </div>
            </div>
            {directives.length === 0 ? (
              <Empty label="No executive directives received." />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {directives.map((d) => (
                  <AnnouncementCard key={d.id} item={d} />
                ))}
              </div>
            )}
          </div>
        )}

        {!error && tab === "broadcast" && (
          <div className="max-w-2xl mx-auto">
            <Spotlight tone="brand" className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
              <h2 className="text-2xl font-extrabold text-white">Publish Department Notice</h2>
              <p className="mt-1 text-xs text-muted">
                Broadcast official circulars, exam guidelines, or holiday notifications to all students & faculty in {user.department || "the department"}.
              </p>

              <form onSubmit={handleBroadcast} className="mt-6 space-y-4">
                <Field label="Circular / Notice Title">
                  <input
                    type="text"
                    placeholder="e.g. Department Academic Calendar & Project Review Schedule"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className={inputBase}
                    required
                  />
                </Field>

                <Field label="Content / Notice Body">
                  <textarea
                    rows={6}
                    placeholder="Enter the full official directive text…"
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    className={textareaBase}
                    required
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Attachment URL (PDF / Document)">
                    <input
                      type="url"
                      placeholder="https://…/academic_circular.pdf"
                      value={broadcastAttachmentUrl}
                      onChange={(e) => setBroadcastAttachmentUrl(e.target.value)}
                      className={inputBase}
                    />
                  </Field>
                  <Field label="Attachment Label">
                    <input
                      type="text"
                      placeholder="e.g. Schedule_2026.pdf"
                      value={broadcastAttachmentName}
                      onChange={(e) => setBroadcastAttachmentName(e.target.value)}
                      className={inputBase}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={broadcastUrgent}
                    onChange={(e) => setBroadcastUrgent(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-surface text-brand"
                  />
                  <span className="text-xs font-bold text-red-400">Mark as Urgent Circular</span>
                </label>

                {broadcastMsg && (
                  <p className="rounded-xl border border-white/10 bg-surface-2/80 p-3 text-xs font-bold">
                    {broadcastMsg}
                  </p>
                )}

                <Button type="submit" variant="primary" disabled={broadcastBusy} className="w-full">
                  {broadcastBusy ? "Publishing Circular…" : "Publish Circular to Department →"}
                </Button>
              </form>
            </Spotlight>
          </div>
        )}

        {!error && tab === "roster" && (
          <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Department Student Roster</h2>
                <p className="text-xs text-muted">View student cohorts and reassign section allocations.</p>
              </div>
            </div>

            {students.length === 0 ? (
              <Empty label="enrolled students" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Year / Sem</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Current Section</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">{s.studentId}</td>
                        <td className="py-3 px-4 font-bold text-ink">{s.name}</td>
                        <td className="py-3 px-4 text-muted">{s.email}</td>
                        <td className="py-3 px-4">Year {s.year} (Sem {s.semester})</td>
                        <td className="py-3 px-4">{s.branchName || "Engineering"}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded-md bg-brand-50 px-2 py-0.5 font-bold text-brand-light">
                            {s.sectionName || "Section A"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedStudent({ id: s.id, name: s.name, sectionId: s.sectionId, year: s.year });
                              setTargetSectionId(String(s.sectionId));
                            }}
                            className="rounded-lg bg-surface-2 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-muted hover:text-white hover:border-white/25"
                          >
                            Reassign Section
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reassign Section Modal */}
            {selectedStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-white/15 bg-surface p-6 shadow-2xl">
                  <h3 className="text-lg font-extrabold text-white">Reassign Section</h3>
                  <p className="mt-1 text-xs text-muted">
                    Move <strong className="text-white">{selectedStudent.name}</strong> to a different academic section.
                  </p>

                  <div className="mt-4">
                    <Field label="Target Section (Year-Compatible)">
                      <select
                        value={targetSectionId}
                        onChange={(e) => setTargetSectionId(e.target.value)}
                        className={inputBase}
                      >
                        {sections
                          .filter((sec) => sec.departmentId === deptId && sec.academicYear === selectedStudent.year)
                          .map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              Year {sec.academicYear} — Section {sec.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setSelectedStudent(null)}>
                      Cancel
                    </Button>
                    <Button variant="primary" disabled={reassignBusy} onClick={() => void handleReassignSection()}>
                      {reassignBusy ? "Reassigning…" : "Confirm Reassignment"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
