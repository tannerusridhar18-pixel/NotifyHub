import DashboardClient from "@/app/admin/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default function DepartmentAdminAnnouncementsPage() {
  return <DashboardClient departmentScoped />;
}
