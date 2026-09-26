"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { buttonClasses } from "@/components/ui/Button";

export default function AccessDeniedPage() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await logout();
    } finally {
      router.replace("/auth/login");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg text-ink px-4 py-16">
      <div className="max-w-md w-full rounded-3xl border border-white/12 bg-surface/95 p-8 text-center shadow-lift backdrop-blur-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400 text-3xl font-black mb-6">
          ⚠
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-red-400">
          Access Restricted
        </span>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
          Unauthorized Workspace
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Your account role is unmapped or does not have permissions to access this campus workspace. Please contact your system administrator.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => void handleSignOut()}
            className={buttonClasses("primary", "!w-full sm:!w-auto")}
          >
            Sign Out & Switch Account
          </button>
          <Link
            href="/"
            className={buttonClasses("secondary", "!w-full sm:!w-auto")}
          >
            Public Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
