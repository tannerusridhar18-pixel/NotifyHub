import { afterEach, describe, expect, it, vi } from "vitest";
import { login, logout, myEventRegistrations, registerUser, safeUrl, submitStudentQuery } from "@/lib/api";

afterEach(() => vi.restoreAllMocks());

describe("Phase 1 authentication API contract", () => {
  it("sends email/password and includes cookies for login", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { role: "STUDENT", mustChangePassword: false }, message: null }), { status: 200 }));
    await login("student@example.edu", "Password1");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/auth/login"), expect.objectContaining({ credentials: "include", body: JSON.stringify({ email: "student@example.edu", password: "Password1" }) }));
  });

  it("sends only invitation credentials during registration", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { email: "student@example.edu" }, message: null }), { status: 201 }));
    await registerUser({ invitationToken: "invite", password: "Password1", confirmPassword: "Password1" });
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ body: JSON.stringify({ invitationToken: "invite", password: "Password1", confirmPassword: "Password1" }) }));
  });

  it("logs out without accepting a client refresh token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: null, message: "Logged out." }), { status: 200 }));
    await logout();
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ credentials: "include", method: "POST" }));
  });

  it("sanitizes user URLs safely", () => {
    // Legitimate absolute URLs
    expect(safeUrl("https://example.com/doc.pdf")).toBe("https://example.com/doc.pdf");
    expect(safeUrl("http://localhost:3000/campus/feed")).toBe("http://localhost:3000/campus/feed");
    expect(safeUrl("https://notifyhub.edu/events?id=42#details")).toBe("https://notifyhub.edu/events?id=42#details");

    // Legitimate relative paths
    expect(safeUrl("/uploads/file.png")).toBe("/uploads/file.png");
    expect(safeUrl("/announcements/123")).toBe("/announcements/123");

    // Protocol-relative URLs (must be rejected)
    expect(safeUrl("//evil.com")).toBeUndefined();
    expect(safeUrl("//evil.com/path")).toBeUndefined();
    expect(safeUrl("///evil.com")).toBeUndefined();
    expect(safeUrl("////evil.com")).toBeUndefined();

    // Backslash variants (must be rejected)
    expect(safeUrl("/\\evil.com")).toBeUndefined();
    expect(safeUrl("\\evil.com")).toBeUndefined();
    expect(safeUrl("\\\\evil.com")).toBeUndefined();
    expect(safeUrl("/\\evil.com/test")).toBeUndefined();
    expect(safeUrl("/uploads\\file.png")).toBeUndefined();

    // Unsafe schemes (must be rejected)
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("javascript:void(0)")).toBeUndefined();
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(safeUrl("vbscript:msgbox(1)")).toBeUndefined();
    expect(safeUrl("file:///etc/passwd")).toBeUndefined();
    expect(safeUrl("blob:https://example.com/uuid")).toBeUndefined();

    // Empty, whitespace, control characters, malformed
    expect(safeUrl("")).toBeUndefined();
    expect(safeUrl("   ")).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
    expect(safeUrl("http://")).toBeUndefined();
    expect(safeUrl("https://")).toBeUndefined();
    expect(safeUrl("https://example.com/\u0000bad")).toBeUndefined();
    expect(safeUrl("https://example.com/has space")).toBeUndefined();
  });

  it("uses the backend student query field and maps registrations returned as a list", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).includes("/queries/student")) {
        expect(init?.body).toBe(JSON.stringify({ question: "Where is the lab?", subject: "Lab access" }));
        return new Response(JSON.stringify({ success: true, data: { id: 1 }, message: null }), { status: 201 });
      }
      return new Response(JSON.stringify({
        success: true,
        data: [{ registrationId: 4, eventId: 8, title: "Workshop", description: "Details", location: "Hall", startAt: "2026-10-20T10:00:00Z", endAt: "2026-10-20T11:00:00Z", status: "PUBLISHED", registeredAt: "2026-10-16T10:00:00Z" }],
        message: null,
      }), { status: 200 });
    });

    await submitStudentQuery({ question: "Where is the lab?", subject: "Lab access" });
    const registrations = await myEventRegistrations();
    expect(registrations.content[0]).toMatchObject({ id: 8, title: "Workshop" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("replays request successfully when access token is expired but refresh token is valid", async () => {
    let callCount = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      callCount++;
      const urlStr = String(url);
      if (urlStr.includes("/users/me") && callCount === 1) {
        return new Response(JSON.stringify({ success: false, data: null, message: "Authentication required." }), { status: 401 });
      }
      if (urlStr.includes("/auth/refresh")) {
        return new Response(JSON.stringify({ success: true, data: { role: "ADMIN", roleLevel: 0, mustChangePassword: false }, message: null }), { status: 200 });
      }
      if (urlStr.includes("/users/me") && callCount === 3) {
        return new Response(JSON.stringify({ success: true, data: { email: "admin@notifyhub.local", role: "ADMIN", roleLevel: 0 }, message: null }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });

    const { currentUser } = await import("@/lib/api");
    const user = await currentUser();
    expect(user?.email).toBe("admin@notifyhub.local");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/auth/refresh"), expect.anything());
  });

  it("currentUser returns null without redirecting on 401", async () => {
    const assignMock = vi.fn();
    Object.defineProperty(globalThis, "window", {
      value: { location: { assign: assignMock, pathname: "/dashboard/student" } },
      writable: true,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, data: null, message: "Authentication required." }), { status: 401 })
    );

    const { currentUser } = await import("@/lib/api");
    const user = await currentUser();
    expect(user).toBeNull();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("redirects to login when protected request receives 401 and refresh fails", async () => {
    const assignMock = vi.fn();
    Object.defineProperty(globalThis, "window", {
      value: { location: { assign: assignMock, pathname: "/dashboard/student" } },
      writable: true,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/refresh")) {
        return new Response(JSON.stringify({ success: false, data: null, message: "Session expired." }), { status: 401 });
      }
      return new Response(JSON.stringify({ success: false, data: null, message: "Authentication required." }), { status: 401 });
    });

    const { myAnnouncements } = await import("@/lib/api");
    await expect(myAnnouncements()).rejects.toThrow();
    expect(assignMock).toHaveBeenCalledWith(expect.stringContaining("/auth/login?reason=session-expired"));
  });

  it("deduplicates concurrent in-flight currentUser requests", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/users/me")) {
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        return new Response(
          JSON.stringify({ success: true, data: { email: "user@notifyhub.local", role: "STUDENT", roleLevel: 5 }, message: null }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    });

    const { currentUser } = await import("@/lib/api");
    const [u1, u2, u3] = await Promise.all([currentUser(), currentUser(), currentUser()]);
    expect(callCount).toBe(1);
    expect(u1?.email).toBe("user@notifyhub.local");
    expect(u2?.email).toBe("user@notifyhub.local");
    expect(u3?.email).toBe("user@notifyhub.local");
  });

  it("requests department-scoped events for Department Admin", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { content: [], totalElements: 0, totalPages: 0, size: 50, number: 0 }, message: null }), { status: 200 })
    );

    const { departmentManagedEvents } = await import("@/lib/api");
    await departmentManagedEvents(0, 50);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/events/department-management?page=0&size=50"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("requests global managed events for Super Admin", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 }, message: null }), { status: 200 })
    );

    const { managedEvents } = await import("@/lib/api");
    await managedEvents(0, 20);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/events/management?page=0&size=20"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("requests event attendee registrations by event ID", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              studentId: "STU-101",
              studentEmail: "student@example.edu",
              studentName: "John Doe",
              department: "Computer Science",
              year: 3,
              section: "A",
              registeredAt: "2026-10-17T12:00:00Z",
            },
          ],
          message: null,
        }),
        { status: 200 }
      )
    );

    const { eventRegistrations } = await import("@/lib/api");
    const list = await eventRegistrations(42);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/events/42/registrations"),
      expect.objectContaining({ credentials: "include" })
    );
    expect(list).toHaveLength(1);
    expect(list[0].studentName).toBe("John Doe");
    expect(list[0].studentId).toBe("STU-101");
  });

  it("createEvent sends draft payload and returns draft event", async () => {
    const draftResponse = {
      id: 55,
      title: "Draft Hackathon",
      description: "Description",
      location: "Hall 1",
      startAt: "2026-11-01T10:00:00Z",
      endAt: "2026-11-01T12:00:00Z",
      status: "DRAFT",
      targetType: "GLOBAL",
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: draftResponse, message: null }), { status: 201 })
    );

    const { createEvent } = await import("@/lib/api");
    const result = await createEvent({
      title: "Draft Hackathon",
      description: "Description",
      location: "Hall 1",
      startAt: "2026-11-01T10:00:00Z",
      endAt: "2026-11-01T12:00:00Z",
      targetType: "GLOBAL",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/events"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Draft Hackathon"),
      })
    );
    expect(result.status).toBe("DRAFT");
    expect(result.id).toBe(55);
  });

  it("updateEvent sends updated draft payload to /events/{id}", async () => {
    const updatedResponse = {
      id: 55,
      title: "Updated Hackathon",
      description: "Updated description",
      location: "Hall 1",
      startAt: "2026-11-01T10:00:00Z",
      endAt: "2026-11-01T12:00:00Z",
      status: "DRAFT",
      targetType: "GLOBAL",
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: updatedResponse, message: null }), { status: 200 })
    );

    const { updateEvent } = await import("@/lib/api");
    const result = await updateEvent(55, {
      title: "Updated Hackathon",
      description: "Updated description",
      location: "Hall 1",
      startAt: "2026-11-01T10:00:00Z",
      endAt: "2026-11-01T12:00:00Z",
      targetType: "GLOBAL",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/events/55"),
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("Updated Hackathon"),
      })
    );
    expect(result.title).toBe("Updated Hackathon");
    expect(result.status).toBe("DRAFT");
  });

  it("fetches event directly by id via getEvent", async () => {
    const { getEvent } = await import("@/lib/api");
    const mockEvent = {
      id: 99,
      title: "Science Fair",
      description: "Science Fair projects",
      location: "Auditorium",
      startAt: "2026-11-10T10:00:00Z",
      endAt: "2026-11-10T12:00:00Z",
      status: "PUBLISHED",
      photoUrl: "https://example.com/photo.jpg",
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: mockEvent, message: null }), { status: 200 })
    );

    const event = await getEvent(99);
    expect(event.id).toBe(99);
    expect(event.photoUrl).toBe("https://example.com/photo.jpg");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/events/99"), expect.anything());
  });

  it("falls back to public events list when getEvent by id fails due to unauthenticated session", async () => {
    const { getEvent } = await import("@/lib/api");
    const mockUpcoming = {
      content: [
        {
          id: 101,
          title: "Robotics Expo",
          description: "Robotics showcases",
          location: "Robotics Lab",
          startAt: "2026-11-12T10:00:00Z",
          endAt: "2026-11-12T12:00:00Z",
          status: "PUBLISHED",
          photoUrl: "https://example.com/robot.jpg",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/events/101")) {
        return new Response(JSON.stringify({ success: false, data: null, message: "Authentication required." }), { status: 401 });
      }
      if (urlStr.includes("/events/upcoming")) {
        return new Response(JSON.stringify({ success: true, data: mockUpcoming, message: null }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, data: { content: [] }, message: null }), { status: 200 });
    });

    const event = await getEvent(101);
    expect(event.id).toBe(101);
    expect(event.title).toBe("Robotics Expo");
    expect(event.photoUrl).toBe("https://example.com/robot.jpg");
  });

  it("createInvitation requests /admin/invitations and returns delivery status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            invitationId: "inv-123",
            userPublicId: "usr-456",
            email: "invited@example.edu",
            role: "STUDENT",
            expiresAt: "2026-10-19T12:00:00Z",
            emailStatus: "SENT",
            emailError: null,
          },
          message: null,
        }),
        { status: 201 }
      )
    );

    const { createInvitation } = await import("@/lib/api");
    const result = await createInvitation({
      email: "invited@example.edu",
      role: "STUDENT",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/invitations"),
      expect.objectContaining({ method: "POST", body: expect.stringContaining("invited@example.edu") })
    );
    expect(result.invitationId).toBe("inv-123");
    expect(result.emailStatus).toBe("SENT");
  });

  it("resendInvitation calls /admin/invitations/{id}/resend", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            invitationId: "inv-123",
            userPublicId: "usr-456",
            email: "invited@example.edu",
            role: "STUDENT",
            expiresAt: "2026-10-19T12:00:00Z",
            emailStatus: "SENT",
            emailError: null,
          },
          message: null,
        }),
        { status: 200 }
      )
    );

    const { resendInvitation } = await import("@/lib/api");
    const result = await resendInvitation("inv-123");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/invitations/inv-123/resend"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.emailStatus).toBe("SENT");
  });

  it("deleteInvitation calls DELETE /admin/invitations/{id}", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: null,
        }),
        { status: 200 }
      )
    );

    const { deleteInvitation } = await import("@/lib/api");
    await deleteInvitation("inv-123");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/invitations/inv-123"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

