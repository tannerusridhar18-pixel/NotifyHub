"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { currentUser, login } from "@/lib/api";
import styles from "../auth/AuthKit.module.css";
import AuthFloatingCards from "@/components/auth/AuthFloatingCards";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await currentUser();
        if (alive && u.roleLevel === 0) {
          router.replace("/admin/dashboard");
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const x = await login(email, password);
      if (x.roleLevel !== 0) {
        throw new Error("Access denied. Administrator privileges required.");
      }
      router.push("/admin/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} />
      <div className={styles.shell}>
        <div className={`${styles.stack} ${styles["authkit-hero"]}`}>
          <AuthFloatingCards />
          <div className={styles.brand}>
            <span className={styles.brandMark}>◈</span>
            <span>NotifyHub</span>
          </div>

          <div className={styles.eyebrow}>Restricted Control Room</div>
          <h1 className={styles.heading}>Admin access</h1>
          <p className={styles.subheading}>
            Enter authorized administrator credentials to access the protected campus control room.
          </p>

          <section className={styles.card} aria-label="Administrator sign in form">
            <span className={styles.cardLabel}>
              <span className={styles.cardLabelDot} />
              Privileged Identity
            </span>
            <h2 className={styles.cardTitle}>Control Room Sign In</h2>
            <p className={styles.cardDescription}>
              Authorized administrators only. Your session will be protected by the NotifyHub identity layer.
            </p>

            <form onSubmit={submit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="email">
                  Admin Email
                </label>
                <input
                  id="email"
                  required
                  type="email"
                  autoComplete="username"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@notifyhub.local"
                  suppressHydrationWarning
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="password">
                  Security Key / Password
                </label>
                <input
                  id="password"
                  required
                  type="password"
                  autoComplete="current-password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  suppressHydrationWarning
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button type="submit" className={styles.cta} disabled={busy}>
                {busy ? "Validating Session…" : "Enter Control Room →"}
              </button>
            </form>

            <p className={styles.links}>
              Student or faculty member?{" "}
              <Link className={styles.link} href="/auth/login">
                Sign in via User Portal
              </Link>
            </p>
          </section>

          <p className={styles.helper}>Restricted access · Role enforced · Session protected</p>
        </div>
      </div>
    </main>
  );
}
