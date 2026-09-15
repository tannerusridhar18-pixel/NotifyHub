import type { ApiResponse, Announcement, CampusQuery, EventItem, PageResponse, Role, TargetType } from "@/types";

// Default to the Next.js same-origin proxy. This removes browser CORS problems when
// the UI is opened as localhost:3000 or 127.0.0.1:3000. A full API URL can still
// be supplied for deployments that intentionally use a separate origin.
const API_URL=(process.env.NEXT_PUBLIC_API_URL||"/api/v1").replace(/\/$/,"");
let refreshPromise: Promise<boolean>|null=null;

function csrf(){
  if(typeof document==="undefined") return null;
  const value=document.cookie.split("; ").find(x=>x.startsWith("XSRF-TOKEN="));
  return value?decodeURIComponent(value.split("=").slice(1).join("=")):null;
}

function friendlyMessage(status:number, body:ApiResponse<unknown>|null, path:string){
  if(body?.message) return body.message;
  if(status===400) return "The information could not be saved. Check the highlighted fields and try again.";
  if(status===401||status===403) return "Your session has changed — please log in again.";
  if(status===404) return "That NotifyHub resource could not be found.";
  if(status>=500) return path.includes("/announcements")||path.includes("/events")
    ? "NotifyHub could not save this draft. Check the server and database, then try again."
    : "NotifyHub could not complete that request. Please try again.";
  return `Request failed (${status}). Please try again.`;
}

function isPublicRead(path:string, method:string){
  const cleanPath = path.split("?")[0];
  return (
    (method==="GET" && (cleanPath==="/announcements"||cleanPath==="/announcements/urgent"||cleanPath==="/events"||cleanPath==="/events/upcoming"||cleanPath==="/users/me"||cleanPath==="/queries/my")) ||
    (method==="POST" && cleanPath==="/queries")
  );
}

async function refresh(){
  if(!refreshPromise){
    refreshPromise=(async()=>{
      try{
        const r=await fetch(`${API_URL}/auth/refresh`,{method:"POST",credentials:"include",cache:"no-store"});
        return r.ok;
      }catch{return false;}
    })().finally(()=>{refreshPromise=null;});
  }
  return refreshPromise;
}

async function request<T>(path:string,init:RequestInit={},retry=true):Promise<T>{
  const headers=new Headers(init.headers);
  headers.set("Accept","application/json");
  if(init.body) headers.set("Content-Type","application/json");
  const method=(init.method||"GET").toUpperCase();
  if(!["GET","HEAD","OPTIONS"].includes(method)){
    const token=csrf();
    if(token) headers.set("X-XSRF-TOKEN",token);
  }
  let response:Response;
  try{
    response=await fetch(`${API_URL}${path}`,{...init,headers,credentials:"include",cache:"no-store"});
  }catch{
    throw new Error("NotifyHub cannot reach the server right now. Check that the backend is running, then try again.");
  }
  if(response.status===401&&retry&&!path.startsWith("/auth/")){
    if(await refresh()) return request<T>(path,init,false);
  }
  const body=(await response.json().catch(()=>null)) as ApiResponse<T>|null;
  if(!response.ok||!body?.success){
    if((response.status===401||response.status===403)&&typeof window!=="undefined"&&!path.startsWith("/auth/")&&!isPublicRead(path,method)){
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- force a full session reset after auth mismatch
      window.location.assign(`/auth/login?reason=session-changed`);
    }
    throw new Error(friendlyMessage(response.status,body,path));
  }
  return body.data as T;
}

