import DashboardClient from "@/app/admin/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default function DepartmentAdminEventsPage() {
  return <DashboardClient departmentScoped />;
}
