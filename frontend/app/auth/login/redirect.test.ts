import { describe, expect, it } from "vitest";
import { getLoginRoute, isValidRedirect } from "./redirect";

describe("login role redirects", () => {
  it.each([
    ["SUPER_ADMIN", 0, "/admin/dashboard"],
    ["PRINCIPAL", 1, "/dashboard/principal"],
    ["DEAN", 2, "/dashboard/dean"],
    ["HOD", 3, "/dashboard/hod"],
    ["DEPARTMENT_ADMIN", 3, "/dashboard/department-admin"],
    ["FACULTY", 4, "/dashboard/faculty"],
    ["STUDENT", 5, "/dashboard/student"],
  ])("routes %s to its canonical dashboard", (role, roleLevel, route) => {
    expect(getLoginRoute({ role, roleLevel })).toBe(route);
  });

  it("preserves the canonical route for the ADMIN role", () => {
    expect(getLoginRoute({ role: "ADMIN", roleLevel: 1 })).toBe("/admin/dashboard");
  });

  it.each([
    { role: "", roleLevel: 5 },
    { role: null, roleLevel: 5 },
    { role: "UNKNOWN", roleLevel: 5 },
    { role: "UNKNOWN", roleLevel: 99 },
  ])("denies missing or invalid role data", (response) => {
    expect(getLoginRoute({ role: response.role, roleLevel: response.roleLevel })).toBe("/access-denied");
  });

  describe("student post-login redirection for event registration", () => {
    it("redirects student to the target event registration path", () => {
      expect(
        getLoginRoute({ role: "STUDENT", roleLevel: 5 }, "/events?event=42#event-42")
      ).toBe("/events?event=42#event-42");
    });

    it("redirects student to generic events route if specified", () => {
      expect(getLoginRoute({ role: "STUDENT", roleLevel: 5 }, "/events")).toBe("/events");
    });

    it("falls back to canonical student dashboard if redirectUrl is empty or null", () => {
      expect(getLoginRoute({ role: "STUDENT", roleLevel: 5 }, null)).toBe("/dashboard/student");
      expect(getLoginRoute({ role: "STUDENT", roleLevel: 5 }, "")).toBe("/dashboard/student");
    });

    it("prevents open redirect attacks for external URLs and falls back to student dashboard", () => {
      expect(getLoginRoute({ role: "STUDENT", roleLevel: 5 }, "https://malicious.example.com")).toBe(
        "/dashboard/student"
      );
      expect(getLoginRoute({ role: "STUDENT", roleLevel: 5 }, "//malicious.example.com")).toBe(
        "/dashboard/student"
      );
      expect(getLoginRoute({ role: "STUDENT", roleLevel: 5 }, "javascript:alert(1)")).toBe(
        "/dashboard/student"
      );
    });

    it("ignores redirectUrl for management and faculty roles and routes to canonical dashboard", () => {
      expect(
        getLoginRoute({ role: "SUPER_ADMIN", roleLevel: 0 }, "/events?event=42#event-42")
      ).toBe("/admin/dashboard");
      expect(
        getLoginRoute({ role: "ADMIN", roleLevel: 1 }, "/events?event=42#event-42")
      ).toBe("/admin/dashboard");
      expect(
        getLoginRoute({ role: "DEPARTMENT_ADMIN", roleLevel: 3 }, "/events?event=42#event-42")
      ).toBe("/dashboard/department-admin");
      expect(
        getLoginRoute({ role: "FACULTY", roleLevel: 4 }, "/events?event=42#event-42")
      ).toBe("/dashboard/faculty");
    });
  });

  describe("isValidRedirect validation helper", () => {
    it("accepts valid relative paths", () => {
      expect(isValidRedirect("/events")).toBe(true);
      expect(isValidRedirect("/events?event=10#event-10")).toBe(true);
      expect(isValidRedirect("/dashboard/student")).toBe(true);
    });

    it("rejects non-relative or protocol-injected paths", () => {
      expect(isValidRedirect("https://example.com")).toBe(false);
      expect(isValidRedirect("//example.com")).toBe(false);
      expect(isValidRedirect("javascript:alert(1)")).toBe(false);
      expect(isValidRedirect("")).toBe(false);
      expect(isValidRedirect(null)).toBe(false);
      expect(isValidRedirect(undefined)).toBe(false);
    });
  });
});
