import AskPage from "@/app/ask/page";
import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";

export const dynamic = "force-dynamic";

export default function DashboardAskPage() {
  return (
    <AuthenticatedContentShell role="MEMBER">
      <AskPage />
    </AuthenticatedContentShell>
  );
}
