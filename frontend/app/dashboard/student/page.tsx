import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RoleDashboard from "@/components/RoleDashboard";

export default async function StudentDashboard() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/auth/login");
  return <RoleDashboard role="STUDENT" />;
}
