import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RoleDashboard from "@/components/RoleDashboard";

export default async function DeanDashboard() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/auth/login");
  return <RoleDashboard role="DEAN" />;
}
