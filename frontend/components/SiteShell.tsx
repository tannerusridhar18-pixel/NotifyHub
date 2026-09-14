"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/components/ui/classes";

const links = [
  ["/", "Home"],
  ["/announcements", "Announcements"],
  ["/events", "Events"],
  ["/urgent", "Urgent"],
  ["/ask", "Ask"],
];

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  const isDashboard = path.startsWith("/dashboard/");
  const [open, setOpen] = useState(false);
  if (isAdmin || isDashboard) return <>{children}</>;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="flex h-[70px] items-center gap-4 px-4 sm:h-[78px] sm:gap-7 sm:px-[max(24px,5vw)]">
          <Link href="/" className="group flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-ink text-lg text-bg shadow-[3px_3px_0_var(--color-brand-2)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
              ◈
            </span>
            <span>
              Notify<span className="text-brand">Hub</span>
            </span>
          </Link>
          <div className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface-2 px-2.5 py-1.5 text-[10px] font-bold text-muted md:flex">
            <i className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_0_4px_rgba(61,220,155,0.18)]" />
            Campus signal <b className="text-[8px] tracking-[0.1em] text-success">LIVE</b>
          </div>
          <nav aria-label="Public navigation" className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={cx(
                  "relative rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink",
                  "after:absolute after:bottom-1 after:left-3.5 after:right-3.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-300 hover:after:scale-x-100",
                  path === href && "bg-surface-2 text-ink after:scale-x-100"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link href="/auth/login" className="hidden px-3 py-2.5 text-[13px] font-semibold text-muted hover:text-ink sm:inline-block">
              Sign in
            </Link>
            <Link href="/admin" className="rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-bold text-bg shadow-glow">
              Admin ↗
            </Link>
            <button
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-ink md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "✕" : "☰"}
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="Public navigation (mobile)" className="grid gap-1 border-t border-border bg-bg px-4 py-3 md:hidden">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cx("rounded-lg px-3 py-2.5 text-sm font-semibold text-muted", path === href && "bg-brand-50 text-brand")}
              >
                {label}
              </Link>
            ))}
            <Link href="/auth/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-muted">
              Sign in
            </Link>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="flex flex-col items-start justify-between gap-2 border-t border-border bg-bg/50 px-4 py-7 text-xs text-muted sm:flex-row sm:items-center sm:px-[5vw]">
        <div>
          <strong className="text-ink">NotifyHub</strong> · One reliable signal for the whole campus.
        </div>
        <span>Secure · searchable · always available</span>
      </footer>
    </>
  );
}
