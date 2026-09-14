"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";
import AuthCard from "@/components/ui/AuthCard";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { inputBase, errorBox, successBox } from "@/components/ui/classes";

export default function Register() {
  const router = useRouter();
  const [token] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || ""));
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("This registration link is missing its invitation token. Open the link from your NotifyHub invitation email.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await registerUser({ invitationToken: token, password: form.password, confirmPassword: form.confirmPassword });
      setSuccess("Your account is active. You can now sign in.");
      setTimeout(() => router.push("/auth/login"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-70px)] place-items-center bg-bg px-5 py-12 sm:min-h-[calc(100vh-78px)]">
      <AuthCard>
        <form onSubmit={submit}>
          <span className="text-[11px] font-bold text-brand">Invitation</span>
          <h2 className="my-2 text-3xl">Finish setup.</h2>
          <p className="mb-5 text-sm text-muted">Your campus administrator invited you. Choose a password to activate your account.</p>
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-surface-2 p-3.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-success-soft font-extrabold text-[#8ff0c8]">{token ? "✓" : "!"}</span>
            <div>
              <b className="block text-sm">{token ? "Invitation link ready" : "Invitation link required"}</b>
              <small className="block text-xs text-muted">{token ? "Continue to activate your account" : "Open the link from your NotifyHub invitation email."}</small>
            </div>
          </div>
          <div className="grid gap-4">
            <Field label="Password" htmlFor="password">
              <input id="password" required minLength={8} type="password" className={inputBase} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Confirm password" htmlFor="confirmPassword">
              <input
                id="confirmPassword"
                required
                minLength={8}
                type="password"
                className={inputBase}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </Field>
          </div>
          {error && <div className={`${errorBox} mt-4`}>{error}</div>}
          {success && <div className={`${successBox} mt-4`}>{success}</div>}
          <Button className="mt-5 w-full" disabled={busy || !token}>
            {busy ? "Activating…" : "Activate account"}
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