export type AuthResponse={role:Role;mustChangePassword:boolean};
export type StudentProfile={studentId:string;name:string;departmentId:number;branchId:number;sectionId:number;year:number;semester:number;hosteller:boolean;phone:string|null;personalEmail:string|null};
export type FacultyProfile={facultyId:string;name:string;departmentId:number;phone:string|null;designation:string};
export type CurrentUser={publicId:string;email:string;role:Role;accountStatus:string;student:StudentProfile|null;faculty:FacultyProfile|null};
export const login=(email:string,password:string)=>request<AuthResponse>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
export const registerUser=(payload:{invitationToken:string;password:string;confirmPassword:string})=>request<{email:string}>("/auth/register",{method:"POST",body:JSON.stringify(payload)});
export const refreshSession=()=>request<AuthResponse>("/auth/refresh",{method:"POST"});
export const currentUser=()=>request<CurrentUser>("/users/me");
export const logout=()=>request<void>("/auth/logout",{method:"POST"});
export const forgotPassword=(email:string)=>request<void>("/auth/forgot-password",{method:"POST",body:JSON.stringify({email})});
export type InvitationRequest={email:string;role:Role;profile:{studentId?:string;facultyId?:string;name:string;phone?:string;personalEmail?:string;departmentId?:number;branchId?:number;sectionId?:number;year?:number;semester?:number;batch?:string;hosteller?:boolean;hostelId?:number;blockId?:number;roomId?:number;designation?:string}};
export type InvitationResult={invitationId:string;userPublicId:string;email:string;role:Role;expiresAt:string};
export type InvitationView={invitationId:string;email:string;role:Role;status:"PENDING"|"USED"|"EXPIRED";emailStatus:"PENDING"|"SENT"|"FAILED";expiresAt:string;createdAt:string;usedAt:string|null};
export const createInvitation=(payload:InvitationRequest)=>request<InvitationResult>("/admin/invitations",{method:"POST",body:JSON.stringify(payload)});
export const adminInvitations=()=>request<InvitationView[]>("/admin/invitations");
export const resetPassword=(token:string,password:string,confirmPassword:string)=>request<void>("/auth/reset-password",{method:"POST",body:JSON.stringify({token,password,confirmPassword})});
export async function announcements(params:{page?:number;size?:number;urgent?:boolean}={}){const q=new URLSearchParams({page:String(params.page??0),size:String(params.size??12)});return request<PageResponse<Announcement>>(`/announcements${params.urgent?"/urgent":""}?${q}`);}
export async function events(params:{page?:number;size?:number}={}){const q=new URLSearchParams({page:String(params.page??0),size:String(params.size??12)});return request<PageResponse<EventItem>>(`/events?${q}`);}
export const upcomingEvents=(page=0,size=12)=>{const q=new URLSearchParams({page:String(page),size:String(size)});return request<PageResponse<EventItem>>(`/events/upcoming?${q}`)};
export const submitQuery=(payload:{name:string;email:string;department:string;subject:string;message:string})=>request<void>("/queries",{method:"POST",body:JSON.stringify(payload)});
export const myQueries=(page=0,size=50)=>{const q=new URLSearchParams({page:String(page),size:String(size)});return request<PageResponse<CampusQuery>>(`/queries/my?${q}`)};
export const adminQueries=(page=0,size=50,status?:"OPEN"|"ANSWERED")=>{const q=new URLSearchParams({page:String(page),size:String(size)});if(status)q.set("status",status);return request<PageResponse<CampusQuery>>(`/queries?${q}`)};
export const answerQuery=(id:number,response:string)=>request<CampusQuery>(`/queries/${id}/answer`,{method:"POST",body:JSON.stringify({response})});
export const deleteQuery=(id:number)=>request<void>(`/queries/${id}`,{method:"DELETE"});
export type AnnouncementPayload={title:string;content:string;urgent:boolean;targetType:TargetType;departmentId?:number;branchId?:number;sectionId?:number;hostelId?:number;userEmail?:string;role?:Role};
export type EventPayload={title:string;description:string;location:string;startAt:string;endAt:string;targetType:TargetType;departmentId?:number;branchId?:number;sectionId?:number;hostelId?:number;userEmail?:string;role?:Role};
export const managedAnnouncements=(page=0,size=50)=>{const q=new URLSearchParams({page:String(page),size:String(size)});return request<PageResponse<Announcement>>(`/announcements/management?${q}`)};
export const createAnnouncement=(p:AnnouncementPayload)=>request<Announcement>("/announcements",{method:"POST",body:JSON.stringify(p)});
export const updateAnnouncement=(id:number,p:AnnouncementPayload)=>request<Announcement>(`/announcements/${id}`,{method:"PUT",body:JSON.stringify(p)});
export const publishAnnouncement=(id:number)=>request<Announcement>(`/announcements/${id}/publish`,{method:"POST"});
export const archiveAnnouncement=(id:number)=>request<Announcement>(`/announcements/${id}/archive`,{method:"POST"});
export const unpublishAnnouncement=(id:number)=>request<Announcement>(`/announcements/${id}/unpublish`,{method:"POST"});
export const deleteAnnouncement=(id:number)=>request<void>(`/announcements/${id}`,{method:"DELETE"});
export const managedEvents=(page=0,size=50)=>{const q=new URLSearchParams({page:String(page),size:String(size)});return request<PageResponse<EventItem>>(`/events/management?${q}`)};
export const createEvent=(p:EventPayload)=>request<EventItem>("/events",{method:"POST",body:JSON.stringify(p)});
export const updateEvent=(id:number,p:EventPayload)=>request<EventItem>(`/events/${id}`,{method:"PUT",body:JSON.stringify(p)});
export const publishEvent=(id:number)=>request<EventItem>(`/events/${id}/publish`,{method:"POST"});
export const unpublishEvent=(id:number)=>request<EventItem>(`/events/${id}/unpublish`,{method:"POST"});
export const cancelEvent=(id:number)=>request<EventItem>(`/events/${id}/cancel`,{method:"POST"});
export const deleteEvent=(id:number)=>request<void>(`/events/${id}`,{method:"DELETE"});

