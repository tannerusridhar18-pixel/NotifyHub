import type { ApiResponse, Announcement, CampusQuery, EventItem, PageResponse } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (typeof document !== "undefined" && init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase())) {
    const csrf = document.cookie.split("; ").find(value => value.startsWith("XSRF-TOKEN="))?.split("=")[1];
    if (csrf) headers.set("X-XSRF-TOKEN", decodeURIComponent(csrf));
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) throw new Error(body?.message || `Request failed (${response.status})`);
  return body.data as T;
}

export type AuthResponse = { role: "ADMIN" | "FACULTY" | "STUDENT"; mustChangePassword: boolean };
export type CurrentUser = { publicId: string; email: string; role: AuthResponse["role"]; accountStatus: string; student: unknown; faculty: unknown };

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}
export function registerUser(payload: { invitationToken: string; password: string; confirmPassword: string }) {
  return request<{ email: string }>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}
export function refreshSession() { return request<AuthResponse>("/auth/refresh", { method: "POST" }); }
export function currentUser() { return request<CurrentUser>("/users/me"); }
export function logout() { return request<void>("/auth/logout", { method: "POST" }); }
export function forgotPassword(email: string) { return request<void>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }); }
export function resetPassword(token: string, password: string, confirmPassword: string) { return request<void>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password, confirmPassword }) }); }

export async function announcements(params: { page?: number; size?: number; q?: string; category?: string; department?: string } = {}) {
  const q = new URLSearchParams(); q.set("page", String(params.page ?? 0)); q.set("size", String(params.size ?? 12));
  if (params.q) q.set("q", params.q); if (params.category) q.set("category", params.category); if (params.department) q.set("department", params.department);
  return request<PageResponse<Announcement>>(`/announcements?${q}`);
}
export function urgentAnnouncements(page = 0, size = 12) { return request<PageResponse<Announcement>>(`/announcements/urgent?page=${page}&size=${size}`); }
export async function events(params: { page?: number; size?: number; department?: string; upcoming?: boolean } = {}) {
  const q = new URLSearchParams(); q.set("page", String(params.page ?? 0)); q.set("size", String(params.size ?? 12)); if (params.department) q.set("department", params.department);
  return request<PageResponse<EventItem>>(`/events${params.upcoming ? "/upcoming" : ""}?${q}`);
}
export function submitQuery(payload: { name: string; email: string; department: string; subject: string; message: string }) { return request<void>("/queries", { method: "POST", body: JSON.stringify(payload) }); }
export function adminQueries(page = 0, size = 20, status?: "PENDING" | "ANSWERED") { const q = new URLSearchParams({ page: String(page), size: String(size) }); if (status) q.set("status", status); return request<PageResponse<CampusQuery>>(`/queries?${q}`); }
export function answerQuery(id: number, response: string) { return request<CampusQuery>(`/queries/${id}/answer`, { method: "POST", body: JSON.stringify({ response }) }); }
export function createAnnouncement(payload: { title: string; category: string; department: string; content: string; urgent: boolean }) { return request<Announcement>("/announcements", { method: "POST", body: JSON.stringify(payload) }); }
export function updateAnnouncement(id: number, payload: { title: string; category: string; department: string; content: string; urgent: boolean }) { return request<Announcement>(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
export function deleteAnnouncement(id: number) { return request<void>(`/announcements/${id}`, { method: "DELETE" }); }
export function createEvent(payload: { title: string; description: string; department: string; venue: string; startAt: string; endAt: string }) { return request<EventItem>("/events", { method: "POST", body: JSON.stringify(payload) }); }
export function updateEvent(id: number, payload: { title: string; description: string; department: string; venue: string; startAt: string; endAt: string }) { return request<EventItem>(`/events/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
export function deleteEvent(id: number) { return request<void>(`/events/${id}`, { method: "DELETE" }); }

export type StructureDepartment = { id: number; name: string; active: boolean };
export type StructureBranch = { id: number; departmentId: number; name: string; courseNote: string | null; maxYear: number; active: boolean };
export type StructureSection = { id: number; departmentId: number; branchId: number; academicYear: number; name: string; active: boolean };
export type StructureHostel = { id: number; name: string; type: string | null; totalCapacity: number | null; active: boolean };
export type StructureBlock = { id: number; hostelId: number; name: string; capacity: number | null; active: boolean };
export type StructureRoom = { id: number; blockId: number; roomNumber: string; floor: number | null; capacity: number; currentOccupancy: number; active: boolean };
export function structureDepartments() { return request<StructureDepartment[]>("/academic-structure/departments"); }
export function structureBranches() { return request<StructureBranch[]>("/academic-structure/branches"); }
export function structureSections() { return request<StructureSection[]>("/academic-structure/sections"); }
export function createStructureDepartment(name: string) { return request<StructureDepartment>("/academic-structure/departments", { method: "POST", body: JSON.stringify({ name }) }); }
export function createStructureBranch(payload: { departmentId: number; name: string; courseNote?: string; maxYear: number }) { return request<StructureBranch>("/academic-structure/branches", { method: "POST", body: JSON.stringify(payload) }); }
export function createStructureSection(payload: { departmentId: number; branchId: number; academicYear: number; name: string }) { return request<StructureSection>("/academic-structure/sections", { method: "POST", body: JSON.stringify(payload) }); }
export function structureHostels() { return request<StructureHostel[]>("/hostels"); }
export function structureBlocks() { return request<StructureBlock[]>("/hostels/blocks"); }
export function structureRooms() { return request<StructureRoom[]>("/hostels/rooms"); }
export function createStructureHostel(payload: { name: string; type?: string; totalCapacity?: number }) { return request<StructureHostel>("/hostels", { method: "POST", body: JSON.stringify(payload) }); }
export function createStructureBlock(payload: { hostelId: number; name: string; capacity?: number }) { return request<StructureBlock>("/hostels/blocks", { method: "POST", body: JSON.stringify(payload) }); }
export function createStructureRoom(payload: { blockId: number; roomNumber: string; floor?: number; capacity: number }) { return request<StructureRoom>("/hostels/rooms", { method: "POST", body: JSON.stringify(payload) }); }
