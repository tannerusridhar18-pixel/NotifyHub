"use client";
import { useEffect, useState } from "react";
import { submitQuery } from "@/lib/api";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { inputBase, textareaBase, errorBox, successBox } from "@/components/ui/classes";

const KEY = "notifyhub.ask.form.v1";
const initial = { name: "", email: "", department: "", subject: "", message: "" };

export default function AskPage() {
  const [form, setForm] = useState(() => {
    if (typeof window === "undefined") return initial;
    try {
      const saved = sessionStorage.getItem(KEY);
      return saved ? { ...initial, ...JSON.parse(saved) } : initial;
    } catch {
      return initial;
    }
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const change = (k: keyof typeof form, v: string) => setForm((prev: typeof form) => ({ ...prev, [k]: v }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    setError("");
    try {
      await submitQuery(form);
      setStatus("Your query was submitted. The campus team can now respond.");
      setForm(initial);
      sessionStorage.removeItem(KEY);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit query. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:py-16">
      <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <span className="text-[11px] font-bold text-brand">Open channel</span>
          <h1 className="my-3 text-4xl sm:text-5xl">Ask the campus.</h1>
          <p className="max-w-[600px] text-base leading-relaxed text-muted sm:text-lg">A focused, private channel for questions to administration or faculty.</p>
        </div>
        <div className="hidden h-[170px] w-[170px] flex-none place-items-center rounded-full border border-brand-100 bg-[radial-gradient(circle,#fff_0,var(--color-brand-50)_62%,transparent_63%)] shadow-[0_18px_50px_rgba(52,82,241,0.12)] sm:grid">
          <span className="font-display text-[11px] font-extrabold tracking-wide text-brand">ASK</span>
        </div>
      </div>
      <form className="max-w-[760px] rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8" onSubmit={send}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["name", "email", "department", "subject"] as const).map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={k} className={k === "subject" ? "sm:col-span-2" : ""}>
              <input required className={inputBase} id={k} type={k === "email" ? "email" : "text"} value={form[k]} onChange={(e) => change(k, e.target.value)} />
            </Field>
          ))}
        </div>
        <Field label="Message" htmlFor="message" className="mt-4">
          <textarea required className={textareaBase} id="message" value={form.message} onChange={(e) => change("message", e.target.value)} />
        </Field>
        {error && <div className={`${errorBox} mt-4`}>{error}</div>}
        {status && <div className={`${successBox} mt-4`}>{status}</div>}
        <Button disabled={busy} className="mt-5 w-full sm:w-auto">
          {busy ? "Sending…" : "Submit query"}
        </Button>
        <p className="mt-4 text-xs leading-relaxed text-muted">Your unfinished form is preserved if you navigate away and return with the browser Back button.</p>
      </form>
    </section>
  );
}
