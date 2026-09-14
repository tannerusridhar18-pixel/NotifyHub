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
      setMessage("If an account exists for this email, the reset instructions have been sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to request a reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-70px)] place-items-center bg-bg px-5 py-12 sm:min-h-[calc(100vh-78px)]">
      <AuthCard>
        <form onSubmit={submit}>
          <span className="text-[11px] font-bold text-brand">Account recovery</span>
          <h2 className="my-2 text-3xl">Reset access.</h2>
          <p className="mb-5 text-sm text-muted">Enter your registered campus email. We will never reveal whether an account exists.</p>
          <Field label="Email" htmlFor="email">
            <input required id="email" type="email" className={inputBase} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <div className={`${errorBox} mt-4`}>{error}</div>}
          {message && <div className={`${successBox} mt-4`}>{message}</div>}
          <Button className="mt-5 w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset instructions"}
          </Button>
          <p className="mt-5 text-center text-sm text-muted">
            <Link className="font-bold text-brand" href="/auth/login">
              Back to sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
