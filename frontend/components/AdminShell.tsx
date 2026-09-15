"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { currentUser, logout } from "@/lib/api";
import { Loading } from "@/components/States";
import { buttonClasses } from "@/components/ui/Button";
import { cx } from "@/components/ui/classes";

const nav = [
  { href: "/admin/dashboard", label: "Operations", icon: "⌘" },
  { href: "/admin/structure", label: "Structure", icon: "▦" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const user = await currentUser();
      if (user.role !== "ADMIN") {
        router.replace("/");
        return;
      }
      setEmail(user.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify the admin session.");
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route-guard check on mount, not derived render state
    if (pathname !== "/admin") void check();
  }, [pathname, check]);

  async function signOut() {
    try {
      await logout();
    } finally {
      router.replace("/admin");
    }
  }

  if (pathname === "/admin") return <>{children}</>;
  if (checking) return <Loading label="Verifying control room credentials…" />;
  if (error)
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0,#1a1f46,#05060c_65%)] p-6 text-ink">
        <div className="w-full max-w-[560px] rounded-[26px] border border-white/12 bg-surface/95 p-8 shadow-lift backdrop-blur-2xl">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-danger-light">Control room error</span>
          <h1 className="my-3 text-3xl font-extrabold">Session verification failed</h1>
          <p className="leading-relaxed text-muted/90">{error}</p>
          <div className="mt-7 flex flex-wrap gap-3.5">
            <button className={buttonClasses("primary")} onClick={() => void check()}>
              Retry connection
            </button>
            <Link className={buttonClasses("secondary", "!border-white/20 !bg-surface-2 !text-ink")} href="/admin">
              Admin sign in
            </Link>
          </div>
        </div>
      </main>
    );

  return (
    <div className="min-h-screen bg-bg text-ink md:grid md:grid-cols-[280px_1fr]">
      <aside className="z-40 flex flex-col border-b border-white/[0.08] bg-ink-900/98 p-4 text-ink md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:p-6 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/dashboard" className="group flex items-center gap-3 font-display text-lg font-bold">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white shadow-glow transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-violet">
              ◈
            </span>
            <span className="tracking-tight text-xl font-extrabold">
              Notify<span className="text-brand-2-light">Hub</span>
            </span>
          </Link>
        </div>

        <div className="my-5 flex items-center gap-2.5 rounded-xl border border-teal-light/40 bg-teal-soft/90 px-3.5 py-2.5 text-xs font-bold text-teal-light shadow-[0_0_12px_rgba(45,212,191,0.2)] backdrop-blur-md">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
          </span>
          <span>Campus Control Room</span>
        </div>

        <div className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted/80">
          Management
        </div>

        <nav aria-label="Admin navigation" className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "relative flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-extrabold transition-all duration-200",
                  active
                    ? "bg-brand-50 text-white shadow-soft border border-brand/50"
                    : "text-muted hover:bg-white/[0.06] hover:text-white hover:translate-x-1"
                )}
              >
                <span className={cx("w-5 text-center text-sm font-bold", active ? "text-brand-light" : "text-muted")}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-brand to-brand-2 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden flex-1 md:block" />

        <div className="mt-4 hidden items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 backdrop-blur-xl md:flex shadow-soft transition-all hover:border-white/15">
          <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-surface-2 text-xs font-black text-brand-2-light border border-brand/30 shadow-inner">
            {email.slice(0, 1).toUpperCase() || "A"}
          </div>
          <div className="grid min-w-0 gap-0.5">
            <strong className="text-xs font-extrabold text-ink">Super Admin</strong>
            <span className="truncate text-[10px] font-semibold text-muted">{email}</span>
          </div>
        </div>

        <div className="mt-3 grid gap-1.5 sm:grid-cols-2 md:grid-cols-1">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-muted hover:bg-white/[0.06] hover:text-white transition-all duration-200 hover:translate-x-0.5"
          >
            <span className="text-brand-light">↗</span>
            <span>Open Public Site</span>
          </a>
          <button
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-bold text-muted hover:bg-danger-soft/70 hover:text-[#fb7185] transition-all duration-200 hover:translate-x-0.5"
            onClick={() => void signOut()}
          >
            <span>↪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}


