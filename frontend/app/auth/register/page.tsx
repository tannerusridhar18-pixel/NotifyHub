"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";
import AuthCard from "@/components/ui/AuthCard";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { inputBase, errorBox, successBox } from "@/components/ui/classes";

export default function Register() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the browser-only invitation token after hydration
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

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
      setSuccess("Your account is active. Redirecting to sign in…");
      setTimeout(() => router.push("/auth/login"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
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
            Invitation Onboarding
          </span>
          <h2 className="my-2 text-3xl font-extrabold tracking-tight">Complete Setup</h2>
          <p className="mb-5 text-sm text-muted">Create a secure password to activate your campus account.</p>
          
          <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-surface-2/80 p-4 backdrop-blur-md">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-success-soft font-extrabold text-[#6ee7b7] border border-success/30">
              {token ? "✓" : "!"}
            </span>
            <div>
              <b className="block text-sm font-bold text-white">{token ? "Invitation verified" : "Invitation link required"}</b>
              <small className="block text-xs text-muted">
                {token ? "Token validated. Enter password to activate." : "Open the link from your NotifyHub invitation email."}
              </small>
            </div>
          </div>

          <div className="grid gap-4">
            <Field label="New Password (min 8 chars)" htmlFor="password">
              <input
                id="password"
                required
                minLength={8}
                type="password"
                className={inputBase}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirm Password" htmlFor="confirmPassword">
              <input
                id="confirmPassword"
                required
                minLength={8}
                type="password"
                className={inputBase}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </Field>
          </div>

          {error && <div className={`${errorBox} mt-5`}>{error}</div>}
          {success && <div className={`${successBox} mt-5`}>{success}</div>}

          <Button className="mt-6 w-full !py-3 !text-sm" disabled={busy || !token}>
            {busy ? "Activating Profile…" : "Activate Campus Account →"}
          </Button>

          <p className="mt-6 text-center text-xs text-muted">
            Already active?{" "}
            <Link className="font-bold text-brand hover:underline" href="/auth/login">
              Back to sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}

