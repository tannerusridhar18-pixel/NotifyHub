import { getRoleRoute, normalizeRoleKey } from "@/config/roles";

export function isValidRedirect(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  // Ensure url is an internal path, not an open redirect or protocol injection
  return url.startsWith("/") && !url.startsWith("//") && !url.includes(":");
}

export function getLoginRoute(
  response: { role?: string | null; roleLevel?: number | null },
  redirectUrl?: string | null
): string {
  const role = normalizeRoleKey(response.role);
  if (!role) return "/access-denied";

  if (role === "STUDENT" && isValidRedirect(redirectUrl)) {
    return redirectUrl!;
  }

  return getRoleRoute(role, response.roleLevel);
}
