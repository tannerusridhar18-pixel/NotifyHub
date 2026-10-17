import type { CurrentUser } from "@/lib/api";
import { getRoleRoute, normalizeRoleKey } from "@/config/roles";

export function departmentAdminRoute(user: CurrentUser | null): string | null {
  if (!user) return "/auth/login";
  return normalizeRoleKey(user.role) === "DEPARTMENT_ADMIN"
    ? null
    : getRoleRoute(user.role, user.roleLevel);
}
