import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default function DashboardProfilePage() {
  return (
    <AuthenticatedContentShell role="MEMBER">
      <ProfileClient />
    </AuthenticatedContentShell>
  );
}
