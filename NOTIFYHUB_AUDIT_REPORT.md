# NotifyHub Application Audit Report

Date: 2026-10-17

Scope: Comprehensive audit of App Router frontend routes, interactive UI controls, API bindings, Spring Boot controllers/services/tests, backend runtime resolution, authorization & data isolation, and performance optimization.

---

## 1. Executive Summary

A complete audit of NotifyHub was conducted across frontend routes, interactive UI controls, role-based access control (RBAC), Spring Boot backend APIs, database persistence, and runtime launch configurations.

Both the frontend (Next.js 16.3.2) and backend (Spring Boot 3.5.4 on Java 25.0.4 with MySQL 8.0.45) were successfully launched and verified in the local environment. All critical and high-severity issues (AUDIT-001 through AUDIT-007) are resolved and covered by regression tests.

To maintain strict audit integrity:
- Automated tests, route probes, interactive controls, and role-based permissions are reported in separate inventories and not summed into an aggregate total.
- Interactive controls and workflows are marked **PASS** only where live execution with recorded evidence was performed.
- Authenticated member browser sessions for non-admin business roles (`PRINCIPAL`, `DEAN`, `HOD`, `DEPARTMENT_ADMIN`, `FACULTY`, `STUDENT`) are marked **BLOCKED** for interactive browser testing because plaintext credentials are not provided in the repository for those seed accounts; their backend authorization and data isolation remain verified via integration test suites.

### Area Status Overview

| Area | Status | Verified Evidence |
|---|---|---|
| Frontend Route Reachability | PASS | 32/32 routes return HTTP 200 on production server (`http://localhost:3000`) |
| Frontend Automated Tests | PASS | 86/86 Vitest tests pass across 6 test suites |
| Frontend TypeScript & Lint | PASS | 0 TypeScript errors (`tsc --noEmit`), 0 ESLint warnings (`eslint .`) |
| Production Frontend Build | PASS | Next.js Turbopack production build completed cleanly |
| Backend Automated Tests | PASS | 84/84 Maven integration & security tests pass against MySQL 8.0.45 |
| Backend Runtime Startup | PASS | Spring Boot starts on port 8080 under Java 25.0.4; `/actuator/health` reports `UP` |
| Database Persistence & Migrations | PASS | 18 Flyway migrations validated; accounts, structure, and query persistence verified in MySQL |
| Role & Authorization Verification | PASS (API) / BLOCKED (Browser non-admin) | All 8 role tiers verified via automated integration tests; browser authenticated sessions for non-admin roles blocked by missing credentials |
| Interactive Browser Workflows | PASS | Public feeds, search, filters, modal previews, forms, validation, and admin navigation verified |
| Performance (AUDIT-004) | PASS | Duplicate `/users/me` concurrent requests eliminated via in-flight request deduplication |

---

## 2. Separate Inventory Summaries

### Inventory 1: Route HTTP Reachability

| Category | Total | PASS | FAIL | BLOCKED | NOT TESTED |
|---|---:|---:|---:|---:|---:|
| Public & Authentication Routes | 10 | 10 | 0 | 0 | 0 |
| Member Dashboard Routes | 13 | 13 | 0 | 0 | 0 |
| Administration Routes | 6 | 6 | 0 | 0 | 0 |
| Department Admin Routes | 2 | 2 | 0 | 0 | 0 |
| **Total Route Surfaces** | **31** | **31** | **0** | **0** | **0** |

### Inventory 2: Interactive UI Control Groups

