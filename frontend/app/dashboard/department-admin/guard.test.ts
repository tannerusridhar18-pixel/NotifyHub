import { describe, expect, it } from "vitest";
import type { CurrentUser } from "@/lib/api";
import { departmentAdminRoute } from "./guard";

const user = (role: string, roleLevel: number): CurrentUser => ({
  publicId: `${role.toLowerCase()}-id`,
  email: `${role.toLowerCase()}@example.edu`,
  role,
  roleId: null,
  roleLevel,
  department: null,
  departmentId: null,
  accountStatus: "ACTIVE",
  student: null,
  faculty: null,
});

describe("department-admin route guard", () => {
  it("redirects unauthenticated users to login", () => {
    expect(departmentAdminRoute(null)).toBe("/auth/login");
  });

  it("allows the exact department admin role", () => {
    expect(departmentAdminRoute(user("DEPARTMENT_ADMIN", 3))).toBeNull();
  });

  it.each([
    ["SUPER_ADMIN", 0, "/admin/dashboard"],
    ["PRINCIPAL", 1, "/dashboard/principal"],
    ["DEAN", 2, "/dashboard/dean"],
    ["HOD", 3, "/dashboard/hod"],
    ["FACULTY", 4, "/dashboard/faculty"],
    ["STUDENT", 5, "/dashboard/student"],
  ])("redirects %s to its authorized route", (role, level, route) => {
    expect(departmentAdminRoute(user(role, level))).toBe(route);
  });

  it("sends an unknown role to access denied", () => {
    expect(departmentAdminRoute(user("UNKNOWN", 99))).toBe("/access-denied");
  });
});
