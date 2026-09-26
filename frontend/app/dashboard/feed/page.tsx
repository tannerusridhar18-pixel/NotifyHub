import AnnouncementsPage from "@/app/announcements/page";
import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";

export const dynamic = "force-dynamic";

export default function DashboardFeedPage() {
  return (
    <AuthenticatedContentShell role="MEMBER">
      <AnnouncementsPage />
    </AuthenticatedContentShell>
  );
}
