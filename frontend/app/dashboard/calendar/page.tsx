import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EventsPage from "@/app/events/page";
import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";

export default async function DashboardCalendarPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/auth/login");
  return (
    <AuthenticatedContentShell role="MEMBER">
      <EventsPage />
    </AuthenticatedContentShell>
  );
}
