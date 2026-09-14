"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { logout } from "@/lib/api";
import { buttonClasses } from "@/components/ui/Button";

export default function AuthenticatedContentShell({ children, role }: { children: React.ReactNode; role: "STUDENT" | "FACULTY" | "MEMBER" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") === "faculty" ? "faculty" : "student";
  const dashboardHref = from === "faculty" ? "/dashboard/faculty" : "/dashboard/student";

  async function signOut() {
    try {
      await logout();
    } finally {
      router.replace("/auth/login");
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 flex min-h-[70px] flex-wrap items-center gap-4 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-md sm:min-h-[78px] sm:flex-nowrap sm:px-[max(22px,5vw)]">
        <Link href={role === "MEMBER" ? dashboardHref : `/dashboard/${role === "STUDENT" ? "student" : "faculty"}`} className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-ink text-lg text-bg">◈</span>
          <span>Notify<span className="text-brand">Hub</span></span>
        </Link>
        <span className="hidden text-[11px] font-semibold text-muted md:inline">{role} · Personal campus signal</span>
        <nav className="ml-auto flex items-center gap-3" aria-label="Authenticated dashboard navigation">
          <Link href={`/dashboard/feed?from=${from}`} className="text-[11px] font-bold text-muted">Public feed</Link>
          <Link href={`/dashboard/ask?from=${from}`} className="text-[11px] font-bold text-muted">Ask</Link>
          <Link href={dashboardHref} className="text-[11px] font-bold text-muted">Dashboard</Link>
          <button className={buttonClasses("secondary", "!px-3 !py-2 !text-[11px]")} onClick={() => void signOut()}>Sign out</button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
