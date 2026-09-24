import type { ApiResponse, Announcement, CampusQuery, EnrollmentItem, EventItem, PageResponse, Role, RoleItem, TargetType, UserListItem } from "@/types";
export type { RoleItem, UserListItem, EnrollmentItem, Role };

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");
let refreshPromise: Promise<boolean> | null = null;

function csrf() {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split("; ").find((x) => x.startsWith("XSRF-TOKEN="));
  return value ? decodeURIComponent(value.split("=").slice(1).join("=")) : null;
}

export function safeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  return undefined;
}

function friendlyMessage(status: number, body: ApiResponse<unknown> | null, path: string) {
  if (body?.message) return body.message;
  if (status === 400) return "The information could not be saved. Check the highlighted fields and try again.";
  if (status === 401) return "Your session has expired — please log in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "That NotifyHub resource could not be found.";
  if (status >= 500)
    return path.includes("/announcements") || path.includes("/events")
      ? "NotifyHub could not save this draft. Check the server and database, then try again."
      : "NotifyHub could not complete that request. Please try again.";
  return `Request failed (${status}). Please try again.`;
}

function isPublicRead(path: string, method: string) {
  const cleanPath = path.split("?")[0];
  return (
    (method === "GET" &&
      (cleanPath === "/announcements" ||
        cleanPath === "/announcements/urgent" ||
        cleanPath === "/events" ||
        cleanPath === "/events/upcoming")) ||
    (method === "POST" && cleanPath === "/queries")
  );
}

