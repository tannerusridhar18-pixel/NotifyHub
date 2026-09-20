export type ApiResponse<T> = { success: boolean; data: T | null; message: string | null };
export type PageResponse<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean };
export type TargetType = "GLOBAL" | "ROLE" | "DEPARTMENT" | "BRANCH" | "SECTION" | "HOSTEL" | "USER";
export type Role = "SUPER_ADMIN" | "ADMIN" | "PRINCIPAL" | "DEAN" | "HOD" | "FACULTY" | "STUDENT" | string;

export type RoleItem = {
  id: number;
  name: string;
  level: number;
  parentRoleId: number | null;
  parentRoleName: string | null;
  createdBy: string | null;
  canPostTo: number[];
  createdAt: string;
  updatedAt: string;
};

export type UserListItem = {
  id: number;
  publicId: string;
  username: string;
  email: string;
  role: string;
  roleId: number | null;
  level: number;
  department: string | null;
  departmentId: number | null;
  branchId: number | null;
  reportsToId: number | null;
  reportsToEmail: string | null;
  status: "ACTIVE" | "INACTIVE" | "INVITED" | "LOCKED" | string;
  active: boolean;
  createdAt: string;
};

export type EnrollmentItem = {
  invitationId: string;
  userPublicId: string;
  email: string;
  role: string;
  level: number;
  department: string | null;
  invitedAt: string;
  registeredAt: string;
  status: string;
};

export type Announcement = {
  id: number;
  title: string;
  content: string;
  urgent: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  targetType: TargetType;
  departmentId: number | null;
  branchId: number | null;
  sectionId: number | null;
  hostelId: number | null;
  userEmail: string | null;
  role: Role | null;
  recipientType?: string;
  recipientTargets?: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  authorRole?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
};

export type EventItem = {
  id: number;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  targetType: TargetType;
  departmentId: number | null;
  branchId: number | null;
  sectionId: number | null;
  hostelId: number | null;
  userEmail: string | null;
  role: Role | null;
  recipientType?: string;
  recipientTargets?: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  authorRole?: string;
  photoUrl?: string | null;
  externalLink?: string | null;
  registrationEnabled?: boolean;
  registrationDeadline?: string | null;
};

export type CampusQuery = {
  id: number;
  name: string;
  email: string;
  department: string;
  subject: string;
  message: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  adminResponse: string | null;
  createdAt: string;
  answeredAt: string | null;
  studentId?: number | null;
  departmentId?: number | null;
  question?: string | null;
  answer?: string | null;
  targetType?: "DEPARTMENT_ADMIN" | "FACULTY" | null;
  targetFacultyId?: number | null;
  targetFacultyName?: string | null;
  askerType?: "STUDENT" | "FACULTY" | null;
  askerId?: number | null;
};

export type FacultyDepartmentMappingItem = {
  id: number;
  facultyProfileId: number;
  departmentId: number;
  departmentName: string;
  relationship: "HOME" | "SUB" | "GUEST";
};

export type DepartmentAnalytics = {
  departmentId: number;
  departmentName: string;
  totalStudents: number;
  totalFaculty: number;
  totalBranches: number;
  totalSections: number;
  activeAnnouncements: number;
  activeEvents: number;
  openQueries: number;
  answeredQueries: number;
};

export type CampusOverviewDepartment = {
  departmentId: number;
  departmentName: string;
  hodName: string | null;
  hodEmail: string | null;
  totalStudents: number;
  totalFaculty: number;
  openQueries: number;
  activeAnnouncements: number;
};

export type BatchPromoteResult = {
  promotedCount: number;
  graduatedCount: number;
  message: string;
  warnings?: string[];
};

