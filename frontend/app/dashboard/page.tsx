"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/api";
import { Loading } from "@/components/States";
import { getRoleRoute } from "@/config/roles";

export default function DashboardIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await currentUser();
        if (!alive) return;
        if (!u) {
          router.replace("/auth/login");
          return;
        }
        const targetRoute = getRoleRoute(u.role, u.roleLevel);
        router.replace(targetRoute);
      } catch {
        if (alive) router.replace("/auth/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  return <Loading label="Loading workspace…" />;
}
