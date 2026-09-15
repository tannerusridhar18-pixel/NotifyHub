"use client";
import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";
import AuthCard from "@/components/ui/AuthCard";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { inputBase, errorBox, successBox } from "@/components/ui/classes";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await forgotPassword(email);
      setMessage("If an account exists for this email, password recovery instructions have been dispatched.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to request a reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-[calc(100vh-72px)] place-items-center bg-bg px-5 py-12 sm:min-h-[calc(100vh-80px)]">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />
      <AuthCard>
        <form onSubmit={submit}>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest text-brand uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Security Verification
          </span>
          <h2 className="my-2 text-3xl font-extrabold tracking-tight">Reset Access</h2>
          <p className="mb-5 text-sm text-muted">
            Enter your registered campus email to receive secure recovery instructions.
          </p>
          <Field label="Registered Campus Email" htmlFor="email">
            <input
              required
              id="email"
              type="email"
              className={inputBase}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@campus.edu"
            />
          </Field>
          {error && <div className={`${errorBox} mt-5`}>{error}</div>}
          {message && <div className={`${successBox} mt-5`}>{message}</div>}
          <Button className="mt-6 w-full !py-3 !text-sm" disabled={busy}>
            {busy ? "Dispatching Instructions…" : "Send Recovery Instructions →"}
          </Button>
          <p className="mt-6 text-center text-xs text-muted">
            Remembered your credentials?{" "}
            <Link className="font-bold text-brand hover:underline" href="/auth/login">
              Back to sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}

