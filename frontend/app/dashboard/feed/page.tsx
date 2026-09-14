import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AnnouncementsPage from "@/app/announcements/page";
import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";

export default async function DashboardFeedPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/auth/login");
  return (
    <AuthenticatedContentShell role="STUDENT">
      <AnnouncementsPage />
    </AuthenticatedContentShell>
  );
}
