"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import AuthSplit from "@/components/ui/AuthSplit";
import AuthCard from "@/components/ui/AuthCard";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { inputBase, errorBox } from "@/components/ui/classes";

export default function UserLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const x = await login(email, password);
      if (x.roleLevel === 0) {
        router.push("/admin/dashboard");
      } else if (x.roleLevel === 1) {
        router.push("/dashboard/principal");
      } else if (x.roleLevel === 2) {
        router.push("/dashboard/dean");
      } else if (x.roleLevel === 3) {
        router.push("/dashboard/hod");
      } else if (x.roleLevel === 4) {
        router.push("/dashboard/faculty");
      } else {
        router.push("/dashboard/student");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      kicker="Unified Campus Identity"
      title={
        <>
          One signal.
          <br />
          <em className="not-italic text-gradient-animated">Everyone informed.</em>
        </>
      }
      description="Access your personalized campus feed, faculty broadcasts, academic calendars, and department inquiries."
      metrics={[
        { value: "24/7", label: "Campus Signal" },
        { value: "0 ms", label: "Delay Delivery" },
        { value: "Encrypted", label: "Secure Auth" },
      ]}
      orbitLabels={["ANNOUNCEMENTS", "PRIORITY ALERTS", "CALENDAR"]}
    >
      <AuthCard>
        <form onSubmit={submit}>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest text-brand uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Portal Sign In
          </span>
          <h2 className="my-2 text-3xl font-extrabold tracking-tight">Welcome back</h2>
          <p className="mb-6 text-sm text-muted">Sign in with your registered campus credentials.</p>
          <div className="grid gap-4">
            <Field label="Campus Email" htmlFor="email">
              <input
                id="email"
                required
                type="email"
                autoComplete="email"
                className={inputBase}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campus.edu"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                required
                type="password"
                autoComplete="current-password"
                className={inputBase}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </div>
          {error && <div className={`${errorBox} mt-5`}>{error}</div>}
          <Button className="mt-6 w-full !py-3 !text-sm" disabled={busy}>
            {busy ? "Authenticating…" : "Sign in to Dashboard →"}
          </Button>
          <div className="mt-6 grid gap-2.5 text-center text-xs text-muted">
            <Link className="font-bold text-brand hover:underline" href="/auth/forgot-password">
              Forgot your password?
            </Link>
            <p>
              Have an invitation?{" "}
              <Link className="font-bold text-brand hover:underline" href="/auth/register">
                Complete account setup
              </Link>
            </p>
          </div>
        </form>
      </AuthCard>
    </AuthSplit>
  );
}
