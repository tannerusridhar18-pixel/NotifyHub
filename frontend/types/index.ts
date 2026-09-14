export type ApiResponse<T> = { success: boolean; data: T | null; message: string | null };
export type PageResponse<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean };
export type TargetType = "GLOBAL" | "ROLE" | "DEPARTMENT" | "BRANCH" | "SECTION" | "HOSTEL" | "USER";
export type Role = "ADMIN" | "FACULTY" | "STUDENT";
export type Announcement = { id:number; title:string; content:string; urgent:boolean; status:"DRAFT"|"PUBLISHED"|"ARCHIVED"; targetType:TargetType; departmentId:number|null; branchId:number|null; sectionId:number|null; hostelId:number|null; userEmail:string|null; role:Role|null; publishedAt:string|null; createdAt:string; updatedAt:string; authorId:number };
export type EventItem = { id:number; title:string; description:string; location:string; startAt:string; endAt:string; status:"DRAFT"|"PUBLISHED"|"CANCELLED"; targetType:TargetType; departmentId:number|null; branchId:number|null; sectionId:number|null; hostelId:number|null; userEmail:string|null; role:Role|null; publishedAt:string|null; createdAt:string; updatedAt:string; authorId:number };
export type CampusQuery = { id:number; name:string; email:string; department:string; subject:string; message:string; status:"OPEN"|"ANSWERED"; adminResponse:string|null; createdAt:string; answeredAt:string|null };
