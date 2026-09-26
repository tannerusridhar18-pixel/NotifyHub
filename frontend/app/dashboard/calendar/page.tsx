import EventsPage from "@/app/events/page";
import AuthenticatedContentShell from "@/components/AuthenticatedContentShell";

export const dynamic = "force-dynamic";

export default function DashboardCalendarPage() {
  return (
    <AuthenticatedContentShell role="MEMBER">
      <EventsPage />
    </AuthenticatedContentShell>
  );
}
