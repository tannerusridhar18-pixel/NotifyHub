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
      if (x.role !== "ADMIN") throw new Error("Access denied.");
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
      kicker="Control room"
      title={
        <>
          Run the campus
          <br />
          <em className="not-italic text-success">signal.</em>
        </>
      }
      description="Publish trusted updates, manage events, answer questions and invite campus members from one protected workspace."
      metrics={[
        { value: "ADMIN", label: "Protected access" },
        { value: "LIVE", label: "Campus operations" },
      ]}
    >
      <AuthCard>
        <form onSubmit={submit}>
          <span className="text-[11px] font-bold text-brand">Restricted area</span>
          <h2 className="my-2 text-3xl">Admin portal</h2>
          <p className="mb-5 text-sm text-muted">Use the admin email and password configured by the NotifyHub backend.</p>
          <div className="grid gap-4">
            <Field label="Admin email" htmlFor="email">
              <input id="email" required type="email" className={inputBase} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password">
              <input id="password" required type="password" className={inputBase} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
          {error && <div className={`${errorBox} mt-4`}>{error}</div>}
          <Button className="mt-5 w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in as admin"}
          </Button>
          <p className="mt-5 text-center text-sm text-muted">
            Student or faculty?{" "}
            <Link className="font-bold text-brand" href="/auth/login">
              Sign in here
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthSplit>
  );
}
