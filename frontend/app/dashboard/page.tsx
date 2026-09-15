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
    if (payload.role === "FACULTY") {
      redirect("/dashboard/faculty");
    } else if (payload.role === "ADMIN") {
      redirect("/admin/dashboard");
    }
  } catch {}
  redirect("/dashboard/student");
}