async function refresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const headers = new Headers({ Accept: "application/json" });
        const token = csrf();
        if (token) headers.set("X-XSRF-TOKEN", token);
        const r = await fetch(`${API_URL}/auth/refresh`, { method: "POST", headers, credentials: "include", cache: "no-store" });
        return r.ok;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function safeRedirectToLogin(reason = "session-expired") {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (path.startsWith("/auth/") || path === "/admin" || path === "/admin/") {
    return;
  }
  try {
    const last = Number(sessionStorage.getItem("last_auth_redirect") || "0");
    const now = Date.now();
    if (now - last < 5000) {
      return;
    }
    sessionStorage.setItem("last_auth_redirect", String(now));
  } catch {}
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/auth/login?reason=${encodeURIComponent(reason)}`);
}

async function request<T>(
  path: string,
  init: RequestInit & { redirectOn401?: boolean } = {},
  retry = true
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const method = (init.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = csrf();
    if (token) headers.set("X-XSRF-TOKEN", token);
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  } catch {
    throw new Error("NotifyHub cannot reach the server right now. Check that the backend is running, then try again.");
  }
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refresh()) return request<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) {
    if (
      response.status === 401 &&
      init.redirectOn401 !== false &&
      !path.startsWith("/auth/") &&
      !isPublicRead(path, method)
    ) {
      safeRedirectToLogin("session-expired");
    }
    throw new Error(friendlyMessage(response.status, body, path));
  }
  return body.data as T;
}

export type AuthResponse = { role: string; roleId: number | null; roleLevel: number; mustChangePassword: boolean };
export type StudentProfile = {
  studentId: string;
  name: string;
  departmentId: number;
  branchId: number;
  sectionId: number;
  year: number;
  semester: number;
  hosteller: boolean;
  phone: string | null;
  personalEmail: string | null;
};
export type FacultyProfile = {
  facultyId: string;
  name: string;
  departmentId: number;
  phone: string | null;
  designation: string;
  departmentMappings?: import("@/types").FacultyDepartmentMappingItem[];
};
export type CurrentUser = {
  publicId: string;
  email: string;
  role: string;
  roleId: number | null;
  roleLevel: number;
  department: string | null;
  departmentId: number | null;
  accountStatus: string;
  student: StudentProfile | null;
  faculty: FacultyProfile | null;
};

export const login = (email: string, password: string) =>
  request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const registerUser = (payload: { invitationToken: string; password: string; confirmPassword: string }) =>
  request<{ email: string }>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const refreshSession = () => request<AuthResponse>("/auth/refresh", { method: "POST" });
export const currentUser = async (): Promise<CurrentUser | null> => {
  try {
    return await request<CurrentUser>("/users/me", { redirectOn401: false });
  } catch {
    return null;
  }
};
export const logout = () => request<void>("/auth/logout", { method: "POST" });
export const forgotPassword = (email: string) =>
  request<void>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

export type InvitableRole = {
  id: number;
  name: string;
  is_system_role?: boolean;
  isSystemRole?: boolean;
  level?: number;
};

export type InvitationRequest = {
  email: string;
  role?: string | Role;
  roleId?: number;
  departmentId?: number;
  branchId?: number;
  sectionId?: number;
  reportsToId?: number;
  homeDepartmentId?: number;
  subDepartmentIds?: number[];
  profile?: {
    studentId?: string;
    facultyId?: string;
    name: string;
    phone?: string;
    personalEmail?: string;
    departmentId?: number;
    branchId?: number;
    sectionId?: number;
    year?: number;
    semester?: number;
    batch?: string;
    hosteller?: boolean;
    hostelId?: number;
    blockId?: number;
    roomId?: number;
    designation?: string;
  };
};

export type InvitationResult = { invitationId: string; userPublicId: string; email: string; role: string; expiresAt: string };
export type InvitationView = {
  invitationId: string;
  email: string;
  role: string;
  department: string | null;
  status: "PENDING" | "USED" | "EXPIRED";
  emailStatus: "PENDING" | "SENT" | "FAILED";
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
  userPublicId: string | null;
};

export const invitableRoles = () => request<InvitableRole[]>("/roles/invitable");
export const createInvitation = (payload: InvitationRequest) =>
  request<InvitationResult>("/admin/invitations", { method: "POST", body: JSON.stringify(payload) });
export const adminInvitations = () => request<InvitationView[]>("/admin/invitations");
export const resetPassword = (token: string, password: string, confirmPassword: string) =>
  request<void>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password, confirmPassword }) });

export async function announcements(params: { page?: number; size?: number; urgent?: boolean } = {}) {
  const q = new URLSearchParams({ page: String(params.page ?? 0), size: String(params.size ?? 12) });
  return request<PageResponse<Announcement>>(`/announcements${params.urgent ? "/urgent" : ""}?${q}`);
}

export async function myAnnouncements(params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams({ page: String(params.page ?? 0), size: String(params.size ?? 20) });
  return request<PageResponse<Announcement>>(`/announcements/my-posts?${q}`);
}

export async function events(params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams({ page: String(params.page ?? 0), size: String(params.size ?? 12) });
  return request<PageResponse<EventItem>>(`/events?${q}`);
}

export async function myEvents(params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams({ page: String(params.page ?? 0), size: String(params.size ?? 20) });
  return request<PageResponse<EventItem>>(`/events/my-posts?${q}`);
}

export const upcomingEvents = (page = 0, size = 12) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  return request<PageResponse<EventItem>>(`/events/upcoming?${q}`);
};

export const myEventRegistrations = (page = 0, size = 20) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  return request<PageResponse<EventItem>>(`/events/my-registrations?${q}`);
};

export const submitQuery = (payload: { name: string; email: string; department: string; subject: string; message: string }) =>
  request<void>("/queries", { method: "POST", body: JSON.stringify(payload) });
export const myQueries = (page = 0, size = 50) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  return request<PageResponse<CampusQuery>>(`/queries/my?${q}`);
};
export const submitStudentQuery = (payload: { question?: string; subject?: string; message?: string; targetType?: "DEPARTMENT_ADMIN" | "FACULTY"; targetFacultyId?: number }) =>
  request<CampusQuery>("/queries/student", { method: "POST", body: JSON.stringify(payload) });
export const submitFacultyQuery = (payload: { subject: string; message: string }) =>
  request<CampusQuery>("/queries/faculty", { method: "POST", body: JSON.stringify(payload) });
export const facultyQueryInbox = (page = 0, size = 50, status?: string) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) q.set("status", status);
  return request<PageResponse<CampusQuery>>(`/queries/faculty-inbox?${q}`);
};
export const scopedQueries = (status?: "OPEN" | "ANSWERED" | "CLOSED") => {
  const q = new URLSearchParams(); if (status) q.set("status", status); return request<PageResponse<CampusQuery>>(`/queries?${q}`);
};
export const answerScopedQuery = (id: number, response: string) => request<CampusQuery>(`/queries/${id}/answer`, { method: "PATCH", body: JSON.stringify({ response }) });
export const adminQueries = (page = 0, size = 50, status?: "OPEN" | "ANSWERED") => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) q.set("status", status);
  return request<PageResponse<CampusQuery>>(`/queries?${q}`);
};
export const answerQuery = (id: number, response: string) =>
  request<CampusQuery>(`/queries/${id}/answer`, { method: "POST", body: JSON.stringify({ response }) });
export const deleteQuery = (id: number) => request<void>(`/queries/${id}`, { method: "DELETE" });

export type AnnouncementPayload = {
  title: string;
  content: string;
  urgent: boolean;
  targetType: TargetType;
  departmentId?: number;
  branchId?: number;
  sectionId?: number;
  hostelId?: number;
  userEmail?: string;
  role?: Role;
  recipientType?: string;
  recipientTargets?: string;
  attachmentUrl?: string;
  attachmentName?: string;
};

export type EventPayload = {
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  targetType: TargetType;
  departmentId?: number;
  branchId?: number;
  sectionId?: number;
  hostelId?: number;
  userEmail?: string;
  role?: Role;
  recipientType?: string;
  recipientTargets?: string;
  photoUrl?: string;
  externalLink?: string;
  registrationEnabled?: boolean;
  registrationDeadline?: string;
};

export const managedAnnouncements = (page = 0, size = 50) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  return request<PageResponse<Announcement>>(`/announcements/management?${q}`);
};
export const createAnnouncement = (p: AnnouncementPayload) =>
  request<Announcement>("/announcements", { method: "POST", body: JSON.stringify(p) });
export const updateAnnouncement = (id: number, p: AnnouncementPayload) =>
  request<Announcement>(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const publishAnnouncement = (id: number) => request<Announcement>(`/announcements/${id}/publish`, { method: "POST" });
export const archiveAnnouncement = (id: number) => request<Announcement>(`/announcements/${id}/archive`, { method: "POST" });
export const unpublishAnnouncement = (id: number) => request<Announcement>(`/announcements/${id}/unpublish`, { method: "POST" });
export const deleteAnnouncement = (id: number) => request<void>(`/announcements/${id}`, { method: "DELETE" });

export const managedEvents = (page = 0, size = 50) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  return request<PageResponse<EventItem>>(`/events/management?${q}`);
};
export const createEvent = (p: EventPayload) => request<EventItem>("/events", { method: "POST", body: JSON.stringify(p) });
export const updateEvent = (id: number, p: EventPayload) => request<EventItem>(`/events/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const publishEvent = (id: number) => request<EventItem>(`/events/${id}/publish`, { method: "POST" });
export const unpublishEvent = (id: number) => request<EventItem>(`/events/${id}/unpublish`, { method: "POST" });
export const cancelEvent = (id: number) => request<EventItem>(`/events/${id}/cancel`, { method: "POST" });
export const deleteEvent = (id: number) => request<void>(`/events/${id}`, { method: "DELETE" });
export type EventRegistration = { id: number; studentId: number; studentEmail: string; studentName: string; department: string | null; year: number | null; section: string | null; registeredAt: string };
export const registerForEvent = (id: number) => request<EventRegistration>(`/events/${id}/register`, { method: "POST" });
export const eventRegistrations = (id: number) => request<EventRegistration[]>(`/events/${id}/registrations`);
export const eventRegistrationExportUrl = (id: number) => `${API_URL}/events/${id}/registrations/export`;

// Department Leadership & Governance APIs
export type DepartmentFacultyItem = {
  id: number;
  facultyId: string;
  name: string;
  designation: string;
  departmentId: number;
  departmentName: string;
  relationship: "HOME" | "SUB" | "GUEST";
  userId?: number;
  email?: string;
};

export const departmentFacultyList = (departmentId: number) =>
  request<DepartmentFacultyItem[]>(`/departments/${departmentId}/faculty`);

export const departmentStudentList = (departmentId: number) =>
  request<import("@/types").DepartmentStudentItem[]>(`/departments/${departmentId}/students`);

export const updateDepartmentStudent = (departmentId: number, studentId: number, payload: { name?: string; year?: number; semester?: number }) =>
  request<import("@/types").DepartmentStudentItem>(`/departments/${departmentId}/students/${studentId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deactivateDepartmentStudent = (departmentId: number, studentId: number) =>
  request<void>(`/departments/${departmentId}/students/${studentId}/status`, { method: "PATCH" });

export const batchPromoteStudents = (departmentId: number, fromYear: number, toYear: number) =>
  request<import("@/types").BatchPromoteResult>(`/departments/${departmentId}/promote-batch`, {
    method: "POST",
    body: JSON.stringify({ fromYear, toYear }),
  });

export const assignDepartmentHod = (departmentId: number, userId: number) =>
  request<{ success: boolean; message: string }>(`/departments/${departmentId}/assign-hod`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

export const reassignStudentSection = (departmentId: number, studentId: number, sectionId: number) =>
  request<{ success: boolean; message: string }>(`/departments/${departmentId}/students/reassign-section`, {
    method: "POST",
    body: JSON.stringify({ studentId, sectionId }),
  });

export const departmentAnalytics = (departmentId: number) =>
  request<import("@/types").DepartmentAnalytics>(`/departments/${departmentId}/analytics`);

export const campusOverview = () =>
  request<import("@/types").CampusOverviewDepartment[]>("/departments/campus-overview");

export const departmentStudents = (departmentId: number) =>
  request<Array<{ id: number; studentId: string; name: string; email: string; year: number; semester: number; branchId: number; branchName: string; sectionId: number; sectionName: string }>>(`/departments/${departmentId}/students`);


// Role Management
export const listRoles = () => request<RoleItem[]>("/admin/roles");
export const createRole = (p: { name: string; level: number; parentRoleId?: number; canPostTo?: number[] }) =>
  request<RoleItem>("/admin/roles", { method: "POST", body: JSON.stringify(p) });
export const updateRole = (id: number, p: { name?: string; level?: number; parentRoleId?: number; canPostTo?: number[] }) =>
  request<RoleItem>(`/admin/roles/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const RBAC_PERMISSIONS = ["USER_INVITE", "USER_EDIT", "USER_DELETE", "ANNOUNCEMENT_CREATE", "ANNOUNCEMENT_DELETE", "EVENT_CREATE", "EVENT_DELETE", "ROLE_CREATE", "ROLE_ASSIGN", "ROLE_EDIT", "ROLE_REVOKE"] as const;
export type RbacPermission = typeof RBAC_PERMISSIONS[number];
export type ScopedRole = { id: number; name: string; systemRole: boolean; superadmin: boolean; permissions: RbacPermission[] };
export type RoleAssignment = { id: number; userId: number; userEmail: string; roleId: number; scopeType: "GLOBAL" | "DEPARTMENT" | "SECTION"; scopeId: number | null };
export const createScopedRole = (p: { name: string; permissions: RbacPermission[] }) => request<ScopedRole>("/roles", { method: "POST", body: JSON.stringify(p) });
export const editScopedRole = (id: number, permissions: RbacPermission[]) => request<ScopedRole>(`/roles/${id}`, { method: "PATCH", body: JSON.stringify({ permissions }) });
export const roleAssignments = (id: number) => request<RoleAssignment[]>(`/roles/${id}/assignments`);
export const assignScopedRole = (id: number, p: { userId: number; scopeType: "GLOBAL" | "DEPARTMENT" | "SECTION"; scopeId?: number }) => request<RoleAssignment>(`/roles/${id}/assign`, { method: "POST", body: JSON.stringify(p) });
export const revokeRoleAssignment = (id: number) => request<void>(`/user-role-assignments/${id}`, { method: "DELETE" });

// User Management
export const listAdminUsers = (params: { search?: string; role?: string; departmentId?: number; status?: string; page?: number; size?: number } = {}) => {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.role) q.set("role", params.role);
  if (params.departmentId) q.set("departmentId", String(params.departmentId));
  if (params.status) q.set("status", params.status);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 50));
  return request<PageResponse<UserListItem>>(`/admin/users?${q}`);
};
export const queryUsersByFilters = (filters: Record<string, string>, page = 0, size = 50) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  Object.entries(filters).forEach(([key, value]) => { if (value) q.set(`filter[${key}]`, value); });
  return request<PageResponse<UserListItem>>(`/users?${q}`);
};
export const createAdminUser = (p: { email: string; password?: string; role?: string; roleId?: number; departmentId?: number; branchId?: number; reportsToId?: number; status?: string; mustChangePassword?: boolean }) =>
  request<UserListItem>("/admin/users", { method: "POST", body: JSON.stringify(p) });
