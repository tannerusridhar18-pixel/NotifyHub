import type { ApiResponse, Announcement, CampusQuery, EventItem, PageResponse, AuthResult } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/$/, "");

function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("notifyhub_access_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const accessToken = token();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  return body.data as T;
}

export async function login(email: string, password: string) {
  return request<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role: "STUDENT" | "FACULTY";
  department: string;
}) {
  return request<unknown>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout(refreshToken: string) {
  return request<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function announcements(params: {
  page?: number; size?: number; q?: string; category?: string; department?: string;
} = {}) {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 12));
  if (params.q) q.set("q", params.q);
  if (params.category) q.set("category", params.category);
  if (params.department) q.set("department", params.department);
  return request<PageResponse<Announcement>>(`/announcements?${q}`);
}

export async function urgentAnnouncements(page = 0, size = 12) {
  return request<PageResponse<Announcement>>(`/announcements/urgent?page=${page}&size=${size}`);
}

export async function events(params: { page?: number; size?: number; department?: string; upcoming?: boolean } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 12));
  if (params.department) q.set("department", params.department);
  return request<PageResponse<EventItem>>(`/events${params.upcoming ? "/upcoming" : ""}?${q}`);
}

export async function submitQuery(payload: {
  name: string; email: string; department: string; subject: string; message: string;
}) {
  return request<void>("/queries", { method: "POST", body: JSON.stringify(payload) });
}

export async function adminQueries(page = 0, size = 20, status?: "PENDING" | "ANSWERED") {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) q.set("status", status);
  return request<PageResponse<CampusQuery>>(`/queries?${q}`);
}

export async function answerQuery(id: number, response: string) {
  return request<CampusQuery>(`/queries/${id}/answer`, {
    method: "POST",
    body: JSON.stringify({ response }),
  });
}

export async function createAnnouncement(payload: {
  title: string; category: string; department: string; content: string; urgent: boolean;
}) {
  return request<Announcement>("/announcements", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateAnnouncement(id: number, payload: {
  title: string; category: string; department: string; content: string; urgent: boolean;
}) {
  return request<Announcement>(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteAnnouncement(id: number) {
  return request<void>(`/announcements/${id}`, { method: "DELETE" });
}

export async function createEvent(payload: {
  title: string; description: string; department: string; venue: string; startAt: string; endAt: string;
}) {
  return request<EventItem>("/events", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateEvent(id: number, payload: {
  title: string; description: string; department: string; venue: string; startAt: string; endAt: string;
}) {
  return request<EventItem>(`/events/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteEvent(id: number) {
  return request<void>(`/events/${id}`, { method: "DELETE" });
}
