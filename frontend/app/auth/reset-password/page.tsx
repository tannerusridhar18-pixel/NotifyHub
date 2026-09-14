"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api";
import AuthCard from "@/components/ui/AuthCard";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { inputBase, errorBox, successBox } from "@/components/ui/classes";

export default function ResetPassword() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the browser-only reset token after hydration
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("This reset link is missing its token. Open the link from your NotifyHub email.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await resetPassword(token, form.password, form.confirm);
      setSuccess("Password reset successfully. Redirecting to sign in…");
      setTimeout(() => router.push("/auth/login"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-70px)] place-items-center bg-bg px-5 py-12 sm:min-h-[calc(100vh-78px)]">
      <AuthCard>
        <form onSubmit={submit}>
          <span className="text-[11px] font-bold text-brand">Secure recovery</span>
          <h2 className="my-2 text-3xl">Choose a new password.</h2>
          <p className="mb-5 text-sm text-muted">Use the secure link from your NotifyHub recovery email. The token stays hidden from the form.</p>
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-surface-2 p-3.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-success-soft font-extrabold text-[#8ff0c8]">✓</span>
            <div>
              <b className="block text-sm">Secure password recovery</b>
              <small className="block text-xs text-muted">The recovery token will be checked when you submit the new password.</small>
            </div>
          </div>
          <div className="grid gap-4">
            <Field label="New password" htmlFor="password">
              <input
                required
                minLength={8}
                id="password"
                type="password"
                autoComplete="new-password"
                className={inputBase}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Confirm password" htmlFor="confirm">
              <input
                required
                minLength={8}
                id="confirm"
                type="password"
                autoComplete="new-password"
                className={inputBase}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </Field>
          </div>
          {error && <div className={`${errorBox} mt-4`}>{error}</div>}
          {success && <div className={`${successBox} mt-4`}>{success}</div>}
          <Button className="mt-5 w-full" disabled={busy || !token}>
            {busy ? "Updating…" : "Reset password"}
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
