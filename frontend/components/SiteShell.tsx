"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui/classes";
import QronosBackground from "@/components/ui/QronosBackground";

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoggedIn(typeof document !== "undefined" && document.cookie.includes("NH_ACCESS="));
  }, [path]);

  if (isAdmin || isDashboard) return <>{children}</>;

  return (
    <>
      <QronosBackground />
      <div className="nh-qronos-shell-background">
        <div className="nh-qronos-shell-frame">
          <span>NOTIFYHUB</span>
          <span>SMART CAMPUS COMMUNICATION</span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-white/[0.12] bg-black/55 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-4 px-4 sm:h-[82px] sm:gap-8 sm:px-6">
          <Link href="/" className="group flex items-center gap-3 font-display text-xl font-bold tracking-tight text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white text-black text-sm font-black transition-transform duration-300 group-hover:rotate-6">
              N
            </span>
            <span className="text-[17px] font-extrabold uppercase tracking-[0.04em]">NotifyHub</span>
          </Link>

          <div className="hidden items-center gap-2 border-l border-white/10 pl-5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            Campus signal online
          </div>

          <nav aria-label="Public navigation" className="hidden flex-1 items-center justify-center gap-1.5 md:flex">
            {links.map(([href, label]) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cx(
                    "relative rounded-none px-4 py-2 text-[12px] font-medium tracking-[0.02em] transition-all duration-200",
                    active
                      ? "text-white"
                      : "text-white/55 hover:text-white"
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
              className="btn-shine rounded-full border border-white/35 bg-transparent px-5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-all duration-200 hover:bg-white hover:text-black"
            >
              {isLoggedIn ? "Dashboard  ↗" : "Get started  ↗"}
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

      <main className="relative z-[2]">{children}</main>

      <footer className="relative z-[2] border-t border-white/[0.12] bg-black/75 backdrop-blur-md">
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


