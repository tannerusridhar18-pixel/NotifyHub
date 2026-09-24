"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  announcements,
  createAnnouncement,
  campusOverview,
  logout,
  type CurrentUser,
} from "@/lib/api";
import type { Announcement, CampusOverviewDepartment } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import { Empty, ErrorState, Loading } from "@/components/States";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import { inputBase, textareaBase } from "@/components/ui/classes";

export default function PrincipalDashboardView({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "broadcast" | "feed">("overview");
  const [departments, setDepartments] = useState<CampusOverviewDepartment[]>([]);
  const [allNotices, setAllNotices] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Broadcaster state
  const [broadcastAudience, setBroadcastAudience] = useState<"GLOBAL" | "HOD" | "DEAN" | "FACULTY" | "STUDENT">("GLOBAL");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, an] = await Promise.all([
        campusOverview().catch(() => []),
        announcements({ size: 30 }),
      ]);
      setDepartments(ov || []);
      setAllNotices(an.content || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Principal command center.");
    } finally {
      setLoading(false);
    }
  }, []);

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
        title,
        content,
        urgent,
        targetType: broadcastAudience === "GLOBAL" ? "GLOBAL" : "ROLE",
        role: broadcastAudience === "GLOBAL" ? undefined : broadcastAudience,
        attachmentUrl: attachmentUrl.trim() || undefined,
        attachmentName: attachmentName.trim() || undefined,
      });
      setBroadcastMsg("✓ Institutional circular issued successfully!");
      setTitle("");
      setContent("");
      setAttachmentUrl("");
      setAttachmentName("");
      await loadData();
    } catch (err) {
      setBroadcastMsg(`⚠ ${err instanceof Error ? err.message : "Failed to issue directive."}`);
    } finally {
      setBroadcastBusy(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  if (loading) {
    return <Loading label="Loading Principal Institutional Console…" />;
  }

  const totalCampusStudents = departments.reduce((acc, d) => acc + (d.totalStudents || 0), 0);
  const totalCampusFaculty = departments.reduce((acc, d) => acc + (d.totalFaculty || 0), 0);
  const totalOpenQueries = departments.reduce((acc, d) => acc + (d.openQueries || 0), 0);

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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-[10px] font-extrabold uppercase text-amber-400 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            PRINCIPAL EXECUTIVE
          </span>
          <span>Chief Administrative Officer · {user.email}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard/my-posts" className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-all">My Posts</Link>
          <Link
            href="/dashboard/feed?from=principal"
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                Institutional Executive Leadership (Level 1)
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                Principal Office & Campus Command
              </h1>
              <p className="mt-1 text-sm text-muted">
                Institution-wide broadcast authority, academic department health matrices, and administrative governance.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Departments</span>
                <span className="text-2xl font-extrabold text-white">{departments.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Total Students</span>
                <span className="text-2xl font-extrabold text-teal-light">{totalCampusStudents}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Total Faculty</span>
                <span className="text-2xl font-extrabold text-brand-light">{totalCampusFaculty}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-white/[0.08] pt-6 overflow-x-auto">
            <button
              onClick={() => setTab("overview")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "overview"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              🏛️ Campus Department Overview
            </button>
            <button
              onClick={() => setTab("broadcast")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "broadcast"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📢 Multi-Audience Campus Broadcaster
            </button>
            <button
              onClick={() => setTab("feed")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "feed"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📜 Institutional Oversight Feed ({allNotices.length})
            </button>
          </div>
        </section>

        {error && <ErrorState message={error} onRetry={() => void loadData()} />}

        {!error && tab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Academic Departments Directory</h2>
                  <p className="text-xs text-muted">Overview of department leadership, enrollments, and operational pulse.</p>
                </div>
              </div>

              {departments.length === 0 ? (
                <Empty label="No departments registered." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-muted uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Head of Dept (HOD)</th>
                        <th className="py-3 px-4">HOD Contact</th>
                        <th className="py-3 px-4 text-center">Enrolled Students</th>
                        <th className="py-3 px-4 text-center">Faculty Staff</th>
                        <th className="py-3 px-4 text-center">Open Inquiries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {departments.map((d) => (
                        <tr key={d.departmentId} className="hover:bg-surface-2/50 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-white">{d.departmentName}</td>
                          <td className="py-3 px-4 font-bold text-ink">{d.hodName || "— Not Appointed —"}</td>
                          <td className="py-3 px-4 text-muted">{d.hodEmail || "—"}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-teal-light">{d.totalStudents}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-brand-light">{d.totalFaculty}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-bold text-amber-400">
                              {d.openQueries}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!error && tab === "broadcast" && (
          <div className="max-w-2xl mx-auto">
            <Spotlight tone="brand" className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
              <h2 className="text-2xl font-extrabold text-white">Issue Institutional Directive</h2>
              <p className="mt-1 text-xs text-muted">
                Broadcast executive orders, campus-wide circulars, or targeted communications to HODs and Deans.
              </p>

              <form onSubmit={handleBroadcast} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Target Institutional Audience
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {(
                      [
                        { key: "GLOBAL", label: "🌐 All Campus" },
                        { key: "HOD", label: "👑 HODs Only" },
                        { key: "DEAN", label: "🏛️ Deans Only" },
                        { key: "FACULTY", label: "👨‍🏫 Faculty" },
                        { key: "STUDENT", label: "🎓 Students" },
                      ] as const
                    ).map((aud) => (
                      <button
                        key={aud.key}
                        type="button"
                        onClick={() => setBroadcastAudience(aud.key)}
                        className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all text-center ${
                          broadcastAudience === aud.key
                            ? "border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm"
                            : "border-white/10 bg-surface-2/60 text-muted"
                        }`}
                      >
                        {aud.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Directive Title / Subject">
                  <input
                    type="text"
                    placeholder="e.g. Executive Circular: Annual Inspection & Academic Audit Guidelines"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputBase}
                    required
                  />
                </Field>

                <Field label="Full Directive Content">
                  <textarea
                    rows={6}
                    placeholder="Enter the official communication text and instructions…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={textareaBase}
                    required
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Attachment Document URL (Optional)">
                    <input
                      type="url"
                      placeholder="https://…/principal_circular.pdf"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      className={inputBase}
                    />
                  </Field>
                  <Field label="Attachment Display Name">
                    <input
                      type="text"
                      placeholder="e.g. Audit_Guidelines_2026.pdf"
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
                  <span className="text-xs font-bold text-red-400">Mark as Mandatory / Urgent Priority Notice</span>
                </label>

                {broadcastMsg && (
                  <p className="rounded-xl border border-white/10 bg-surface-2/80 p-3 text-xs font-bold">
                    {broadcastMsg}
                  </p>
                )}

                <Button type="submit" variant="primary" disabled={broadcastBusy} className="w-full">
                  {broadcastBusy ? "Issuing Directive…" : "Issue Institutional Directive →"}
                </Button>
              </form>
            </Spotlight>
          </div>
        )}

        {!error && tab === "feed" && (
          <div className="space-y-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Campus Institutional Oversight Feed</h2>
                <p className="text-xs text-muted">All active notices across all branches and scopes.</p>
              </div>
            </div>
            {allNotices.length === 0 ? (
              <Empty label="No notices in the institution feed." />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {allNotices.map((n) => (
                  <AnnouncementCard key={n.id} item={n} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
