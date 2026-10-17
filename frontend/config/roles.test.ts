import { describe, expect, it } from "vitest";
import { getRoleRoute } from "./roles";

describe("canonical role routes", () => {
  it.each([
    ["SUPER_ADMIN", 0, "/admin/dashboard"],
    ["ADMIN", 1, "/admin/dashboard"],
    ["PRINCIPAL", 1, "/dashboard/principal"],
    ["DEAN", 2, "/dashboard/dean"],
    ["HOD", 3, "/dashboard/hod"],
    ["DEPARTMENT_ADMIN", 3, "/dashboard/department-admin"],
    ["FACULTY", 4, "/dashboard/faculty"],
    ["STUDENT", 5, "/dashboard/student"],
  ])("uses the canonical route for %s", (role, roleLevel, route) => {
    expect(getRoleRoute(role, roleLevel)).toBe(route);
  });

  it.each([
    [null, 0],
    ["", 1],
    ["UNKNOWN", 5],
  ])("denies missing or unknown role %s even when a level is present", (role, roleLevel) => {
    expect(getRoleRoute(role, roleLevel)).toBe("/access-denied");
  });
});
