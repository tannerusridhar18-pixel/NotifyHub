"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUser, type CurrentUser } from "@/lib/api";
import { Loading } from "@/components/States";
import DepartmentAdminDashboardView from "@/components/dashboards/DepartmentAdminDashboardView";

export default function DepartmentAdminDashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const u = await currentUser();
      setUser(u);
    } catch {
      router.replace("/auth/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void load();
  }, [load]);

  if (loading || !user) {
    return <Loading label="Loading department workspace…" />;
  }

  return <DepartmentAdminDashboardView user={user} />;
}

