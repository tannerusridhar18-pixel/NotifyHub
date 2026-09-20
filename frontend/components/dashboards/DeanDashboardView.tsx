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

export default function DeanDashboardView({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<"communications" | "broadcast" | "departments">("communications");
  const [directives, setDirectives] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<CampusOverviewDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Broadcaster state
  const [broadcastAudience, setBroadcastAudience] = useState<"HOD" | "FACULTY" | "STUDENT">("HOD");
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
      const [an, ov] = await Promise.all([
        announcements({ size: 20 }),
        campusOverview().catch(() => []),
      ]);
      setDirectives(an.content || []);
      setDepartments(ov || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Dean workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
        targetType: "ROLE",
        role: broadcastAudience,
        attachmentUrl: attachmentUrl.trim() || undefined,
        attachmentName: attachmentName.trim() || undefined,
      });
      setBroadcastMsg("✓ Dean circular published to targeted academic units!");
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
    return <Loading label="Loading Dean of Academic Affairs Console…" />;
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-0.5 text-[10px] font-extrabold uppercase text-cyan-400 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            DEAN OF ACADEMICS
          </span>
          <span>Executive Level 2 · {user.email}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/feed?from=dean"
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">
                Academic Affairs & Curriculum Leadership (Level 2)
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                Dean Office & Academic Operations
              </h1>
              <p className="mt-1 text-sm text-muted">
                Cross-department academic policies, curriculum directives to HODs, and faculty coordination.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Academic Units</span>
                <span className="text-2xl font-extrabold text-white">{departments.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-2/60 px-4 py-3 text-center min-w-[110px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Active Notices</span>
                <span className="text-2xl font-extrabold text-cyan-400">{directives.length}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-white/[0.08] pt-6 overflow-x-auto">
            <button
              onClick={() => setTab("communications")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "communications"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📜 Institutional Communications
            </button>
            <button
              onClick={() => setTab("broadcast")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "broadcast"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              📢 Issue Academic Directive to HODs / Faculty
            </button>
            <button
              onClick={() => setTab("departments")}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                tab === "departments"
                  ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-glow"
                  : "bg-surface-2/60 text-muted hover:text-white"
              }`}
            >
              🏛️ Academic Departments Summary
            </button>
          </div>
        </section>

        {error && <ErrorState message={error} onRetry={() => void loadData()} />}

        {!error && tab === "communications" && (
          <div className="space-y-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Executive & Campus Directives</h2>
                <p className="text-xs text-muted">Communications from Principal Office and institutional governance.</p>
              </div>
            </div>
            {directives.length === 0 ? (
              <Empty label="executive directives" />
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
              <h2 className="text-2xl font-extrabold text-white">Broadcast Academic Directive</h2>
              <p className="mt-1 text-xs text-muted">
                Issue curriculum directives, exam policies, or faculty guidelines to academic leaders.
              </p>

              <form onSubmit={handleBroadcast} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Directive Audience
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBroadcastAudience("HOD")}
                      className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                        broadcastAudience === "HOD"
                          ? "border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-sm"
                          : "border-white/10 bg-surface-2/60 text-muted"
                      }`}
                    >
                      👑 Department HODs
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastAudience("FACULTY")}
                      className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                        broadcastAudience === "FACULTY"
                          ? "border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-sm"
                          : "border-white/10 bg-surface-2/60 text-muted"
                      }`}
                    >
                      👨‍🏫 All Faculty Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastAudience("STUDENT")}
                      className={`rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                        broadcastAudience === "STUDENT"
                          ? "border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-sm"
                          : "border-white/10 bg-surface-2/60 text-muted"
                      }`}
                    >
                      🎓 All Students
                    </button>
                  </div>
                </div>

                <Field label="Directive Title / Subject">
                  <input
                    type="text"
                    placeholder="e.g. End-Semester Evaluation Guidelines & Moderation Policy"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputBase}
                    required
                  />
                </Field>

                <Field label="Directive Content">
                  <textarea
                    rows={6}
                    placeholder="Write the detailed policy or instructions…"
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
                      placeholder="https://…/academic_policy.pdf"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      className={inputBase}
                    />
                  </Field>
                  <Field label="Attachment Display Name">
                    <input
                      type="text"
                      placeholder="e.g. Evaluation_Policy_2026.pdf"
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
                  <span className="text-xs font-bold text-red-400">Mark as Mandatory Directive</span>
                </label>

                {broadcastMsg && (
                  <p className="rounded-xl border border-white/10 bg-surface-2/80 p-3 text-xs font-bold">
                    {broadcastMsg}
                  </p>
                )}

                <Button type="submit" variant="primary" disabled={broadcastBusy} className="w-full">
                  {broadcastBusy ? "Publishing Directive…" : "Publish Dean Directive →"}
                </Button>
              </form>
            </Spotlight>
          </div>
        )}

        {!error && tab === "departments" && (
          <div className="rounded-3xl border border-white/12 bg-surface/95 p-6 sm:p-8 shadow-lift">
            <h2 className="text-2xl font-extrabold text-white mb-4">Academic Units Performance</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => (
                <div key={d.departmentId} className="rounded-2xl border border-white/10 bg-surface-2/70 p-5">
                  <h3 className="text-base font-extrabold text-white">{d.departmentName}</h3>
                  <p className="mt-1 text-xs text-muted">HOD: {d.hodName || "Unassigned"}</p>
                  <div className="mt-4 flex justify-between border-t border-white/[0.06] pt-3 text-xs">
                    <span>Students: <strong className="text-teal-light">{d.totalStudents}</strong></span>
                    <span>Faculty: <strong className="text-brand-light">{d.totalFaculty}</strong></span>
                    <span>Inquiries: <strong className="text-amber-400">{d.openQueries}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