export const updateAdminUser = (publicId: string, p: { role?: string; roleId?: number; departmentId?: number; branchId?: number; reportsToId?: number; status?: string; password?: string }) =>
  request<UserListItem>(`/admin/users/${publicId}`, { method: "PUT", body: JSON.stringify(p) });
export const removeAdminUser = (publicId: string) => request<void>(`/admin/users/${publicId}`, { method: "DELETE" });
export const adminEnrollments = () => request<EnrollmentItem[]>("/admin/users/enrollments");

// Academic and Hostel Structures
export type StructureDepartment = { id: number; name: string; active: boolean };
export type StructureBranch = { id: number; departmentId: number; name: string; courseNote: string | null; maxYear: number; active: boolean };
export type StructureSection = { id: number; departmentId: number; branchId: number; academicYear: number; name: string; active: boolean };
export type StructureHostel = { id: number; name: string; type: string | null; totalCapacity: number | null; active: boolean };
export type StructureBlock = { id: number; hostelId: number; name: string; capacity: number | null; active: boolean };
export type StructureRoom = { id: number; blockId: number; roomNumber: string; floor: number | null; capacity: number; currentOccupancy: number; active: boolean };

export const structureDepartments = () => request<StructureDepartment[]>("/academic-structure/departments");
export const structureBranches = () => request<StructureBranch[]>("/academic-structure/branches");
export const structureSections = () => request<StructureSection[]>("/academic-structure/sections");
export const createStructureDepartment = (name: string) =>
  request<StructureDepartment>("/academic-structure/departments", { method: "POST", body: JSON.stringify({ name }) });
