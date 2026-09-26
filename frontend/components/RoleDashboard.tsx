"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { announcements, currentUser, logout, upcomingEvents, type CurrentUser } from "@/lib/api";
import type { Announcement, EventItem } from "@/types";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import { Empty, ErrorState } from "@/components/States";
import { buttonClasses } from "@/components/ui/Button";
import { cx } from "@/components/ui/classes";
import Counter from "@/components/ui/Counter";
import Reveal from "@/components/ui/Reveal";

import StudentDashboardView from "@/components/dashboards/StudentDashboardView";
import FacultyDashboardView from "@/components/dashboards/FacultyDashboardView";
import HodDashboardView from "@/components/dashboards/HodDashboardView";
import PrincipalDashboardView from "@/components/dashboards/PrincipalDashboardView";
import DeanDashboardView from "@/components/dashboards/DeanDashboardView";
import DepartmentAdminDashboardView from "@/components/dashboards/DepartmentAdminDashboardView";
import { getRoleRoute, normalizeRoleKey } from "@/config/roles";

export default function RoleDashboard({ role }: { role?: string }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const u = await currentUser();
      if (!u) {
        router.replace("/auth/login");
        return;
      }
      const userRoleKey = normalizeRoleKey(u.role);
      const expectedRoleKey = normalizeRoleKey(role);

      if (expectedRoleKey && userRoleKey !== expectedRoleKey) {
        const targetRoute = getRoleRoute(u.role, u.roleLevel);
        router.replace(targetRoute);
        return;
      }

      if (!userRoleKey) {
        router.replace("/access-denied");
        return;
      }

      const [a, e] = await Promise.all([announcements({ size: 8 }), upcomingEvents(0, 6)]);
      setUser(u);
      setAnns(a.content || []);
      setEvents(e.content || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [role, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void load();
  }, [load]);

  async function signOut() {
    try {
      await logout();
    } finally {
      router.replace("/auth/login");
    }
  }

  if (loading)
    return (
      <div className="grid min-h-screen place-content-center place-items-center gap-4 bg-bg text-ink">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white font-black shadow-glow animate-spin-slow text-xl">
          ◈
        </div>
        <p className="text-sm font-bold tracking-wide text-muted">Preparing your campus workspace…</p>
      </div>
    );

  if (error) {
    return (
      <div className="grid min-h-screen place-content-center p-8 bg-bg text-ink">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }

  if (user) {
    const r = normalizeRoleKey(user.role || role);
    if (r === "STUDENT") return <StudentDashboardView user={user} />;
    if (r === "FACULTY") return <FacultyDashboardView user={user} />;
    if (r === "HOD") return <HodDashboardView user={user} />;
    if (r === "PRINCIPAL") return <PrincipalDashboardView user={user} />;
    if (r === "DEAN") return <DeanDashboardView user={user} />;
    if (r === "DEPARTMENT_ADMIN") return <DepartmentAdminDashboardView user={user} />;
    if (r === "SUPER_ADMIN" || r === "ADMIN") {
      router.replace("/admin/dashboard");
      return null;
    }
    router.replace("/access-denied");
    return null;
  }

  return (
    <div className="grid min-h-screen place-content-center place-items-center gap-4 bg-bg text-ink">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-2 text-white font-black shadow-glow animate-spin-slow text-xl">
        ◈
      </div>
      <p className="text-sm font-bold tracking-wide text-muted">Preparing your campus workspace…</p>
    </div>
  );
}