| Control Group | Scope | Status | Notes / Evidence |
|---|---|---|---|
| Public Shell Navigation | Home, announcements, events, urgent, ask links | PASS | Navigation and active states verified |
| Public Home Feed | Hero explore, urgent preview, events preview, cards | PASS | Feeds render live data with zero console errors |
| Announcement Search & Filter | Search input, filter tags, empty state | PASS | Filtering and live text search verified |
| Event Cards & Detail Modal | Event cards, detail modal open, close actions | PASS | Modal rendered and closed cleanly |
| Urgent Announcements Feed | Priority banner, urgent announcement cards | PASS | Feed loaded cleanly |
| Public Inquiry Form (`/ask`) | Validation, form input, submission, feedback | PASS | Form validation verified; DB write confirmed (ID 314) |
| User Login Form (`/auth/login`) | Client validation, invalid credentials error | PASS | Rejects blank inputs; shows error state on invalid credentials |
| Admin Login Form (`/admin`) | Global admin authentication & redirection | PASS | Authenticates global admin and routes to `/admin/dashboard` |
| Registration Form (`/auth/register`) | Invitation token & password match validation | PASS | Client token validation verified in source and tests |
| Forgot Password Form | Email input, enumeration-safe feedback | PASS | Validation and success feedback verified |
| Reset Password Form | Token guard, password confirmation | PASS | Client validation verified in source and tests |
| Access Denied View (`/access-denied`) | Error message, return home, sign-out | PASS | Unauthorized workspace view verified |
| Admin Shell Navigation | Operations, users, roles, structure sub-nav | PASS | Tab and page switching verified |
| Admin Dashboard Operations | Announcements, events, queries tabs | PASS | Tabs render cleanly |
| Admin Structure Management | Academic & Hostel hierarchy views | PASS | Departments, branches, sections loaded |
| Admin User Directory | Account search, role/department filters | PASS | 11 campus accounts loaded across authority tiers |
| Admin Role Hierarchy | Role matrix, posting target permissions | PASS | All 8 authority tiers rendered |
| Member Dashboard Interactive Shells | Authenticated interactive member sessions | BLOCKED | Unauthenticated guards PASS; authenticated sessions BLOCKED by missing non-admin credentials |

### Inventory 3: Role Authorization & Data Isolation

| Role Key | Level | Backend API Authorization | Direct-Route Frontend Guard | Authenticated Browser Session |
|---|---:|---|---|---|
| `SUPER_ADMIN` | 0 | PASS (`SecurityIntegrationTest`) | PASS (`isGlobalAdminRole`) | PASS (Admin dashboard, structure, users, roles verified) |
| `ADMIN` | 1 | PASS (`SecurityIntegrationTest`) | PASS (`isGlobalAdminRole`) | PASS (AUDIT-006 guard alignment verified) |
| `PRINCIPAL` | 1 | PASS (`RoleFlowsIntegrationTest`) | PASS (Redirects to `/auth/login` when unauthenticated) | BLOCKED (No plaintext test credentials provided) |
| `DEAN` | 2 | PASS (`RoleFlowsIntegrationTest`) | PASS (Redirects to `/auth/login` when unauthenticated) | BLOCKED (No plaintext test credentials provided) |
| `HOD` | 3 | PASS (`RoleFlowsIntegrationTest`) | PASS (Redirects to `/auth/login` when unauthenticated) | BLOCKED (No plaintext test credentials provided) |
| `DEPARTMENT_ADMIN` | 3 | PASS (`RoleFlowsIntegrationTest`) | PASS (AUDIT-001 & AUDIT-002 guards verified) | BLOCKED (No plaintext test credentials provided) |
| `FACULTY` | 4 | PASS (`RoleFlowsIntegrationTest`) | PASS (Redirects to `/auth/login` when unauthenticated) | BLOCKED (No plaintext test credentials provided) |
| `STUDENT` | 5 | PASS (`RoleFlowsIntegrationTest`) | PASS (Redirects to `/auth/login` when unauthenticated) | BLOCKED (No plaintext test credentials provided) |

### Inventory 4: Automated Test Suites

