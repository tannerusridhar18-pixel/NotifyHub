import { afterEach, describe, expect, it, vi } from "vitest";
import { login, logout, registerUser } from "@/lib/api";

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
});
