"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import Field from "@/components/ui/Field";
import styles from "../AuthKit.module.css";

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
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.stack}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>◈</span>
            <span>NotifyHub</span>
          </div>

          <div className={styles.eyebrow}>Unified Campus Identity</div>
          <h1 className={styles.heading}>Welcome back</h1>
          <p className={styles.subheading}>
            Access your personalized campus feed, faculty broadcasts, academic calendars, and department inquiries.
          </p>

          <section className={styles.card} aria-label="Sign in form">
            <span className={styles.cardLabel}>
              <span className={styles.cardLabelDot} />
              Portal Sign In
            </span>
            <h2 className={styles.cardTitle}>Continue to NotifyHub</h2>
            <p className={styles.cardDescription}>Sign in with your registered campus credentials.</p>

            <form onSubmit={submit} className={styles.form}>
              <Field label="Campus Email" htmlFor="email">
                <input
                  id="email"
                  required
                  type="email"
                  autoComplete="email"
                  className={styles.input}
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
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>

              {error && <div className={styles.error}>{error}</div>}

              <button type="submit" className={styles.cta} disabled={busy}>
                {busy ? "Authenticating…" : "Sign in to Dashboard →"}
              </button>
            </form>

            <div className={styles.links}>
              <Link className={styles.link} href="/auth/forgot-password">
                Forgot your password?
              </Link>
              <p>
                Have an invitation?{" "}
                <Link className={styles.link} href="/auth/register">
                  Complete account setup
                </Link>
              </p>
            </div>
          </section>

          <p className={styles.helper}>Secure campus identity · Role-aware access · Session protected</p>
        </div>
      </div>
    </main>
  );
}