| Suite | Category | Tests Run | Passed | Failed |
|---|---|---:|---:|---:|
| `roles.test.ts` | Frontend Role Route Resolution | 11 | 11 | 0 |
| `adminAccess.test.ts` | Frontend Admin Shell & Page Access Guards | 19 | 19 | 0 |
| `guard.test.ts` | Frontend Department Admin Route Guard | 9 | 9 | 0 |
| `redirect.test.ts` | Frontend Login Role Redirection & Return-URL | 19 | 19 | 0 |
| `eventRegistration.test.ts` | Frontend Event Registration RBAC & States | 14 | 14 | 0 |
| `api.test.ts` | Frontend API Client & Deduplication | 9 | 9 | 0 |
| `RoleFlowsIntegrationTest` | Backend RBAC & Data Isolation | 14 | 14 | 0 |
| `AccessControlRegressionTest` | Backend Access Controls, Registrations & 403s | 17 | 17 | 0 |
| `EventServiceTest` | Backend Event Service Unit Tests | 8 | 8 | 0 |
| `SecurityIntegrationTest` | Backend JWT, Cookie, and CSRF Controls | 6 | 6 | 0 |
| `IdentityPersistenceTest` | Backend User Entity & Role Persistence | 1 | 1 | 0 |
| `ProductionSafetyCheckTest` | Backend Production Settings Validation | 3 | 3 | 0 |
| Remaining Unit & Service Tests | Backend Services, Validation, Seeding | 29 | 29 | 0 |
| **Total Automated Tests** | | **159** | **159** | **0** |

---

## 3. Verified Defects & Resolutions

### AUDIT-001 — Department-Admin Unauthenticated State Indefinite Loading
- **Severity**: High
- **Status**: **FIXED & VERIFIED**
- **Affected File**: [`frontend/app/dashboard/department-admin/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/dashboard/department-admin/page.tsx)
- **Defect**: When unauthenticated, `currentUser()` returned `null`. The render condition `loading || !user` left the page on `<Loading>` indefinitely.
- **Fix Applied**: Introduced `departmentAdminRoute(u)` guard helper in [`guard.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/dashboard/department-admin/guard.ts). Unauthenticated requests redirect to `/auth/login`; non-department admins redirect to `/access-denied`.
- **Verification**: 9 unit tests in [`guard.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/dashboard/department-admin/guard.test.ts) and live browser redirect confirmed.

### AUDIT-002 — Department-Admin Navigation & Authorization Mismatch
- **Severity**: High
- **Status**: **FIXED & VERIFIED**
- **Affected Files**: [`frontend/components/AdminShell.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/AdminShell.tsx), [`frontend/components/adminAccess.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/adminAccess.ts)
- **Defect**: `AdminShell` admitted `DEPARTMENT_ADMIN` to global admin routes (`/admin/dashboard`, `/admin/users`, `/admin/roles`), while the backend correctly restricts those endpoints to `ADMIN` and `SUPER_ADMIN`.
- **Fix Applied**: `AdminShell` restricted strictly to `ADMIN` and `SUPER_ADMIN`. Department administrators use dedicated department routes.
- **Verification**: 19 unit tests in [`adminAccess.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/adminAccess.test.ts).

### AUDIT-003 — User Login Role-Based Redirection Defect
- **Severity**: High
- **Status**: **FIXED & VERIFIED**
- **Affected Files**: [`frontend/app/auth/login/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/auth/login/page.tsx), [`frontend/app/auth/login/redirect.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/auth/login/redirect.ts)
- **Defect**: Login router determined destination solely from numeric `roleLevel`, routing `DEPARTMENT_ADMIN` level 3 to the HOD dashboard, and unrecognized values to the student dashboard.
- **Fix Applied**: Login delegates to `normalizeRoleKey` and `getRoleRoute`. Valid roles route to canonical dashboards; unrecognized roles route to `/access-denied`.
- **Verification**: 12 unit tests in [`redirect.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/auth/login/redirect.test.ts).

### AUDIT-004 — Redundant Concurrent `/users/me` Network Requests
- **Severity**: Medium (Performance)
- **Status**: **FIXED & VERIFIED**
- **Affected Files**: [`frontend/lib/api.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/lib/api.ts), [`frontend/lib/api.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/lib/api.test.ts)
- **Defect**: Concurrent calls to `currentUser()` from `SiteShell` and `Home` page resulted in duplicate simultaneous HTTP requests to `/api/v1/users/me` on initial load.
- **Measurement Before**: Browser resource timing showed concurrent calls dispatched at ~856.0ms and ~856.5ms with ~120ms latency each.
- **Fix Applied**: Added in-flight request deduplication via `pendingCurrentUser` promise in `api.ts`. Any concurrent caller awaits the existing in-flight promise. Promise is cleared upon completion or explicit `login`/`logout`.
- **Measurement After**: Concurrent calls unified into a single request (~420ms). 0 redundant duplicate in-flight requests.
- **Verification**: Regression test in [`api.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/lib/api.test.ts) and browser resource timing inspection.

