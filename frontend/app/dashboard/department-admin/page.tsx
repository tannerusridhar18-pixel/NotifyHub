"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUser, type CurrentUser } from "@/lib/api";
import { ErrorState, Loading } from "@/components/States";
import DepartmentAdminDashboardView from "@/components/dashboards/DepartmentAdminDashboardView";
import { departmentAdminRoute } from "./guard";

export default function DepartmentAdminDashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const u = await currentUser();
      const redirect = departmentAdminRoute(u);
      if (redirect) {
        router.replace(redirect);
        return;
      }
      setUser(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load department workspace.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void load();
  }, [load]);

  if (loading) {
    return <Loading label="Loading department workspace…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  if (!user) return null;

  return <DepartmentAdminDashboardView user={user} />;
}
