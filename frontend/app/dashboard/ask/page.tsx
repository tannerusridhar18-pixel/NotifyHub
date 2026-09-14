import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AskPage from "@/app/ask/page";
import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";

export default async function DashboardAskPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/auth/login");
  return (
    <AuthenticatedContentShell role="MEMBER">
      <AskPage />
    </AuthenticatedContentShell>
  );
}
