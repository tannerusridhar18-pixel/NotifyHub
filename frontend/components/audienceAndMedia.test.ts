import { describe, expect, it } from "vitest";
import { formatAudienceLabel } from "@/components/ui/Badge";
import { safeUrl } from "@/lib/api";
import type { Announcement, EventItem } from "@/types";

describe("Audience Badge Target Resolution", () => {
  it("resolves GLOBAL audience to Everyone", () => {
    const item = { targetType: "GLOBAL" as const };
    expect(formatAudienceLabel(item)).toBe("Everyone");
  });

  it("resolves recipientType all or all_campus to Everyone", () => {
    expect(formatAudienceLabel({ targetType: "GLOBAL", recipientType: "all" })).toBe("Everyone");
    expect(formatAudienceLabel({ targetType: "GLOBAL", recipientType: "all_campus" })).toBe("Everyone");
  });

  it("resolves DEPARTMENT target scope with and without name", () => {
    const withName = {
      targetType: "DEPARTMENT" as const,
      departmentId: 1,
      recipientTargets: JSON.stringify(["CSE"]),
    };
    expect(formatAudienceLabel(withName)).toBe("Department · CSE");

    const withDirectTarget = {
      targetType: "DEPARTMENT" as const,
      departmentId: 1,
      recipientTargets: "ECE",
    };
    expect(formatAudienceLabel(withDirectTarget)).toBe("Department · ECE");

    const withPropName = {
      targetType: "DEPARTMENT" as const,
      departmentId: 1,
      departmentName: "Mechanical Engineering",
    };
    expect(formatAudienceLabel(withPropName)).toBe("Department · Mechanical Engineering");

    const withoutName = {
      targetType: "DEPARTMENT" as const,
      departmentId: 2,
    };
    expect(formatAudienceLabel(withoutName)).toBe("Department");
  });

  it("resolves BRANCH target scope with and without name", () => {
    const withName = {
      targetType: "BRANCH" as const,
      branchId: 10,
      recipientTargets: JSON.stringify(["CSE"]),
    };
    expect(formatAudienceLabel(withName)).toBe("Branch · CSE");

    const withPropName = {
      targetType: "BRANCH" as const,
      branchId: 10,
      branchName: "Artificial Intelligence",
    };
    expect(formatAudienceLabel(withPropName)).toBe("Branch · Artificial Intelligence");

    const withoutName = {
      targetType: "BRANCH" as const,
      branchId: 10,
    };
    expect(formatAudienceLabel(withoutName)).toBe("Branch");
  });

  it("resolves SECTION target scope with and without name", () => {
    const withName = {
      targetType: "SECTION" as const,
      sectionId: 101,
      recipientTargets: JSON.stringify(["CSE-A"]),
    };
    expect(formatAudienceLabel(withName)).toBe("Section · CSE-A");

    const withoutName = {
      targetType: "SECTION" as const,
      sectionId: 101,
    };
    expect(formatAudienceLabel(withoutName)).toBe("Section");
  });

  it("resolves HOSTEL target scope with and without name", () => {
    const withName = {
      targetType: "HOSTEL" as const,
      hostelId: 5,
      recipientTargets: JSON.stringify(["MH-1"]),
    };
    expect(formatAudienceLabel(withName)).toBe("Hostel · MH-1");

    const withoutName = {
      targetType: "HOSTEL" as const,
      hostelId: 5,
    };
    expect(formatAudienceLabel(withoutName)).toBe("Hostel");
  });

  it("resolves ROLE target scope correctly formatted", () => {
    expect(formatAudienceLabel({ targetType: "ROLE", role: "STUDENT" })).toBe("Role · Student");
    expect(formatAudienceLabel({ targetType: "ROLE", role: "FACULTY" })).toBe("Role · Faculty");
    expect(formatAudienceLabel({ targetType: "ROLE", role: "HOD" })).toBe("Role · Hod");
    expect(formatAudienceLabel({ targetType: "ROLE", role: null, recipientTargets: JSON.stringify(["DEAN"]) })).toBe("Role · Dean");
    expect(formatAudienceLabel({ targetType: "ROLE", role: null })).toBe("Role");
  });

  it("resolves USER target scope with direct email", () => {
    expect(formatAudienceLabel({ targetType: "USER", userEmail: "student@campus.edu" })).toBe("Direct · student@campus.edu");
    expect(formatAudienceLabel({ targetType: "USER", userEmail: null })).toBe("Direct Channel");
  });

  it("resolves specialized recipient types safely", () => {
    expect(formatAudienceLabel({ targetType: "ROLE", recipientType: "student_only" })).toBe("Students");
    expect(formatAudienceLabel({ targetType: "ROLE", recipientType: "faculty_only" })).toBe("Faculty");
    expect(formatAudienceLabel({ targetType: "ROLE", recipientType: "specific_hod" })).toBe("Department HODs");
    expect(formatAudienceLabel({ targetType: "ROLE", recipientType: "specific_dean" })).toBe("Deans");
  });

  it("safely handles null, undefined, or empty item", () => {
    expect(formatAudienceLabel(null)).toBe("Everyone");
    expect(formatAudienceLabel(undefined)).toBe("Everyone");
    expect(formatAudienceLabel({})).toBe("Everyone");
  });
});

describe("Image URL Validation and Safety", () => {
  it("allows valid absolute and relative image URLs", () => {
    expect(safeUrl("https://images.unsplash.com/photo-1540575467063-178a50c2df87")).toBe(
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87"
    );
    expect(safeUrl("/images/campus-event.jpg")).toBe("/images/campus-event.jpg");
    expect(safeUrl("http://example.com/photo.png")).toBe("http://example.com/photo.png");
  });

  it("rejects malicious or protocol-injected image URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBeUndefined();
    expect(safeUrl("vbscript:test")).toBeUndefined();
    expect(safeUrl("")).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
  });
});