export const updateStructureDepartment = (id: number, p: { name: string; active?: boolean }) =>
  request<StructureDepartment>(`/academic-structure/departments/${id}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteStructureDepartment = (id: number) => request<void>(`/academic-structure/departments/${id}`, { method: "DELETE" });
export const createStructureBranch = (p: { departmentId: number; name: string; courseNote?: string; maxYear: number }) =>
  request<StructureBranch>("/academic-structure/branches", { method: "POST", body: JSON.stringify(p) });
export const updateStructureBranch = (id: number, p: { departmentId: number; name: string; courseNote?: string; maxYear: number; active?: boolean }) =>
  request<StructureBranch>(`/academic-structure/branches/${id}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteStructureBranch = (x: StructureBranch) =>
  updateStructureBranch(x.id, { departmentId: x.departmentId, name: x.name, courseNote: x.courseNote || undefined, maxYear: x.maxYear, active: false });
export const createStructureSection = (p: { departmentId: number; branchId: number; academicYear: number; name: string }) =>
  request<StructureSection>("/academic-structure/sections", { method: "POST", body: JSON.stringify(p) });
export const updateStructureSection = (id: number, p: { departmentId: number; branchId: number; academicYear: number; name: string; active?: boolean }) =>
  request<StructureSection>(`/academic-structure/sections/${id}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteStructureSection = (x: StructureSection) =>
  updateStructureSection(x.id, { departmentId: x.departmentId, branchId: x.branchId, academicYear: x.academicYear, name: x.name, active: false });
export const structureHostels = () => request<StructureHostel[]>("/hostels");
export const structureBlocks = () => request<StructureBlock[]>("/hostels/blocks");
export const structureRooms = () => request<StructureRoom[]>("/hostels/rooms");
export const createStructureHostel = (p: { name: string; type?: string; totalCapacity?: number }) =>
  request<StructureHostel>("/hostels", { method: "POST", body: JSON.stringify(p) });
export const updateStructureHostel = (id: number, p: { name: string; type?: string; totalCapacity?: number; active?: boolean }) =>
  request<StructureHostel>(`/hostels/${id}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteStructureHostel = (x: StructureHostel) =>
  updateStructureHostel(x.id, { name: x.name, type: x.type || undefined, totalCapacity: x.totalCapacity || 0, active: false });
export const createStructureBlock = (p: { hostelId: number; name: string; capacity?: number }) =>
  request<StructureBlock>("/hostels/blocks", { method: "POST", body: JSON.stringify(p) });
export const updateStructureBlock = (id: number, p: { hostelId: number; name: string; capacity?: number; active?: boolean }) =>
  request<StructureBlock>(`/hostels/blocks/${id}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteStructureBlock = (x: StructureBlock) =>
  updateStructureBlock(x.id, { hostelId: x.hostelId, name: x.name, capacity: x.capacity || 0, active: false });
export const createStructureRoom = (p: { blockId: number; roomNumber: string; floor?: number; capacity: number }) =>
  request<StructureRoom>("/hostels/rooms", { method: "POST", body: JSON.stringify(p) });
export const updateStructureRoom = (id: number, p: { blockId: number; roomNumber: string; floor?: number; capacity: number; active?: boolean }) =>
  request<StructureRoom>(`/hostels/rooms/${id}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteStructureRoom = (x: StructureRoom) =>
  updateStructureRoom(x.id, { blockId: x.blockId, roomNumber: x.roomNumber, floor: x.floor || 0, capacity: x.capacity, active: false });
