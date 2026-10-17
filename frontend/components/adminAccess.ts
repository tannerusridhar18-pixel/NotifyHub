import type { CurrentUser } from "@/lib/api";
import { normalizeRoleKey } from "@/config/roles";

export function isGlobalAdminRole(role?: string | null): boolean {
  const normalized = normalizeRoleKey(role);
  return normalized === "SUPER_ADMIN" || normalized === "ADMIN";
}

export function adminRouteAccess(user: CurrentUser | null): "allowed" | "/auth/login" | "/access-denied" {
  if (!user) return "/auth/login";
  return isGlobalAdminRole(user.role) ? "allowed" : "/access-denied";
}
