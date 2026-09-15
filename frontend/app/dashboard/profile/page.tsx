import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";
import ProfileClient from "./ProfileClient";

export default async function DashboardProfilePage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/auth/login");
  return (
    <AuthenticatedContentShell role="MEMBER">
      <ProfileClient />
    </AuthenticatedContentShell>
  );
}
