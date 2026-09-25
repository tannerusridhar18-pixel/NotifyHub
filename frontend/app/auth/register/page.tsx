"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";
import Field from "@/components/ui/Field";
import styles from "../AuthKit.module.css";

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
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.stack}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>◈</span>
            <span>NotifyHub</span>
          </div>

          <div className={styles.eyebrow}>Invitation Onboarding</div>
          <h1 className={styles.heading}>Complete setup</h1>
          <p className={styles.subheading}>
            Activate your campus account with the password from your invitation.
          </p>

          <section className={styles.card} aria-label="Registration form">
            <span className={styles.cardLabel}>
              <span className={styles.cardLabelDot} />
              Secure Account Setup
            </span>
            <h2 className={styles.cardTitle}>Create your password</h2>
            <p className={styles.cardDescription}>Use at least 8 characters to activate your campus account.</p>

            <div className={styles.status}>
              <span className={styles.statusIcon}>{token ? "✓" : "!"}</span>
              <div>
                <b className={styles.statusTitle}>{token ? "Invitation verified" : "Invitation link required"}</b>
                <small className={styles.statusCopy}>
                  {token ? "Token validated. Enter password to activate." : "Open the link from your NotifyHub invitation email."}
                </small>
              </div>
            </div>

            <form onSubmit={submit} className={styles.form}>
              <Field label="New Password (min 8 chars)" htmlFor="password">
                <input
                  id="password"
                  required
                  minLength={8}
                  type="password"
                  className={styles.input}
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
                  className={styles.input}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              <button type="submit" className={styles.cta} disabled={busy || !token}>
                {busy ? "Activating Profile…" : "Activate Campus Account →"}
              </button>
            </form>

            <p className={styles.links}>
              Already active?{" "}
              <Link className={styles.link} href="/auth/login">
                Back to sign in
              </Link>
            </p>
          </section>

          <p className={styles.helper}>Invitation only · Secure activation · Session protected</p>
        </div>
      </div>
    </main>
  );
}