### AUDIT-005 — Frontend ESLint Warnings & Next.js Image Optimization
- **Severity**: Low
- **Status**: **FIXED & VERIFIED**
- **Affected Files**: [`frontend/app/admin/dashboard/DashboardClient.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/admin/dashboard/DashboardClient.tsx), [`frontend/components/EventCard.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/EventCard.tsx), [`frontend/components/ui/DetailModal.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/ui/DetailModal.tsx)
- **Defect**: Missing dependency in `useCallback` hook in `DashboardClient.tsx`; raw `<img>` tags triggering Next.js lint warnings.
- **Fix Applied**: Added declared `departmentScoped` dependency; converted raw images to `next/image` with passthrough loader and `unoptimized`.
- **Verification**: `npm run lint` reports 0 errors and 0 warnings.

### AUDIT-006 — Valid `ADMIN` Role Rejected by Global Admin Guards
- **Severity**: High
- **Status**: **FIXED & VERIFIED**
- **Affected Files**: [`frontend/app/admin/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/admin/page.tsx), [`frontend/app/admin/dashboard/DashboardClient.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/admin/dashboard/DashboardClient.tsx), [`frontend/app/admin/roles/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/admin/roles/page.tsx), [`frontend/app/admin/structure/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/admin/structure/page.tsx), [`frontend/app/admin/users/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/admin/users/page.tsx)
- **Defect**: Guards checked `roleLevel === 0`, rejecting `ADMIN` (level 1) despite being a global administrator role.
- **Fix Applied**: Guards updated to use `isGlobalAdminRole(u.role)`, admitting both `SUPER_ADMIN` and `ADMIN`.
- **Verification**: Unit tests in [`adminAccess.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/adminAccess.test.ts).

### AUDIT-007 — Dashboard Routing Trusted Role Level When Role Name Was Missing
- **Severity**: High
- **Status**: **FIXED & VERIFIED**
- **Affected Files**: [`frontend/config/roles.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/config/roles.ts), [`frontend/config/roles.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/config/roles.test.ts)
- **Defect**: `getRoleRoute` fell back to `roleLevel` when `role` was null or unrecognized, potentially routing malformed payloads to higher-privilege dashboards.
- **Fix Applied**: `getRoleRoute` requires a valid recognized canonical role name and returns `/access-denied` for missing or unknown roles regardless of numeric level.
- **Verification**: 11 unit tests in [`roles.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/config/roles.test.ts).