export type StructureDepartment={id:number;name:string;active:boolean};
export type StructureBranch={id:number;departmentId:number;name:string;courseNote:string|null;maxYear:number;active:boolean};
export type StructureSection={id:number;departmentId:number;branchId:number;academicYear:number;name:string;active:boolean};
export type StructureHostel={id:number;name:string;type:string|null;totalCapacity:number|null;active:boolean};
export type StructureBlock={id:number;hostelId:number;name:string;capacity:number|null;active:boolean};
export type StructureRoom={id:number;blockId:number;roomNumber:string;floor:number|null;capacity:number;currentOccupancy:number;active:boolean};
export const structureDepartments=()=>request<StructureDepartment[]>("/academic-structure/departments");
export const structureBranches=()=>request<StructureBranch[]>("/academic-structure/branches");
export const structureSections=()=>request<StructureSection[]>("/academic-structure/sections");
export const createStructureDepartment=(name:string)=>request<StructureDepartment>("/academic-structure/departments",{method:"POST",body:JSON.stringify({name})});
export const updateStructureDepartment=(id:number,p:{name:string;active?:boolean})=>request<StructureDepartment>(`/academic-structure/departments/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteStructureDepartment=(id:number)=>request<void>(`/academic-structure/departments/${id}`,{method:"DELETE"});
export const createStructureBranch=(p:{departmentId:number;name:string;courseNote?:string;maxYear:number})=>request<StructureBranch>("/academic-structure/branches",{method:"POST",body:JSON.stringify(p)});
export const updateStructureBranch=(id:number,p:{departmentId:number;name:string;courseNote?:string;maxYear:number;active?:boolean})=>request<StructureBranch>(`/academic-structure/branches/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteStructureBranch=(x:StructureBranch)=>updateStructureBranch(x.id,{departmentId:x.departmentId,name:x.name,courseNote:x.courseNote||undefined,maxYear:x.maxYear,active:false});
export const createStructureSection=(p:{departmentId:number;branchId:number;academicYear:number;name:string})=>request<StructureSection>("/academic-structure/sections",{method:"POST",body:JSON.stringify(p)});
export const updateStructureSection=(id:number,p:{departmentId:number;branchId:number;academicYear:number;name:string;active?:boolean})=>request<StructureSection>(`/academic-structure/sections/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteStructureSection=(x:StructureSection)=>updateStructureSection(x.id,{departmentId:x.departmentId,branchId:x.branchId,academicYear:x.academicYear,name:x.name,active:false});
export const structureHostels=()=>request<StructureHostel[]>("/hostels");
export const structureBlocks=()=>request<StructureBlock[]>("/hostels/blocks");
export const structureRooms=()=>request<StructureRoom[]>("/hostels/rooms");
export const createStructureHostel=(p:{name:string;type?:string;totalCapacity?:number})=>request<StructureHostel>("/hostels",{method:"POST",body:JSON.stringify(p)});
export const updateStructureHostel=(id:number,p:{name:string;type?:string;totalCapacity?:number;active?:boolean})=>request<StructureHostel>(`/hostels/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteStructureHostel=(x:StructureHostel)=>updateStructureHostel(x.id,{name:x.name,type:x.type||undefined,totalCapacity:x.totalCapacity||0,active:false});
export const createStructureBlock=(p:{hostelId:number;name:string;capacity?:number})=>request<StructureBlock>("/hostels/blocks",{method:"POST",body:JSON.stringify(p)});
export const updateStructureBlock=(id:number,p:{hostelId:number;name:string;capacity?:number;active?:boolean})=>request<StructureBlock>(`/hostels/blocks/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteStructureBlock=(x:StructureBlock)=>updateStructureBlock(x.id,{hostelId:x.hostelId,name:x.name,capacity:x.capacity||0,active:false});
export const createStructureRoom=(p:{blockId:number;roomNumber:string;floor?:number;capacity:number})=>request<StructureRoom>("/hostels/rooms",{method:"POST",body:JSON.stringify(p)});
export const updateStructureRoom=(id:number,p:{blockId:number;roomNumber:string;floor?:number;capacity:number;active?:boolean})=>request<StructureRoom>(`/hostels/rooms/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteStructureRoom=(x:StructureRoom)=>updateStructureRoom(x.id,{blockId:x.blockId,roomNumber:x.roomNumber,floor:x.floor||0,capacity:x.capacity,active:false});
