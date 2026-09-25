"use client";
import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";
import styles from "../AuthKit.module.css";

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
      setMessage("If an account exists for this email, password recovery instructions have been dispatched.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to request a reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} />
      <div className={styles.shell}>
        <div className={styles.stack}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>◈</span>
            <span>NotifyHub</span>
          </div>

          <div className={styles.eyebrow}>Security Verification</div>
          <h1 className={styles.heading}>Reset access</h1>
          <p className={styles.subheading}>
            Enter your registered campus email to receive secure recovery instructions.
          </p>

          <section className={styles.card} aria-label="Password recovery form">
            <span className={styles.cardLabel}>
              <span className={styles.cardLabelDot} />
              Password Recovery
            </span>
            <h2 className={styles.cardTitle}>Recover your account</h2>
            <p className={styles.cardDescription}>
              We&apos;ll send recovery instructions to the email associated with your campus account.
            </p>

            <form onSubmit={submit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="email">
                  Registered Campus Email
                </label>
                <input
                  required
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@campus.edu"
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {message && <div className={styles.success}>{message}</div>}

              <button type="submit" className={styles.cta} disabled={busy}>
                {busy ? "Dispatching Instructions…" : "Send Recovery Instructions →"}
              </button>
            </form>

            <p className={styles.links}>
              Remembered your credentials?{" "}
              <Link className={styles.link} href="/auth/login">
                Back to sign in
              </Link>
            </p>
          </section>

          <p className={styles.helper}>Secure recovery · Identity protected · Session safe</p>
        </div>
      </div>
    </main>
  );
}
