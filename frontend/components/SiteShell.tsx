"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui/classes";

const links = [
  ["/", "Home"],
  ["/announcements", "Announcements"],
  ["/events", "Events"],
  ["/urgent", "Urgent Alerts"],
  ["/ask", "Ask Campus"],
];

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  const isDashboard = path.startsWith("/dashboard");
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(typeof document !== "undefined" && document.cookie.includes("NH_ACCESS="));
  }, [path]);

  if (isAdmin || isDashboard) return <>{children}</>;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-bg/85 backdrop-blur-2xl transition-all duration-300">
        <div className="mx-auto flex h-[74px] max-w-[1240px] items-center gap-4 px-4 sm:h-[82px] sm:gap-8 sm:px-6">
          <Link href="/" className="group flex items-center gap-3 font-display text-xl font-bold tracking-tight text-ink">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white shadow-glow transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-glow-violet">
              ◈
            </span>
            <span className="flex items-center text-xl font-extrabold tracking-tight">
              Notify<span className="text-gradient-animated">Hub</span>
            </span>
          </Link>

          {/* Live Campus Signal Beacon */}
          <div className="hidden items-center gap-2 rounded-full border border-teal-light/40 bg-teal-soft/90 px-3.5 py-1 text-[11px] font-extrabold text-teal-light shadow-[0_0_15px_rgba(45,212,191,0.2)] backdrop-blur-md lg:flex">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
            </span>
            <span>CAMPUS SIGNAL</span>
            <span className="rounded bg-teal-light/20 px-1.5 py-0.2 text-[9px] font-black tracking-widest text-[#5eead4]">LIVE</span>
          </div>

          <nav aria-label="Public navigation" className="hidden flex-1 items-center justify-center gap-1.5 md:flex">
            {links.map(([href, label]) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cx(
                    "relative rounded-xl px-4 py-2 text-[13px] font-extrabold tracking-wide transition-all duration-200",
                    active
                      ? "bg-surface-2/95 text-white shadow-soft border border-white/12"
                      : "text-muted hover:bg-surface-2/65 hover:text-ink hover:-translate-y-0.5"
                  )}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-brand via-brand-2 to-cyan shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <Link
              href={isLoggedIn ? "/dashboard" : "/auth/login"}
              className="btn-shine rounded-xl border border-brand/50 bg-gradient-to-r from-brand via-brand-light to-brand-2 px-4 py-2 text-[13px] font-extrabold text-white shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-violet"
            >
              {isLoggedIn ? "Dashboard →" : "Sign in →"}
            </Link>
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-surface-2/90 text-ink md:hidden transition-all duration-200 hover:bg-surface-2 hover:border-white/20 active:scale-95"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="text-lg font-bold">{open ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown drawer */}
        {open && (
          <nav
            aria-label="Public navigation (mobile)"
            className="grid gap-1.5 border-t border-white/[0.08] bg-surface/98 px-4 py-4 backdrop-blur-2xl md:hidden animate-toast-in"
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-extrabold transition-all duration-200",
                  path === href ? "bg-brand-50 text-brand-light border border-brand/40 shadow-soft" : "text-muted hover:bg-surface-2 hover:text-ink"
                )}
              >
                <span>{label}</span>
                {path === href && <span className="text-xs text-brand-light">●</span>}
              </Link>
            ))}
            <div className="my-2 border-t border-white/[0.08]" />
            <Link
              href={isLoggedIn ? "/dashboard" : "/auth/login"}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-extrabold text-muted hover:bg-surface-2 hover:text-ink"
            >
              <span>{isLoggedIn ? "Dashboard" : "Sign in"}</span>
              <span>→</span>
            </Link>
          </nav>
        )}
      </header>

      <main className="relative">{children}</main>

      <footer className="border-t border-white/[0.08] bg-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-light border border-brand/20">◈</span>
            <span>
              <strong className="text-ink font-bold">NotifyHub</strong> · Unified smart campus communications & broadcast network.
            </span>
          </div>
          <div className="flex items-center gap-4 text-muted/90 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Instant delivery
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> Zero latency
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-2" /> Role isolated
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}