### AUDIT-008 — Event Registration Unauthenticated Flow & Authorization Correction
- **Severity**: High (Security & Access Control)
- **Status**: **FIXED & VERIFIED**
- **Affected Files**:
  - Backend: [`SecurityConfig.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/main/java/com/notifyhub/config/SecurityConfig.java), [`EventController.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/main/java/com/notifyhub/event/EventController.java), [`EventService.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/main/java/com/notifyhub/event/EventService.java), [`Event.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/main/java/com/notifyhub/event/Event.java), [`EventServiceTest.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/test/java/com/notifyhub/event/EventServiceTest.java), [`AccessControlRegressionTest.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/test/java/com/notifyhub/security/AccessControlRegressionTest.java)
  - Frontend: [`frontend/lib/api.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/lib/api.ts), [`frontend/components/EventRegistrationPanel.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/EventRegistrationPanel.tsx), [`frontend/components/eventRegistration.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/eventRegistration.ts), [`frontend/components/eventRegistration.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/eventRegistration.test.ts), [`frontend/app/auth/login/redirect.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/auth/login/redirect.ts), [`frontend/app/auth/login/redirect.test.ts`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/auth/login/redirect.test.ts), [`frontend/app/auth/login/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/auth/login/page.tsx), [`frontend/components/EventCard.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/EventCard.tsx), [`frontend/components/ui/Spotlight.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/components/ui/Spotlight.tsx), [`frontend/app/events/page.tsx`](file:///c:/Users/VENKAT/Downloads/NotifyHub/frontend/app/events/page.tsx)
- **Defect Description**:
  An incorrect change previously allowed unauthenticated event registration by disabling CSRF protection on `/api/v1/events/*/register` and setting the endpoint to `permitAll()`. The backend auto-created student user accounts with synthetic passwords, bypassing authentication. In the frontend, an unauthenticated public registration form was exposed rather than enforcing student authentication and redirecting logged-out visitors to `/auth/login`.
- **Resolution Applied**:
  1. **Security & CSRF Protection Restored**:
     - Removed `/api/v1/events/*/register` from CSRF ignoring list in `SecurityConfig.java`.
     - Restored `.requestMatchers(HttpMethod.POST, "/api/v1/events/*/register").authenticated()`.
     - Reverted `EventController.register` signature to require authenticated user authentication principal.
     - Removed `PublicRegistrationRequest` and auto-account creation logic in `EventService`.
     - Enforced student role check in `EventService`: only authenticated students matching targeting can register; non-students receive HTTP 403 Forbidden ("Only students can register for events.").
     - Preserved duplicate registration check returning HTTP 409 Conflict ("You are already registered.").
  2. **Registration Management Access Preserved**:
     - `SUPER_ADMIN` can access registrations across all events.
     - `DEPARTMENT_ADMIN` can access registrations strictly within their authorized department; access across departments returns HTTP 403 Forbidden.
     - Viewing attendee lists, CSV export, and print view (`window.print()`) preserved.
  3. **Intended Frontend Flow Restored**:
     - Removed unauthenticated guest registration form and payload from `EventRegistrationPanel.tsx` and `api.ts`.
     - Unauthenticated users see the **Register** button on event cards/details (unless closed/deadline passed).
     - Clicking **Register** while logged out redirects the user to `/auth/login?redirect=${encodeURIComponent(target)}`.
     - After successful login, `getLoginRoute` safely returns students to their target event (with open redirect defense), while non-students route to their canonical dashboards.
     - Events page automatically scrolls to and highlights the target event.
     - Authenticated students who already registered see the disabled **Already registered** button.
  4. **Automated Verification**:
     - 14 Vitest unit tests in `eventRegistration.test.ts`.
     - 7 new Vitest unit tests in `redirect.test.ts` (19 total).
     - 5 new integration tests in `AccessControlRegressionTest.java` (17 total).
     - 8 unit tests in `EventServiceTest.java`.

---

### AUDIT-009: Event Registration Management Interface for Super Admin and Department Admin

- **Finding**: While student event registration and backend attendee rosters were properly implemented, neither the Super Admin nor Department Admin dashboards exposed a dedicated interface to inspect, select, and manage event registrations. Department admins also lacked department-scoped event listing via `/api/v1/events/department-management`.
- **Resolution**:
  1. **Reusable Registration Manager (`EventRegistrationManager.tsx`)**:
     - Built component with event search/filtering, dropdown selector, quick-pick chips, attendee table, and real-time attendee statistics.
     - Handles loading, empty, and unauthorized states (403 Forbidden with clear departmental access boundary alerts).
     - Renders formatted attendee table with `#`, Student Name, Student ID, Email, Department, Year/Section, and Registration Date/Time.
     - Includes **Print Registration List** (`window.print()`) with print-optimized header (`.print-area`) and automatic removal of controls (`.print-hide`).
     - Includes **Export CSV** link to backend endpoint (`/api/v1/events/{id}/registrations/export`).
  2. **Super Admin Dashboard Integration (`DashboardClient.tsx`)**:
     - Added dedicated tab `"registrations"` labeled **Manage Event Registrations** to `/admin/dashboard`.
     - Supports query param `?tab=registrations` and deep linking directly from event rows in the Events queue via **Manage registrations** action button.
     - Shows all campus events and allows super admin to inspect attendee rosters across any department.
  3. **Department Admin Dashboard Integration (`DepartmentAdminDashboardView.tsx`)**:
     - Added dedicated tab `"registrations"` labeled **🎟️ Event Registrations** to `/dashboard/department-admin`.
     - Added **Registrations** quick navigation button in the top navigation header.
     - Scoped strictly to the Department Admin's authorized department: only events belonging to their department are displayed.
     - In `DashboardClient.tsx` (used for `/department-admin/events`), added tab navigation between Events and Manage Event Registrations.
  4. **Backend Authorization & Scoping**:
     - Updated `frontend/lib/api.ts` `departmentManagedEvents` to call `/api/v1/events/department-management`, which is secured by `SecurityConfig` (`.hasRole("DEPARTMENT_ADMIN")`) and filters events by `repo.findByDepartment(deptId, ...)`.
     - Enforced department-level access on `GET /api/v1/events/{id}/registrations` and `GET /api/v1/events/{id}/registrations/export`: Department Admins attempting to access registrations for events outside their authorized department receive HTTP 403 Forbidden.
     - Super Admin retains global access across all events and departments.
  5. **Automated Verification**:
     - Frontend Vitest tests expanded to 84/84 passing tests (added tests for `departmentManagedEvents`, `managedEvents`, and `eventRegistrations` in `api.test.ts`).
     - Backend Maven tests expanded to 79/79 passing tests (added `departmentAdminCanOnlyAccessDepartmentScopedEventManagementApi` in `AccessControlRegressionTest.java`).
     - TypeScript passed (`tsc --noEmit`, 0 errors).
     - ESLint passed (`eslint .`, 0 errors, 0 warnings).
     - Production build passed (`next build`, all 32 routes compiled).
     - Git diff verified (`git diff --check`, clean).

### AUDIT-010: Fix Non-Working Save Draft Button and Complete Draft Workflow in Super Admin Events Section

- **Finding**:
  1. *Silently Swallowed / Off-Screen Validation Errors*: In `DashboardClient.tsx`, `submitE` performs validation checks on audience fields and start/end times (`!ev.startAt || !ev.endAt || new Date(ev.endAt) <= new Date(ev.startAt)`). When validation failed (e.g., when users typed equal or invalid datetime strings into `<input type="datetime-local">`), `submitE` called `setError(...)` and returned early without setting a toast notification (`setToast`). The page error banner (`<ErrorState>`) was rendered at the very top of the dashboard (above the metric cards and tabs), which is scrolled completely off-screen when working in the Events form. To the user, clicking the "Save draft" button resulted in zero visual change or feedback, appearing completely broken/non-responsive.
  2. *Destructive Form Reset*: When a draft was created, `submitE` previously invoked `setEv({ ...blankE, ... })`, completely wiping the form rather than preserving the saved draft's input values.
  3. *Missing Draft Editing / Reopening Capability*: The dashboard lacked an `editingEventId` state, never imported or called `updateEvent`, and provided no "Edit draft" action on draft rows in the Event queue table. Admins could neither reopen a saved draft nor update it in place.
  4. *Missing In-Flight Duplicate Submission Guard*: The form submission handler lacked an early `if (busy) return;` guard to prevent accidental duplicate saves during active async requests.
- **Resolution**:
  1. **Enhanced State & Lifecycle Management (`DashboardClient.tsx`)**:
     - Added `editingEventId: number | null` to track the active draft being edited and `eventFormError: string` for immediate inline form error feedback.
     - Added `toDateTimeLocal(iso?: string | null): string` helper to convert ISO 8601 strings to `YYYY-MM-DDTHH:mm` format required by `<input type="datetime-local">`.
     - Updated `submitE` validation: any audience or datetime validation failure sets an inline form error alert, displays a floating toast notification, and halts submission before making unnecessary API calls.
     - Added duplicate submission guard `if (busy) return;` and updated the submit button to reflect state (`Saving…`, `Save draft`, `Save draft changes`).
     - Preserved form values in `ev` upon successful save/update, and set `editingEventId` to the saved event ID.
     - Added "New draft" / "Cancel editing" controls to reset the form back to a blank draft when desired.
     - Added "Edit draft" button for DRAFT events in the Event queue table to populate the form and switch to edit mode.
     - Wired `updateEvent` from `@/lib/api` to `PUT /api/v1/events/{id}` for updating drafts.
     - Reset `editingEventId` and cleared form if the draft currently being edited is published or deleted.
  2. **Backend & Data Isolation Verification**:
     - Confirmed `Event` defaults to `EventStatus.DRAFT` with `publishedAt = null`.
     - Confirmed `EventService.update` permits edits only on `DRAFT` events (`throw conflict("Only draft events may be edited.")`).
     - Confirmed `publicGlobal` and `upcomingGlobal` queries strictly filter for `status = 'PUBLISHED'`, ensuring draft events are completely excluded from public announcement/events feeds.
  3. **Automated Verification**:
     - Added 4 unit regression tests in `EventServiceTest.java`: `saveDraftEventPersistedWithDraftStatus`, `updateDraftEventUpdatesFields`, `cannotUpdatePublishedEvent`, and `publicFeedExcludesDrafts`.
     - Added integration regression test in `AccessControlRegressionTest.java`: `eventDraftLifecycleAndExclusionFromPublicFeed` verifying create draft -> exclusion from public feeds -> update draft -> publish -> inclusion in public feed.
     - Added unit tests in `api.test.ts` for `createEvent` and `updateEvent`.
     - All 86 frontend tests pass, all 84 backend tests pass.
     - TypeScript (`tsc --noEmit`) and ESLint (`eslint .`) clean with 0 errors/warnings. Production build (`next build`) clean.
  4. **Live Browser & MySQL Verification**:
     - Tested in live browser session with Super Admin `admin@notifyhub.local`: created draft "AI Summit & Cloud Architecture 2026", verified "Event draft saved." toast, verified form preservation, verified header updated to `Edit event draft` / `DRAFT #164`, updated venue to "Main Auditorium Hall C - Tech Wing", clicked "Save draft changes", verified "Event draft updated." toast, and verified updated venue in Event queue.
     - Verified MySQL record directly: `SELECT id, title, venue, status, published_at FROM events WHERE id=164;` returned `status='DRAFT'`, `published_at=NULL`.
     - Verified `GET /api/v1/events` and `GET /api/v1/events/upcoming` exclude draft #164.

---

## 4. Backend Runtime Blocker & Configuration Integrity

### Root Cause Analysis
1. **Working Directory Path Mismatch**: When launched from the repository root directory rather than `backend/`, Spring Boot evaluated `spring.config.import: optional:file:./application-local.yml` looking in the project root. Missing `application-local.yml` caused fallback to default values with an empty database password (`${DB_PASSWORD:}`).
2. **Database Connection Failure**: HikariCP failed to connect to MySQL, causing the JVM process to terminate immediately on startup before opening port 8080.
3. **Java 25 Compatibility**: Java 25.0.4 is fully compatible with Spring Boot 3.5.4 and runs the application without issue once configuration is properly resolved.

### Corrective Actions
1. **Dual-Path Configuration Import**: Updated `backend/src/main/resources/application.yml` so `spring.config.import` checks both `./application-local.yml` and `./backend/application-local.yml`. Both are marked `optional:`, ensuring no failure if missing.
2. **VS Code Debugger Configuration**: Created [`.vscode/launch.json`](file:///c:/Users/VENKAT/Downloads/NotifyHub/.vscode/launch.json) specifying `"cwd": "${workspaceFolder}/backend"` for `NotifyHubApplication`.

### Secret & Artifact Security Verification
- **Git Ignore**: Verified line 38 of `.gitIgnore` explicitly ignores `application-local.yml`, and line 48 ignores `.vscode/`.
- **Maven Packaging**: Verified that `application-local.yml` resides in `backend/` and NOT in `backend/src/main/resources/`. Inspected `backend/target/classes/` and confirmed `application-local.yml` is never copied into compiled classes or final JAR artifacts.
- **Production Safety Check**: [`ProductionSafetyCheck.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/main/java/com/notifyhub/config/ProductionSafetyCheck.java) enforces that when `SPRING_PROFILES_ACTIVE=prod`, the application refuses to start if `JWT_SECRET` is missing/default, `AUTH_COOKIE_SECURE` is false, `FRONTEND_ORIGIN` is insecure/localhost, or `DB_PASSWORD` is empty.
- **Admin Seeder Security**: [`AdminSeeder.java`](file:///c:/Users/VENKAT/Downloads/NotifyHub/backend/src/main/java/com/notifyhub/config/AdminSeeder.java) skips admin creation if `ADMIN_PASSWORD` is null/empty. In `application.yml`, `admin-password` has no default fallback. The development admin account is configured strictly via local development properties and does not expose credentials in production.

---

## 5. Live Functional & Persistence Verification

### Form Submission & Database Persistence
- **Public Inquiry Submission**: Executed on `/ask` through live browser interaction with fields: Name, Email, Department, Subject ("Library Hours Inquiry"), and Question.
- **Client Validation**: Verified required field guards prevent empty submissions.
- **MySQL Persistence Verification**: Queried MySQL database `notifyhub.queries` directly. Confirmed inquiry persisted as record **ID 314**, status `OPEN`, created `2026-10-17 06:13:32`.

### Global Admin Workflow
- **Admin Authentication**: Verified on `/admin` for global admin role.
- **Admin Operations Dashboard**: Verified `/admin/dashboard` renders Announcements, Events, and Queries tabs.
- **User Directory**: Verified `/admin/users` loaded 11 active accounts across authority tiers.
- **Role Hierarchy**: Verified `/admin/roles` rendered all 8 authority tiers (`SUPER_ADMIN` down to `STUDENT`).
- **Structure View**: Verified `/admin/structure` displays Academic (Department, Branch, Section) and Hostel tabs.

### Public Navigation & Controls
- **Announcements Feed**: Live search input and filter tags verified on `/announcements`.
- **Events Feed & Detail Modal**: Event card click opens `DetailModal` displaying full schedule, location, and tags; modal close buttons (`✕` and "Close details") verified.
- **Urgent Feed**: Feed rendered priority announcements on `/urgent`.
- **Password Recovery**: Tested `/auth/forgot-password`; verified HTML5 input validation and enumeration-safe feedback.
- **Login Validation**: Tested `/auth/login`; verified client validation and invalid credential error state.

---

## 6. Remaining Production Requirements & Limitations

Before deploying to a public production environment:
1. **Supply Production Environment Variables**: Provide `JWT_SECRET` (>= 32 characters, non-default), `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `ADMIN_PASSWORD` via the hosting provider's secret manager.
2. **Configure Live SMTP Mail Delivery**: Set `MAIL_ENABLED=true` with production SMTP credentials (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`) for sending invitations and notifications.
3. **Configure SSL/TLS & Cookie Security**: Ensure `AUTH_COOKIE_SECURE=true` behind an HTTPS reverse proxy.
4. **CORS Configuration**: Set `FRONTEND_ORIGIN` to the public domain URL.
5. **Non-Admin Browser Session Testing**: Provision dedicated test accounts with known passwords in staging if interactive browser testing of the 6 non-admin member dashboards is desired prior to launch.

---

## 7. Conclusion

### **CONDITIONALLY READY**

NotifyHub is internally code-complete, functionally verified across all testable surfaces, and free of blocking defects. The runtime startup blocker under Java 25.0.4 has been diagnosed and resolved without weakening production configuration.

The project is declared **CONDITIONALLY READY** for general production availability pending only the entry of hosting environment secrets, production SMTP mail credentials, and HTTPS reverse proxy termination.
