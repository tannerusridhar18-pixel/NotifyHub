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

export default function AdminLogin() {
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
      if (x.role !== "ADMIN") throw new Error("Access denied. Administrator privileges required.");
      router.push("/admin/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      tone="admin"
      kicker="Control Room Operations"
      title={
        <>
          Run the campus
          <br />
          <em className="not-italic text-[#6ee7b7]">signal.</em>
        </>
      }
      description="Publish trusted broadcasts, manage academic calendars, review campus queries, and manage directory structures from one protected workspace."
      metrics={[
        { value: "ADMIN", label: "Privileged Access" },
        { value: "ACTIVE", label: "Campus Signal" },
      ]}
    >
      <AuthCard>
        <form onSubmit={submit}>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest text-success uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Restricted Control Room
          </span>
          <h2 className="my-2 text-3xl font-extrabold tracking-tight">Admin Portal</h2>
          <p className="mb-6 text-sm text-muted">Sign in with authorized administrator credentials.</p>
          <div className="grid gap-4">
            <Field label="Admin Email" htmlFor="email">
              <input
                id="email"
                required
                type="email"
                className={inputBase}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@notifyhub.local"
                suppressHydrationWarning
              />
            </Field>
            <Field label="Security Key / Password" htmlFor="password">
              <input
                id="password"
                required
                type="password"
                className={inputBase}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </Field>
          </div>
          {error && <div className={`${errorBox} mt-5`}>{error}</div>}
          <Button className="mt-6 w-full !py-3 !text-sm" disabled={busy}>
            {busy ? "Validating Session…" : "Enter Control Room →"}
          </Button>
          <p className="mt-6 text-center text-xs text-muted">
            Student or faculty member?{" "}
            <Link className="font-bold text-brand hover:underline" href="/auth/login">
              Sign in via User Portal
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthSplit>
  );
}

