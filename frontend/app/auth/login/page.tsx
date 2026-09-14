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
      router.push(x.role === "ADMIN" ? "/admin/dashboard" : x.role === "FACULTY" ? "/dashboard/faculty" : "/dashboard/student");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      kicker="Campus communication, simplified"
      title={
        <>
          One signal.
          <br />
          <em className="not-italic text-brand-2">Everyone informed.</em>
        </>
      }
      description="Announcements, urgent alerts, events and campus questions — organized around the people who need them."
      metrics={[
        { value: "24/7", label: "Campus signal" },
        { value: "1 place", label: "Every update" },
        { value: "Secure", label: "Identity first" },
      ]}
      orbitLabels={["ANNOUNCEMENT", "URGENT", "EVENT"]}
    >
      <AuthCard>
        <form onSubmit={submit}>
          <span className="text-[11px] font-bold text-brand">Campus identity</span>
          <h2 className="my-2 text-3xl">Welcome back.</h2>
          <p className="mb-5 text-sm text-muted">Sign in with your registered campus email and password.</p>
          <div className="grid gap-4">
            <Field label="Email" htmlFor="email">
              <input id="email" required type="email" autoComplete="email" className={inputBase} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password">
              <input id="password" required type="password" autoComplete="current-password" className={inputBase} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
          {error && <div className={`${errorBox} mt-4`}>{error}</div>}
          <Button className="mt-5 w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <div className="mt-5 grid gap-2 text-center text-sm text-muted">
            <Link className="font-bold text-brand" href="/auth/forgot-password">
              Forgot your password?
            </Link>
            <p>
              Have an invitation?{" "}
              <Link className="font-bold text-brand" href="/auth/register">
                Complete account setup
              </Link>
            </p>
            <Link className="font-bold text-brand" href="/admin">
              Admin portal →
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthSplit>
  );
}
