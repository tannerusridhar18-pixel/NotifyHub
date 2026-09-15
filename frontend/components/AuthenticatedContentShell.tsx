"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { currentUser, logout } from "@/lib/api";
import { buttonClasses } from "@/components/ui/Button";
import { cx } from "@/components/ui/classes";

export default function AuthenticatedContentShell({ children, role }: { children: React.ReactNode; role: "STUDENT" | "FACULTY" | "MEMBER" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resolvedRole, setResolvedRole] = useState<"STUDENT" | "FACULTY" | null>(null);

  useEffect(() => {
    currentUser().then((u) => {
      if (u?.role === "FACULTY" || u?.role === "STUDENT") {
        setResolvedRole(u.role);
      }
    }).catch(() => {});
  }, []);

  const effectiveRole = resolvedRole || (searchParams.get("from") === "faculty" || role === "FACULTY" ? "FACULTY" : "STUDENT");
  const from = effectiveRole.toLowerCase();
  const dashboardHref = effectiveRole === "FACULTY" ? "/dashboard/faculty" : "/dashboard/student";

  async function signOut() {
    try {
      await logout();
    } finally {
      router.replace("/auth/login");
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 flex min-h-[72px] flex-wrap items-center gap-4 border-b border-white/[0.08] bg-bg/85 px-4 py-3 backdrop-blur-xl sm:min-h-[80px] sm:flex-nowrap sm:px-8">
        <Link href={dashboardHref} className="group flex items-center gap-3 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
            ◈
          </span>
          <span className="tracking-tight">
            Notify<span className="text-brand">Hub</span>
          </span>
        </Link>
        <span className="hidden items-center gap-2 rounded-full border border-border/80 bg-surface-2/80 px-3 py-1 text-xs font-bold text-muted md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {role} · Campus workspace
        </span>
        <nav className="ml-auto flex items-center gap-1.5 sm:gap-2.5" aria-label="Authenticated dashboard navigation">
          <Link href={`/dashboard/feed?from=${from}`} className="rounded-xl px-3 py-2 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-colors">
            Feed
          </Link>
          <Link href={`/dashboard/calendar?from=${from}`} className="rounded-xl px-3 py-2 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-colors">
            Calendar
          </Link>
          <Link href={`/dashboard/ask?from=${from}`} className="rounded-xl px-3 py-2 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-colors">
            Ask
          </Link>
          <Link href={`/dashboard/profile?from=${from}`} className="rounded-xl px-3 py-2 text-xs font-bold text-muted hover:bg-surface-2 hover:text-white transition-colors">
            Profile
          </Link>
          <Link href={dashboardHref} className="rounded-xl px-3 py-2 text-xs font-bold text-brand-light bg-brand-50/80 border border-brand/30 hover:bg-brand-50 transition-colors">
            Dashboard
          </Link>
          <button className={buttonClasses("secondary", "!px-3.5 !py-2 !text-xs")} onClick={() => void signOut()}>
            Sign out
          </button>
        </nav>
      </header>
      <main className="relative">{children}</main>
    </div>
  );
}

