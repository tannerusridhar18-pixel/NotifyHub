import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SuperAdminDashboard() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/admin");
  redirect("/admin/dashboard");
}
