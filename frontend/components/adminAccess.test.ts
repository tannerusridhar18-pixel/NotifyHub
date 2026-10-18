import { describe, expect, it } from "vitest";
import type { CurrentUser } from "@/lib/api";
import { adminRouteAccess, isGlobalAdminRole } from "./adminAccess";

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

describe("admin route access", () => {
  it.each(["SUPER_ADMIN", "ADMIN"])("recognizes %s as a global admin role", (role) => {
    expect(isGlobalAdminRole(role)).toBe(true);
  });

  it.each(["PRINCIPAL", "DEAN", "HOD", "DEPARTMENT_ADMIN", "FACULTY", "STUDENT", "", null])(
    "does not recognize %s as a global admin role",
    (role) => {
      expect(isGlobalAdminRole(role)).toBe(false);
    }
  );

  it("redirects unauthenticated users to login", () => {
    expect(adminRouteAccess(null)).toBe("/auth/login");
  });

  it.each([
    ["SUPER_ADMIN", 0],
    ["ADMIN", 1],
  ])("allows %s to use admin routes", (role, level) => {
    expect(adminRouteAccess(user(role, level))).toBe("allowed");
  });

  it.each(["PRINCIPAL", "DEAN", "HOD", "DEPARTMENT_ADMIN", "FACULTY", "STUDENT"])(
    "denies %s from admin routes",
    (role) => {
      expect(adminRouteAccess(user(role, 3))).toBe("/access-denied");
    }
  );
});
