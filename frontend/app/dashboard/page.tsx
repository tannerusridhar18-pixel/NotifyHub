import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("NH_ACCESS")?.value;
  if (!token) {
    redirect("/auth/login");
  }
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf-8"));
    const roleLevel = payload.roleLevel !== undefined ? Number(payload.roleLevel) : 5;

    if (roleLevel === 0) {
      redirect("/admin/dashboard");
    } else if (roleLevel === 1) {
      redirect("/dashboard/principal");
    } else if (roleLevel === 2) {
      redirect("/dashboard/dean");
    } else if (roleLevel === 3) {
      redirect("/dashboard/hod");
    } else if (roleLevel === 4) {
      redirect("/dashboard/faculty");
    } else {
      redirect("/dashboard/student");
    }
  } catch {
    redirect("/dashboard/student");
  }
}
