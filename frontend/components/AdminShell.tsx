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
  if (checking) return <Loading label="Verifying control-room access…" />;
  if (error)
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0,#1a1d3a,#05060b_60%)] p-6 text-ink">
        <div className="w-full max-w-[560px] rounded-[22px] border border-white/10 bg-white/[0.06] p-8 shadow-lift backdrop-blur-lg">
          <span className="text-[11px] font-bold text-brand-2">Control room unavailable</span>
          <h1 className="my-3 text-3xl">We could not verify your session.</h1>
          <p className="leading-relaxed text-muted">{error}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button className={buttonClasses("primary")} onClick={() => void check()}>
              Retry
            </button>
            <Link className={buttonClasses("secondary", "!border-white/20 !bg-white/10 !text-ink")} href="/admin">
              Back to admin sign in
            </Link>
          </div>
        </div>
      </main>
    );

  return (
    <div className="min-h-screen bg-bg text-ink md:grid md:grid-cols-[262px_1fr]">
      <aside className="z-40 flex flex-col border-b border-white/10 bg-ink-900 p-4 text-ink md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:p-5">
        <div className="flex items-center justify-between gap-2.5">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 font-display text-lg font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-bg shadow-[3px_3px_0_var(--color-brand)]">N</span>
            <span>
              Notify<span className="text-brand-2">Hub</span>
            </span>
          </Link>
        </div>
        <div className="my-5 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-[11px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_0_4px_rgba(61,220,155,0.16)]" />
          <span>Campus control room</span>
        </div>
        <div className="px-2 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">Workspace</div>
        <nav aria-label="Admin navigation" className="grid gap-1 sm:grid-cols-2 md:grid-cols-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-muted hover:bg-white/[0.08] hover:text-ink",
                pathname.startsWith(item.href) && "bg-brand-50 text-ink shadow-[inset_3px_0_var(--color-brand)]"
              )}
            >
              <span className="w-5 text-center text-brand">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden flex-1 md:block" />
        <div className="mt-3 hidden items-center gap-2.5 border-t border-white/10 pt-3 md:flex">
          <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand-2">
            {email.slice(0, 1).toUpperCase() || "A"}
          </div>
          <div className="grid min-w-0 gap-0.5">
            <strong className="text-[11px]">Administrator</strong>
            <span className="truncate text-[9px] text-muted">{email}</span>
          </div>
        </div>
        <div className="mt-1 grid gap-1 sm:grid-cols-2 md:grid-cols-1">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-[11px] font-semibold text-muted hover:bg-white/[0.08] hover:text-ink"
          >
            <span>↗</span>
            <span>Open public site</span>
          </a>
          <button
            className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-[11px] font-semibold text-muted hover:bg-white/[0.08] hover:text-danger"
            onClick={() => void signOut()}
          >
            <span>↪</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
