import { describe, expect, it } from "vitest";
import {
  canManageEventRegistrations,
  getEventLoginRedirectUrl,
  getRegistrationState,
} from "./eventRegistration";
import type { CurrentUser } from "@/lib/api";
import type { EventItem } from "@/types";

const mockEvent = (overrides?: Partial<EventItem>): EventItem => ({
  id: 10,
  title: "Tech Symposium",
  description: "Description",
  location: "Auditorium",
  startAt: new Date(Date.now() + 86400000).toISOString(),
  endAt: new Date(Date.now() + 90000000).toISOString(),
  status: "PUBLISHED",
  targetType: "GLOBAL",
  departmentId: 101,
  branchId: null,
  sectionId: null,
  hostelId: null,
  userEmail: null,
  role: null,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  authorId: 1,
  registrationEnabled: true,
  registrationDeadline: new Date(Date.now() + 40000000).toISOString(),
  ...overrides,
});

const mockUser = (role: string, departmentId: number | null = null): CurrentUser =>
  ({
    id: 1,
    publicId: "uuid-1",
    username: "user1",
    email: "user1@example.com",
    role,
    roleLevel: 5,
    departmentId,
    department: null,
    branchId: null,
    branch: null,
    reportsToId: null,
    status: "ACTIVE",
    active: true,
    student: null,
    faculty: null,
  } as unknown as CurrentUser);

describe("event registration flow logic", () => {
  describe("canManageEventRegistrations RBAC permissions", () => {
    it("allows SUPER_ADMIN to manage registrations for any event", () => {
      const superAdmin = mockUser("SUPER_ADMIN", null);
      expect(canManageEventRegistrations(superAdmin, mockEvent({ departmentId: 101 }))).toBe(true);
      expect(canManageEventRegistrations(superAdmin, mockEvent({ departmentId: 999 }))).toBe(true);
      expect(canManageEventRegistrations(superAdmin, mockEvent({ departmentId: null }))).toBe(true);
    });

    it("allows ADMIN to manage registrations for any event", () => {
      const admin = mockUser("ADMIN", null);
      expect(canManageEventRegistrations(admin, mockEvent({ departmentId: 101 }))).toBe(true);
      expect(canManageEventRegistrations(admin, mockEvent({ departmentId: 999 }))).toBe(true);
    });

    it("allows DEPARTMENT_ADMIN to manage registrations only for matching department", () => {
      const deptAdmin = mockUser("DEPARTMENT_ADMIN", 101);
      expect(canManageEventRegistrations(deptAdmin, mockEvent({ departmentId: 101 }))).toBe(true);
      expect(canManageEventRegistrations(deptAdmin, mockEvent({ departmentId: 102 }))).toBe(false);
      expect(canManageEventRegistrations(deptAdmin, mockEvent({ departmentId: null }))).toBe(false);
    });

    it("denies DEPARTMENT_ADMIN if departmentId is missing", () => {
      const deptAdminWithoutDept = mockUser("DEPARTMENT_ADMIN", null);
      expect(canManageEventRegistrations(deptAdminWithoutDept, mockEvent({ departmentId: 101 }))).toBe(false);
    });

    it("denies STUDENT, FACULTY, and unauthenticated users", () => {
      expect(canManageEventRegistrations(mockUser("STUDENT", 101), mockEvent({ departmentId: 101 }))).toBe(false);
      expect(canManageEventRegistrations(mockUser("FACULTY", 101), mockEvent({ departmentId: 101 }))).toBe(false);
      expect(canManageEventRegistrations(null, mockEvent({ departmentId: 101 }))).toBe(false);
    });
  });

  describe("getEventLoginRedirectUrl helper", () => {
    it("constructs target URL encoding event id and element anchor", () => {
      expect(getEventLoginRedirectUrl(15, "/events")).toBe(
        "/auth/login?redirect=" + encodeURIComponent("/events?event=15#event-15")
      );
    });

    it("handles homepage or other caller pathnames", () => {
      expect(getEventLoginRedirectUrl(20, "/")).toBe(
        "/auth/login?redirect=" + encodeURIComponent("/?event=20#event-20")
      );
    });

    it("strips pre-existing query strings from the caller path", () => {
      expect(getEventLoginRedirectUrl(25, "/events?filter=upcoming")).toBe(
        "/auth/login?redirect=" + encodeURIComponent("/events?event=25#event-25")
      );
    });
  });

  describe("getRegistrationState calculation", () => {
    it("shows Register button for logged-out users when event is open", () => {
      const state = getRegistrationState({
        event: mockEvent({ registrationEnabled: true }),
        authenticated: false,
        isRegistered: false,
        loading: false,
      });

      expect(state.buttonText).toBe("Register");
      expect(state.buttonDisabled).toBe(false);
      expect(state.needsLogin).toBe(true);
      expect(state.closed).toBe(false);
    });

    it("shows Register button enabled for eligible authenticated students", () => {
      const state = getRegistrationState({
        event: mockEvent({ registrationEnabled: true }),
        authenticated: true,
        isRegistered: false,
        loading: false,
      });

      expect(state.buttonText).toBe("Register");
      expect(state.buttonDisabled).toBe(false);
      expect(state.needsLogin).toBe(false);
      expect(state.closed).toBe(false);
    });

    it("shows Already registered and disables button if student has registered", () => {
      const state = getRegistrationState({
        event: mockEvent({ registrationEnabled: true }),
        authenticated: true,
        isRegistered: true,
        loading: false,
      });

      expect(state.buttonText).toBe("Already registered");
      expect(state.buttonDisabled).toBe(true);
      expect(state.closed).toBe(false);
    });

    it("handles closed registration when registrationEnabled is false", () => {
      const state = getRegistrationState({
        event: mockEvent({ registrationEnabled: false }),
        authenticated: true,
        isRegistered: false,
        loading: false,
      });

      expect(state.closed).toBe(true);
      expect(state.reason).toBe("Registration is closed");
      expect(state.buttonDisabled).toBe(true);
    });

    it("handles closed registration when deadline has passed", () => {
      const pastDeadline = new Date(Date.now() - 3600000).toISOString();
      const state = getRegistrationState({
        event: mockEvent({ registrationEnabled: true, registrationDeadline: pastDeadline }),
        authenticated: true,
        isRegistered: false,
        loading: false,
      });

      expect(state.closed).toBe(true);
      expect(state.reason).toBe("Registration deadline has passed");
      expect(state.buttonDisabled).toBe(true);
    });

    it("shows Registering… and disables button during in-flight submission", () => {
      const state = getRegistrationState({
        event: mockEvent({ registrationEnabled: true }),
        authenticated: true,
        isRegistered: false,
        loading: true,
      });

      expect(state.buttonText).toBe("Registering…");
      expect(state.buttonDisabled).toBe(true);
    });
  });
});
