import { afterEach, describe, expect, it, vi } from "vitest";
import { login, logout, registerUser, safeUrl } from "@/lib/api";

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
    expect(safeUrl("https://example.com/doc.pdf")).toBe("https://example.com/doc.pdf");
    expect(safeUrl("/uploads/file.png")).toBe("/uploads/file.png");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(safeUrl("")).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
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
});
