import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("NH_ACCESS")?.value) redirect("/admin");
  return <DashboardClient />;
}
