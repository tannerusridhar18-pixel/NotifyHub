"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { currentUser, myQueries, submitQuery, type CurrentUser } from "@/lib/api";
import type { CampusQuery } from "@/types";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { inputBase, textareaBase, errorBox, successBox, cardStatic } from "@/components/ui/classes";
import Spotlight from "@/components/ui/Spotlight";
import Reveal from "@/components/ui/Reveal";
import { StatusBadge, SoftBadge } from "@/components/ui/Badge";

const KEY = "notifyhub.ask.form.v1";
const initial = { name: "", email: "", department: "", subject: "", message: "" };

export default function AskPage() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [queries, setQueries] = useState<CampusQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Restore saved session form on client after mount to prevent hydration mismatch
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        setForm((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {}
  }, []);

  const loadQueries = useCallback(async () => {
    try {
      setLoadingQueries(true);
      const res = await myQueries();
      setQueries(res.content || []);
    } catch {
      // User might be unauthenticated or error loading queries
    } finally {
      setLoadingQueries(false);
    }
  }, []);

  // Fetch current user and their queries
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await currentUser();
        if (active && u) {
          setUser(u);
          setForm((prev) => ({
            ...prev,
            name: prev.name || u.student?.name || u.faculty?.name || "",
            email: prev.email || u.email || "",
          }));
          loadQueries();
        }
      } catch {
        // Not logged in
      }
    })();
    return () => {
      active = false;
    };
  }, [loadQueries]);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const change = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    setError("");
    try {
      await submitQuery(form);
      setStatus("Your inquiry has been submitted. The campus administration team will respond shortly.");
      setForm((prev) => ({
        ...initial,
        name: user ? user.student?.name || user.faculty?.name || user.email : "",
        email: user ? user.email : "",
      }));
      sessionStorage.removeItem(KEY);
      if (user) {
        await loadQueries();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit query. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualRefresh() {
    setRefreshing(true);
    await loadQueries();
    setRefreshing(false);
  }

  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:py-20 sm:px-6">
      <Reveal className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="max-w-[680px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-50/90 px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-brand-light uppercase shadow-[0_0_16px_rgba(99,102,241,0.25)] backdrop-blur-xl">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-light" />
            </span>
            Direct Campus Channel
          </span>
          <h1 className="my-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">Ask Campus Inquiries</h1>
          <p className="text-base sm:text-lg leading-relaxed text-muted/95">
            Direct, confidential communication channel to campus administration, department chairs, and faculty staff.
          </p>
        </div>
        <div className="hidden h-[160px] w-[160px] flex-none place-items-center rounded-3xl border border-white/12 bg-gradient-to-br from-brand-50/95 via-surface-2/95 to-ink-900/95 shadow-lift backdrop-blur-2xl sm:grid animate-float transition-all duration-500 hover:scale-105 hover:border-brand-light/50 hover:shadow-glow">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white font-extrabold shadow-glow text-2xl">
            ◈
          </span>
        </div>
      </Reveal>

      <div className="grid gap-12 lg:grid-cols-12">
        {/* Submit Form Column */}
        <div className="lg:col-span-6 xl:col-span-7">
          <Reveal delay={120}>
            <Spotlight tone="brand" className="rounded-[26px] border border-white/12 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-7 sm:p-9 shadow-lift backdrop-blur-2xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">Submit an Inquiry</h2>
                <p className="mt-1 text-xs text-muted">Submit your question directly to administration and faculty coordinators.</p>
              </div>

              <form onSubmit={send}>
                <div className="grid gap-5 sm:grid-cols-2">
                  {(["name", "email", "department", "subject"] as const).map((k) => (
                    <Field
                      key={k}
                      label={k === "email" ? "Campus Email" : k === "department" ? "Target Department" : k[0].toUpperCase() + k.slice(1)}
                      htmlFor={k}
                      className={k === "subject" ? "sm:col-span-2" : ""}
                    >
                      <input
                        required
                        className={inputBase}
                        id={k}
                        type={k === "email" ? "email" : "text"}
                        value={form[k]}
                        onChange={(e) => change(k, e.target.value)}
                        placeholder={
                          k === "subject"
                            ? "Brief summary of your inquiry"
                            : k === "department"
                            ? "e.g. Computer Science, Academic Affairs"
                            : ""
                        }
                      />
                    </Field>
                  ))}
                </div>

                <Field label="Inquiry Message" htmlFor="message" className="mt-5">
                  <textarea
                    required
                    className={textareaBase}
                    id="message"
                    value={form.message}
                    onChange={(e) => change("message", e.target.value)}
                    placeholder="Provide detailed information regarding your question or request…"
                  />
                </Field>

                {error && <div className={`${errorBox} mt-5`}>{error}</div>}
                {status && <div className={`${successBox} mt-5`}>{status}</div>}

                <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <Button disabled={busy} className="w-full sm:w-auto !px-8 !py-3.5 !text-sm">
                    {busy ? "Transmitting Signal…" : "Submit Campus Query →"}
                  </Button>
                  <p className="text-xs font-medium text-muted/80 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Session draft preserved automatically
                  </p>
                </div>
              </form>
            </Spotlight>
          </Reveal>
        </div>

        {/* Answers & Responses Column */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col">
          <Reveal delay={200} className="flex-1">
            <div className="flex flex-col h-full rounded-[26px] border border-white/12 bg-surface/90 p-7 sm:p-9 shadow-lift backdrop-blur-2xl">
              <div className="flex items-center justify-between pb-5 border-b border-border/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Your Responses</h2>
                    {user && (
                      <span className="inline-flex items-center rounded-full bg-brand-50/90 border border-brand/40 px-2 py-0.5 text-[11px] font-bold text-brand-light">
                        {queries.length}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">View official answers to your submitted questions.</p>
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={refreshing || loadingQueries}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted hover:border-brand-light/50 hover:text-white transition-all disabled:opacity-50"
                    title="Refresh answers"
                  >
                    <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>↻</span>
                    <span>{refreshing ? "Checking…" : "Refresh"}</span>
                  </button>
                )}
              </div>

              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-2xl border border-white/10 mb-4">
                    🔒
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Track Inquiries Live</h3>
                  <p className="text-xs text-muted max-w-[280px] mb-5">
                    Sign in to your student or faculty account to view responses to your queries in real time.
                  </p>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-light px-5 py-2.5 text-xs font-extrabold text-white shadow-lift transition hover:opacity-90"
                  >
                    Sign in to View Answers →
                  </Link>
                </div>
              ) : loadingQueries && queries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-3" />
                  <p className="text-xs">Loading your inquiry history…</p>
                </div>
              ) : queries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-xl border border-white/10 mb-3 text-muted">
                    ✉
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">No Inquiries Yet</h3>
                  <p className="text-xs text-muted max-w-[280px]">
                    Questions you submit with your registered email ({user.email}) will appear here along with official administration answers.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4 max-h-[620px] overflow-y-auto pr-1">
                  {queries.map((q) => {
                    const isAnswered = q.status === "ANSWERED";
                    return (
                      <div
                        key={q.id}
                        className={`${cardStatic} border-white/10 bg-surface-2/70 p-5 transition-all hover:border-white/20`}
                      >
                        <div className="flex items-start justify-between gap-2.5 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <SoftBadge tone="brand">{q.department}</SoftBadge>
                              <span className="text-[10px] text-muted font-medium">
                                {new Date(q.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-white leading-snug">{q.subject}</h4>
                          </div>
                          <StatusBadge status={isAnswered ? "ANSWERED" : "PENDING"} />
                        </div>

                        <p className="text-xs text-muted leading-relaxed mb-3 bg-surface/50 p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                          {q.message}
                        </p>

                        {isAnswered && q.adminResponse ? (
                          <div className="mt-3 rounded-xl border border-success/35 bg-success-soft/30 p-3.5 backdrop-blur-md">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#6ee7b7] uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                Official Response
                              </span>
                              {q.answeredAt && (
                                <span className="text-[9px] text-[#6ee7b7]/70 font-medium">
                                  {new Date(q.answeredAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink/95 leading-relaxed whitespace-pre-wrap font-medium">
                              {q.adminResponse}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl border border-amber-500/25 bg-warning-soft/20 p-3 flex items-center gap-2.5 text-xs text-amber-200">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse flex-none" />
                            <span>Inquiry under review by campus administrators. Reply will appear here.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}



