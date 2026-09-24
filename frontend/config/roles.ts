export type RoleKey =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PRINCIPAL"
  | "DEAN"
  | "HOD"
  | "DEPARTMENT_ADMIN"
  | "FACULTY"
  | "STUDENT";

export interface RoleConfig {
  key: RoleKey;
  level: number;
  label: string;
  route: string;
  description: string;
}

export const ROLE_CONFIGS: Record<RoleKey, RoleConfig> = {
  SUPER_ADMIN: {
    key: "SUPER_ADMIN",
    level: 0,
    label: "Super Admin",
    route: "/admin/dashboard",
    description: "System administration and full campus governance",
  },
  ADMIN: {
    key: "ADMIN",
    level: 1,
    label: "Admin",
    route: "/admin/dashboard",
    description: "Campus administrative operations and governance",
  },
  PRINCIPAL: {
    key: "PRINCIPAL",
    level: 1,
    label: "Principal",
    route: "/dashboard/principal",
    description: "Executive campus leadership and strategic broadcasts",
  },
  DEAN: {
    key: "DEAN",
    level: 2,
    label: "Dean",
    route: "/dashboard/dean",
    description: "Academic leadership and faculty/HOD communications",
  },
  HOD: {
    key: "HOD",
    level: 3,
    label: "Head of Department",
    route: "/dashboard/hod",
    description: "Department leadership, student roster, and faculty management",
  },
  DEPARTMENT_ADMIN: {
    key: "DEPARTMENT_ADMIN",
    level: 3,
    label: "Department Admin",
    route: "/dashboard/department-admin",
    description: "Department invitations, inquiry desk, promotions, and operations",
  },
  FACULTY: {
    key: "FACULTY",
    level: 4,
    label: "Faculty",
    route: "/dashboard/faculty",
    description: "Course communications, section notices, and student guidance",
  },
  STUDENT: {
    key: "STUDENT",
    level: 5,
    label: "Student",
    route: "/dashboard/student",
    description: "Personalized student feed, calendar, and query center",
  },
};

export function normalizeRoleKey(role?: string | null): RoleKey | null {
  if (!role) return null;
  const trimmed = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (trimmed in ROLE_CONFIGS) {
    return trimmed as RoleKey;
  }
  return null;
}

export function getRoleConfig(role?: string | null, roleLevel?: number | null): RoleConfig | null {
  const normalized = normalizeRoleKey(role);
  if (normalized) {
    return ROLE_CONFIGS[normalized];
  }
  if (roleLevel !== undefined && roleLevel !== null) {
    if (roleLevel === 0) return ROLE_CONFIGS.SUPER_ADMIN;
    if (roleLevel === 1) return ROLE_CONFIGS.PRINCIPAL;
    if (roleLevel === 2) return ROLE_CONFIGS.DEAN;
    if (roleLevel === 3) return ROLE_CONFIGS.HOD;
    if (roleLevel === 4) return ROLE_CONFIGS.FACULTY;
    if (roleLevel === 5) return ROLE_CONFIGS.STUDENT;
  }
  return null;
}

export function getRoleRoute(role?: string | null, roleLevel?: number | null): string {
  const config = getRoleConfig(role, roleLevel);
  return config ? config.route : "/access-denied";
}
