# NotifyHub — Product, Requirements & UX Architecture Specification
### Part 1 of 4: Product, UX & Information Architecture Only

> Scope fence: no API contracts, DB schemas, auth implementation mechanics, or infra/deployment details. Where backend support is implied, it is flagged as "requires backend support (see Part 2)."

---

## 1. Executive Product Summary

NotifyHub replaces fragmented campus communication (WhatsApp/Telegram groups, notice boards, scattered emails, informal forwarding) with a single, role-aware, targeted notification platform. It exists to guarantee that official campus information reaches **the right users, at the right time, through the right channel**, with a full lifecycle from creation to archival and a verifiable audit trail of who published what, to whom, and who read it.

The product is not a bulletin board. It is a **targeting and delivery system** with three pillars: (1) structured content types (Announcements, Events, Notifications, Queries), (2) precise audience targeting against the academic and hostel structure, and (3) a per-user Notification Center with preferences that respect one hard rule — Emergency alerts are never suppressible.

---

## 2. Product Vision

> NotifyHub is not merely an announcement website. It is a centralized, targeted, secure campus information and notification platform that delivers the right information to the right users at the right time.

Information flows through a single accountable pipeline: **Created → Managed → Targeted → Published → Delivered → Read → Tracked → Archived.** Every feature in this spec exists to make one or more of those eight steps reliable, auditable, and fast for the person doing it.

---

## 3. Business Goals

1. **Eliminate fragmentation** — one system of record for official campus communication, reducing reliance on informal channels for anything official.
2. **Guarantee targeted reach** — a Computer Science 3rd-year student sees CSE-relevant and Year-3-relevant content without wading through unrelated department/hostel noise.
3. **Make urgency legible** — Emergency and Urgent information is never missed, never buried, never mutable by user preference.
4. **Reduce sender friction** — Faculty and Admin can create, target, and publish in minutes with confidence they reached the correct audience (target preview + recipient count before publish).
5. **Provide accountability** — every publish, edit, and targeting decision is attributable and auditable (Admin-facing; detailed audit mechanics in Part 2/3).
6. **Scale without re-architecture** — the academic/hostel structure and category/priority system must absorb new departments, hostels, and years without product redesign.

---

## 4. User Personas

**Ananya — Day Scholar Student (CSE, Year 3, Section A).** Checks NotifyHub once a day, cares about academic deadlines, placement drives, and events for her department/year. Wants to mute Library/Transportation but never wants to accidentally mute something urgent.

**Ravi — Hosteller Student (Hosteller, Boys Hostel 1, Block B).** Cares about hostel-specific notices (water/power maintenance, mess timings) in addition to everything Ananya cares about. His room-level details (block, room) must stay private from other students.

**Dr. Meera — Faculty (CSE Department).** Publishes academic and department announcements, creates department events, and needs to see and respond to student queries routed to her — without any administrative surface (user management, system settings) visible to her.

**Mr. Suresh — Admin (Student Affairs).** Manages accounts, academic/hostel structure, and publishes cross-cutting or emergency notifications. Needs analytics and audit logs to demonstrate that a notice actually reached its intended audience.

---

## 5. User Roles

```text
ADMIN
FACULTY
STUDENT
```

These three names are used verbatim and exclusively everywhere in this document and in Parts 2–4. No additional authentication roles exist. **Hosteller status is a student attribute, never a role** (`HOSTEL_STUDENT` does not exist).

**Role is a trusted, server-assigned attribute.** No registration form, profile page, or settings screen exposes a role selector or implies role is user-editable. Role is set and changed only through Admin's User Management surface. This is treated as a privilege-escalation control point, not a cosmetic UX choice — every self-service form in this spec is designed with role fields absent, disabled, or simply not rendered, never merely "greyed out with a tooltip" (which would still leak the field's existence and invite tampering attempts against the endpoint).

---

## 6. Role Capabilities (Summary Matrix)

| Capability | Student | Faculty | Admin |
|---|---|---|---|
| View targeted Announcements/Events/Notifications | ✅ | ✅ | ✅ (all) |
| Create Announcement | ❌ | ✅ (Academic/Department/Event categories only) | ✅ (all categories) |
| Create Event | ❌ | ✅ (own department scope) | ✅ (any scope) |
| Publish Emergency-priority content | ❌ | ❌ | ✅ |
| Target beyond own department | ❌ | ❌ (own dept only, by default) | ✅ |
| Submit Query | ✅ | ❌ (Faculty *answer*, not submit, queries) | ❌ |
| Answer/assign Query | ❌ | ✅ (assigned to them) | ✅ (assign + answer + reassign) |
| Manage own profile/preferences | ✅ | ✅ | ✅ |
| Manage other users' accounts | ❌ | ❌ | ✅ |
| Manage academic/hostel structure | ❌ | ❌ | ✅ |
| View analytics | ❌ | ❌ (own content stats only, see 6a) | ✅ (system-wide) |
| View audit logs | ❌ | ❌ | ✅ |

*(6a) Faculty see reach/read-rate for announcements/events **they authored**, not system-wide analytics — this is a lightweight accountability view, not the Admin Analytics module.*

---

## 7. Role Permission Boundaries

### Student — cannot:
- Create/edit/publish any Announcement, Event, or Notification.
- View other students' Phone, Personal Email, Room, Hostel Block, or Account Status.
- View Admin or Faculty management surfaces.
- Assign or answer queries (only submit/track their own).
- See analytics or audit logs.

### Faculty — can:
- View all content targeted to their department/role scope.
- Create Announcements limited to categories: **Academic, Department, Events** (not Examination, Placements & Careers, Administration, Emergency — those remain Admin/registrar-owned in V1; open question in §36).
- Create/edit/publish/cancel Events scoped to their own department by default.
- View and respond to Queries assigned to them.
- Edit/delete only content they authored, while in DRAFT or SCHEDULED state (once PUBLISHED, edits are corrections-only and versioned — see §18).

### Faculty — cannot:
- Publish Emergency, Examination, Placements & Careers, or Administration category content.
- Target outside their own department without Admin approval (flagged as V1 stretch; MVP = department-locked).
- Access User Management, Academic/Hostel structure management, System Settings, or Audit Logs.
- Grant themselves or anyone else elevated permissions.

### Admin — can:
- Everything Faculty and Student can view, plus full CRUD on users, academic structure, hostel structure, all content categories/priorities, notification management, analytics, audit logs, and system settings.
- Activate/deactivate accounts, reassign roles, reassign queries.

### Admin — cannot (by product design, not technical limitation):
- Silently impersonate a user without an explicit, audited "view as" action (flag in §36 — recommend audited impersonation only, if implemented at all).

---

## 8. Student Product Model

**Required at account creation (Admin-entered):** Student ID, Name, Email (institutional), Department, Branch/Program, Year, Section.
**Required, conditionally:** Hostel, Hostel Block, Room — required only if Hosteller = YES.
**Optional:** Phone, Personal Email, Course (where distinct from Branch), Semester, Batch.
**Administrative-only (Admin sets/changes, student never edits):** Student ID, Department, Branch/Program, Year, Section, Semester, Batch, Account Status, Role.
**Student-editable:** Phone, Personal Email, Notification Preferences, password.

**Sensitivity tiers (per Section 4 override, applied literally):**
- **Sensitive-by-default** (visible only to the student themself + Admin): Phone, Personal Email, Room, Hostel Block, Account Status.
- **Moderately visible** (visible more broadly only where a workflow needs it, e.g., targeting-preview aggregate counts — never as a per-student directory): Department, Year, Section, Hosteller Status (yes/no only, no room detail).
- Faculty see none of the sensitive tier by default. No workflow in this spec currently requires an exception; if one emerges in Parts 2–4 it must be justified explicitly (tracked as open item, §36).

**Example profiles (canonical, reused across this document):**
```text
Hosteller:   Role STUDENT · CSE · Year 3 · Section A · Hosteller YES · Boys Hostel 1 · Block B · Room B-204
Day Scholar: Role STUDENT · CSE · Year 3 · Section A · Hosteller NO
```

---

## 9. Faculty Product Model

**Faculty Dashboard:** profile summary, important notifications, department updates, upcoming events, quick "Create Announcement"/"Create Event" actions, assigned-query queue, recent activity.

| Action | Faculty capability |
|---|---|
| View | All content targeted to their department + all-college broadcasts |
| Create | Academic, Department, Event-category announcements; Events (own department) |
| Modify | Only their own DRAFT/SCHEDULED content; PUBLISHED content only via tracked correction |
| Publish | Immediate or scheduled, within allowed categories/scope |
| Delete | Only their own DRAFT content; PUBLISHED content is archived, never hard-deleted (audit integrity) |
| Cannot access | User Management, Academic/Hostel structure, System Settings, Audit Logs, Emergency broadcast, cross-department targeting |

Faculty never see an "Admin" nav item or route — not hidden via CSS, but absent from the rendered navigation and route set for that role (defense against discoverability, not just clutter).

---

## 10. Admin Product Model

**MVP (V1 launch-blocking):**
- User Management (Student + Faculty), Account activation/deactivation
- Academic Structure management (Department, Branch/Program, Year, Section)
- Hostel Structure management (Hostel, Block, Room — Floor optional, see §12)
- Announcement Management (all categories, full lifecycle)
- Notification Management (categories fixed at launch, targeting, emergency broadcast)
- Event Management
- Query Management (assignment, oversight)
- Basic Analytics (delivery/read counts)
- Audit Logs (publish/edit/delete/role-change events)

**Version 1 (fast-follow, not launch-blocking):**
- Granular Permission Management beyond the 3 fixed roles (e.g., delegated category ownership for Faculty)
- Advanced Analytics (trend charts, engagement over time, per-department breakdown)
- Bulk user import/export UX
- Query SLA/escalation rules

**Future:**
- Configurable custom categories (beyond the fixed 11)
- Multi-campus/multi-college support
- Self-service department-level sub-admins

---

## 11. Academic Structure

```text
College → Department → Branch/Program → Course → Academic Year → Year → Semester → Section → Student
```

- **Students see:** their own Department, Branch/Program, Year, Semester, Section (read-only).
- **Admin manages:** all levels; Department, Branch/Program, Year, Section are configurable entities (add/rename/deactivate). Course and Academic Year are treated as descriptive/reporting attributes in V1, not separately manageable targeting entities — **decision, not blind copy**: collapsing "Course" into Branch/Program and "Academic Year" into the global academic-calendar setting (Admin > System Settings) avoids a redundant management screen with no distinct product use. Revisit if a real multi-course-per-branch need emerges (§36).
- **Affects targeting:** Department, Branch/Program, Year, Semester, Section — all selectable as targeting filters.
- **Not exposed to students:** internal Department/Branch codes if any exist separately from display names (display names only, ever).
- Kept intentionally shallow — no cross-department matrixing in V1.

---

## 12. Hostel Structure

```text
Hostel → Block → Floor → Room → Student
```

- **Student profile:** Hostel, Block, Room shown to the student themself only.
- **Admin manages:** Hostel and Block as targeting-relevant entities. **Floor is tracked as a profile/record attribute but is not exposed as a notification-targeting dimension in V1** — a maintenance notice realistically targets a Hostel or a Block, rarely "everyone on Floor 3 across all blocks" with enough frequency to justify UI complexity. This is the "avoid unnecessary room-level targeting" instruction taken at face value: **room-level and floor-level targeting are excluded from V1**; Block is the finest targeting grain.
- **Hostel announcements:** targeted at Hostel or Block grain.
- **Analytics:** hosteller counts and hostel/block breakdowns are Admin-facing aggregate figures only, never a per-room directory.

---

## 13. Notification Categories

| Category | Purpose | Typical users | Typical senders | Visibility | Default Priority | Mutable? | Ack needed? |
|---|---|---|---|---|---|---|---|
| **General** | Holidays, circulars, reopening | All | Admin | All | NORMAL | Yes | No |
| **Academic** | Classes, timetable, assignments, attendance, calendar | Students + Faculty (dept-scoped) | Faculty, Admin | Targeted (dept/year/section) | NORMAL–IMPORTANT | Yes | No |
| **Examination** | Schedules, hall tickets, seating, results, revaluation | Students (targeted) | Admin (registrar) | Targeted | IMPORTANT–URGENT | Limited (see below) | Sometimes (hall ticket collection) |
| **Events** | Fests, workshops, seminars, hackathons, sports | All / targeted | Faculty, Admin | All or targeted | NORMAL | Yes | No |
| **Placements & Careers** | Drives, internships, jobs, eligibility, interviews | Students (targeted by dept/year/eligibility) | Admin (placement cell) | Targeted | IMPORTANT | Limited | Sometimes (interview slot confirmation) |
| **Department** | Department-specific info | Dept students + faculty | Faculty, Admin | Dept-targeted | NORMAL | Yes | No |
| **Library** | Timings, returns, fines, closures | All / targeted | Admin | All or targeted | LOW–NORMAL | Yes | No |
| **Transportation** | Bus schedules, route changes, cancellations | All / targeted | Admin | All or targeted | NORMAL–IMPORTANT | Yes | No |
| **Hostel** | Notices, mess, maintenance, rules | Hostellers (hostel/block-targeted) | Admin | Hostel/block-targeted | NORMAL–URGENT | Limited during active incidents | Sometimes (safety notices) |
| **Administration** | Fees, scholarships, certificates, e-pass, documents | All / targeted | Admin | All or targeted | NORMAL–IMPORTANT | Yes | No |
| **Achievements** | Student/faculty/sports/research recognition | All | Faculty, Admin | All | LOW | Yes | No |
| **Emergency** | Campus closure, security, fire, medical, severe weather | All / targeted | Admin only | All or targeted | EMERGENCY (fixed) | **Never** | **Yes, always** |

*"Limited" mute = the category can be muted for routine items, but any individual notification within it that is separately marked URGENT/EMERGENCY overrides the mute (priority beats category preference — see §14).*

---

## 14. Notification Priorities

```text
LOW → NORMAL → IMPORTANT → URGENT → EMERGENCY
```

| Priority | Visual treatment | Badge | Sorting | Sound/vibration | Ack required | Mutable | Expiration | Special banner |
|---|---|---|---|---|---|---|---|---|
| **LOW** | Neutral gray, no icon | Not counted in main badge (optional secondary count) | Bottom of feed | None | No | Yes | Normal (author-set) | No |
| **NORMAL** | Default styling | Counted | Standard reverse-chronological | Optional, off by default | No | Yes | Normal | No |
| **IMPORTANT** | Accent color + icon | Counted, visually emphasized | Boosted above NORMAL within read/unread group | Optional, on by default | No | Yes | Normal | No |
| **URGENT** | Warning color + icon + label text (never color alone) | Counted, badge highlighted | Pinned above IMPORTANT | On by default, user can mute per-category (not per-item) | Optional (author choice) | Limited — category mute suppressed for this item | Shorter default, extendable by author | Small in-feed banner |
| **EMERGENCY** | Distinct color + icon + explicit "EMERGENCY" text label (WCAG 1.4.1 compliant — never color-only) | Always counted, non-dismissible until acknowledged | Always first, pinned | On, cannot be silenced by user setting | **Yes, mandatory** | **Never mutable/snoozable/filterable off** | Remains visible until acknowledged or explicitly expired by Admin | **Full-width top-of-app banner, persists across navigation until acknowledged or expired** |

Non-negotiable EMERGENCY rules (restated as product law, not a suggestion): cannot be muted/snoozed/filtered by any preference; never signaled by color alone; stays pinned above all other content regardless of read state until acknowledged or expired.

---

## 15. Notification Targeting UX

**Targeting attributes offered to a sender:** Audience (Everyone / Students / Faculty / Both), Department, Branch, Year, Semester, Section, Hosteller Status, Hostel, Hostel Block.

**Flow (Create Announcement/Event/Notification → Target step):**
1. **Audience type** — single-select: Everyone / All Students / All Faculty / Custom.
2. If Custom: progressive multi-select filters (Department → Year → Section, and/or Hosteller Status → Hostel → Block), each with **Select All** and **Clear** controls per filter group.
3. **Live target preview panel**: as filters change, an estimated recipient count updates (debounced call — requires backend support, see Part 2) with a short human-readable summary, e.g. *"~184 recipients: CSE, Year 3 & 4, Students."*
4. **Empty-result guard**: if the combination yields 0 recipients, the Publish button is disabled with inline copy: *"No students match this combination. Adjust your filters."* — never a silent no-op publish.
5. **Conflicting-rule guard**: mutually exclusive picks (e.g., Hosteller Status = NO combined with a specific Hostel/Block) are prevented at the UI level — selecting NO auto-clears/disables Hostel/Block fields, with a one-line explanation, not a validation error after the fact.
6. **Permission-scoped options**: Faculty only ever see their own department pre-selected and locked (cannot widen scope); Admin sees the full attribute set unlocked.
7. Confirmation step before publish restates: category, priority, audience summary, recipient count, and schedule time (if scheduled).

---

## 16. Notification Center

**Tabs/filters:** All, Unread, Read, Important, Urgent, Emergency, plus category filter chips and free-text search.

**Behavior:**
- **Badge count** = unread NORMAL-and-above items (LOW items optionally excluded from the primary badge, per §14, to avoid badge fatigue — configurable default, not user-togglable in V1).
- **Ordering**: priority-first (EMERGENCY → URGENT → IMPORTANT → NORMAL → LOW), recency-second within each tier.
- **Read/unread distinction**: unread items are visually bolder with a left accent bar and dot indicator — not color alone (icon/weight difference also present).
- **Mark read / Mark all read**: available; marking read is per-user and never affects other recipients' state.
- **Expired notifications**: move out of the primary feed into an "Expired" filter state (still searchable) rather than disappearing silently.
- **Archived**: Admin/author-archived items are excluded from default feeds but retrievable via search/history for audit continuity.
- **Pagination**: cursor-based infinite scroll for the main feed (better perceived performance than numbered pages for a chronological feed); explicit pagination controls are used instead wherever a list is compared/tabulated (e.g., Admin management tables — see §28).

---

## 17. Notification Preferences

**Configurable per category:** General, Academic, Events, Placements & Careers, Department, Library, Transportation, Hostel, Administration, Achievements — mute toggle + channel selection (In-app always on; Email/Push as available channels, requires backend support for actual delivery, see Part 2).

**Not configurable:** Examination and Emergency retain elevated defaults; Examination cannot be fully muted (can reduce to in-app-only, cannot disable entirely) since hall tickets/results are consequence-bearing; **Emergency has no preference row at all** — instead, Settings displays a clearly labeled, non-toggleable info block: *"Emergency alerts are always delivered and cannot be muted, for your safety."* This is a visible, explained restriction, never a hidden rule.

**Defaults at account creation:** all categories on, in-app + email on, push opt-in (if push exists) defaulting off pending explicit permission grant.

**Preference-change scope**: changes apply prospectively only — they never retroactively alter delivery/read state of already-delivered notifications.

---

## 18. Announcement Product

**Fields:** Title, Content, Category, Priority, Author, Target audience, Publish date, Expiry date, Attachment, Status.

**Attachment constraints (UX-level):** accepted types shown up front (e.g., PDF, JPG, PNG, DOCX — final list confirmed with Part 2 storage design); a max size clearly stated near the upload control (e.g., "up to 10 MB" — exact number confirmed in Part 2); invalid files are rejected client-side with a specific reason ("File exceeds 10 MB" / "Unsupported file type — allowed: PDF, JPG, PNG, DOCX"), never a generic error. **The UI shows "Uploaded" only after backend confirms storage success** — never optimistically on click, consistent with the honest-success-state principle in §21.

**Lifecycle:** `DRAFT → SCHEDULED → PUBLISHED → EXPIRED → ARCHIVED`

- **Creating/Editing**: form with live preview panel showing exactly how the announcement will render in a recipient's feed (card + full detail view).
- **Saving draft**: autosave indicator + manual "Save Draft"; drafts are private to the author (+ Admin) until scheduled/published.
- **Scheduling**: date/time picker with the institution's timezone shown explicitly; scheduled items show a "Scheduled for [time]" state visible only to the author/Admin.
- **Publishing**: immediate publish requires the confirmation step from §15; once published, category/priority/audience become edit-restricted (a full re-target after publish is a new announcement or an explicit "correction" flow, to preserve what recipients already saw).
- **Cancelling**: a SCHEDULED item can be cancelled back to DRAFT before its publish time; a PUBLISHED item cannot be "cancelled," only archived or expired early.
- **Archiving**: manual by author/Admin, or automatic after expiry + a retention window (retention length TBD, §36).
- **Searching/Filtering**: by category, priority, status, date range, author.
- **Viewing details**: full content, attachment, author, publish date, and — for Admin/author only — reach/read stats.

---

## 19. Event Product

**Fields:** Title, Description, Category, Organizer, Venue, Start date/time, End date/time, Registration deadline, Eligibility, Department, Year, Registration URL, Capacity, Poster/image, Status.

**Statuses:** `DRAFT → SCHEDULED/UPCOMING → LIVE → COMPLETED → ARCHIVED`, with a `CANCELLED` branch reachable from SCHEDULED/UPCOMING or LIVE.

- **Browsing**: card grid with poster, title, date, venue, category chip; upcoming events sorted soonest-first.
- **Searching/Filtering**: by category, department, date range, "open for registration" toggle.
- **Viewing details**: full description, logistics, eligibility, capacity/seats-remaining if tracked, and a registration action (external URL in V1 — in-app registration/capacity tracking is a Version 1 fast-follow, not MVP, since it implies backend state not required for a read-mostly V1 events feature).
- **Creating/Editing**: same author-locked-category-until-publish pattern as Announcements where relevant (Faculty locked to own department).
- **Publishing/Cancelling/Rescheduling**: Cancelling shows a clear "Cancelled" badge and notifies prior viewers/registrants (requires backend support). Rescheduling updates date/time and flags the event as "Updated" for a short window so returning users notice the change instead of silently trusting a stale mental model.
- **Archiving**: automatic after End date/time + retention window, or manual.

---

## 20. Query Product

**Flow:** Student → Submit Query (Category → Question → Optional Attachment) → Submit.

**Categories** (mirroring relevant Notification Categories where sensible, plus a catch-all): Academic, Examination, Hostel, Administration, Library, Transportation, General/Other.

**Priority:** LOW / NORMAL / URGENT (student-suggested at submission, Admin/Faculty can re-prioritize on assignment — a student cannot force URGENT handling by self-declaring it without oversight).

**Lifecycle:** `PENDING → ASSIGNED → IN_PROGRESS → ANSWERED → CLOSED`, with a `REOPENED` state reachable from ANSWERED or CLOSED within a defined reopen window (e.g., 7 days — exact figure §36).

- **Assignment**: Admin assigns to a Faculty member or department queue; Faculty can also self-claim from their department's unassigned queue.
- **Responses**: threaded, single query ↔ single resolution thread (not open multi-party chat in V1).
- **Student notifications**: status-change and new-response notifications, respecting the student's Notification Preferences except that a response to *their own* open query is treated as a direct, always-delivered in-app item (not muteable — it's a 1:1 reply, not a broadcast category).
- **Reopening**: student-initiated from ANSWERED/CLOSED within the reopen window; reopening returns it to IN_PROGRESS with the original assignee notified first.
- **Query history**: visible to the student for their own queries; Admin sees all; Faculty see only what's assigned/was-assigned to them.
- **Attachments**: same type/size/honest-success constraints as §18.
- **Status visibility**: a persistent, plain-language status chip (e.g., "Waiting for response," "Answered") rather than raw enum text.
- **Expected response experience**: an author-facing SLA expectation string shown to the student at submission (e.g., "Typical response time: 2–3 business days" — informational copy only, not a contractual guarantee, exact wording finalized with Admin/ops input, §36).

---

## 21. Authentication UX

**Registration**: Admin-provisioned in V1 (institutional accounts), not open self-registration — consistent with role being server-assigned and the institution needing to control who gets an account at all. A self-registration flow with Admin approval is a Version 1 candidate, not MVP (open item, §36).

**Login**: institutional email/ID + password. Success routes to the role-based landing page (§22/26–28). Failure shows a generic "Invalid email or password" (never reveals which field was wrong — enumeration control).

**Logout**: immediate session termination, redirect to Login, no cached authenticated views reachable via back-button (requires care in Part 2/3 session design, flagged here as a UX requirement: back-navigation after logout must show Login, not a stale authenticated page).

**Forgot Password / Reset Password**: neutral response always shown — *"If an account exists for this email, a reset link has been sent."* — regardless of whether the email exists (§0/§17 anti-enumeration requirement, applied literally). Reset link flow: token-based reset page (Part 2 defines the mechanism), success state confirms and redirects to Login, expired/invalid token shows a clear "This link has expired — request a new one" state rather than a generic error.

**Session Expiration**: mid-action expiration shows a non-destructive interstitial ("Your session expired — please log in again") that preserves unsaved form input where feasible (e.g., a draft announcement) rather than discarding it.

**Account Activation/Deactivation**: Admin-triggered; a deactivated user attempting login sees a distinct, honest message ("Your account is inactive — contact your administrator") rather than being folded into the generic invalid-credentials message (this is an intentional exception to strict enumeration-hiding, because account status here is an administrative fact the institution wants surfaced, not a secret — flagged as a product decision in §36 since it's a deliberate tradeoff against pure anti-enumeration purism).

**Repeated failed logins**: generic lockout/cooldown messaging (e.g., "Too many attempts — try again in a few minutes") without exposing the exact threshold or remaining attempts count.

**Form/validation/error/loading/success/failure states**: standard inline validation on blur, disabled-submit-until-valid pattern avoided in favor of submit-time validation with field-level error anchoring (better for screen readers and avoids the "why is Submit greyed out" complaint) — loading state is a spinner + disabled form (not a full-page block, so context isn't lost); success reflects actual backend confirmation only (§0/§17, restated as a hard UX law, not optional polish).

---

## 22. Complete User Journeys

### Student
1. **Registration** (Admin-provisioned) → receives credentials/setup email → sets password on first login.
2. **Login** → role-based redirect to Student Dashboard.
3. **First-time setup** → prompted to review/complete optional profile fields (Phone, Personal Email) and Notification Preferences defaults; skippable.
4. **Dashboard** → sees priority-sorted feed snapshot.
5. **Reading a notification** → tap from feed or Notification Center → detail view → auto-marked read.
6. **Searching an announcement** → Announcements page → search/filter → results → detail.
7. **Viewing an event** → Events page → card → detail → (external) registration link.
8. **Submitting a query** → Queries → New Query → category/question/attachment → confirmation with tracking status.
9. **Tracking a query** → Queries → My Queries → status chip → thread view.
10. **Updating preferences** → Settings → Notification Preferences → per-category toggles → immediate save confirmation.
11. **Logout** → confirmation not required (low-risk, reversible action) → redirect to Login.

### Faculty
1. **Login** → Faculty Dashboard.
2. **View notifications** → Notification Center (department-scoped + broadcast).
3. **Create authorized announcement** → New Announcement (category locked to allowed set) → target step (department pre-locked) → preview.
4. **Schedule/publish** → confirmation step → published or scheduled state shown on Manage Announcements list.
5. **Create event** → New Event (department pre-locked) → publish.
6. **Respond to query** → Assigned Queries → open thread → respond → status auto-advances to ANSWERED.
7. **Manage profile** → Profile/Settings (no role field present).

### Admin
1. **Login** → Admin Dashboard.
2. **Create user** → User Management → New User → role + academic/hostel fields as applicable.
3. **Manage academic structure** → Academic Structure page → add/edit Department/Branch/Year/Section.
4. **Manage hostel** → Hostel Management → add/edit Hostel/Block/Room.
5. **Publish announcement** → same as Faculty flow, full category/scope access.
6. **Create targeted notification** → Notification Management → target step (§15) with full attribute set.
7. **Manage event** → Event Management → any department scope.
8. **Assign query** → Query Management → unassigned queue → assign to Faculty/department.
9. **Review analytics** → Analytics page → system-wide reach/read metrics.
10. **Review audit logs** → Audit Logs → filter by actor/action/date.

---

## 23. Final Website Page Map

*(Consolidated deliberately — not a copy of the candidate list. Rationale noted inline.)*

**Public**
```text
Home
Login
Register            — Admin-only entry point in V1 UX; see §21/§36
Forgot Password
Reset Password
```
*(About merged into Home as a footer/section rather than a separate route — no content volume justifies a dedicated page yet.)*

**Shared, role-rendered (one route, content/actions vary by role)**
```text
Dashboard
Notification Center
Profile
Settings (incl. Notification Preferences)
```

**Student**
```text
Announcements (list)          — includes Placements & Careers via category filter, no separate Placements page
Announcement Details
Events (list)
Event Details
Queries (My Queries list)
Submit Query
Query Details
```

**Faculty**
```text
Announcement Management (list + inline Create/Edit — one page, not split "Create" + "Manage")
Event Management (list + inline Create/Edit)
Assigned Queries (list)
Query Details
```

**Admin**
```text
User Management            — Students + Faculty as tabs of one page, not two
Academic Structure          — Department + Branch/Program + Year + Section, hierarchical, one page
Hostel Management
Announcement Management     — full category access, superset of Faculty's view
Event Management            — superset of Faculty's view
Notification Management     — categories + targeted/emergency broadcast composer
Query Management            — all queries + assignment
Analytics
Audit Logs
System Settings
```

**Consolidation rationale:** Student Management + Faculty Management → one **User Management** page with role tabs (shared table/filter chrome, avoids duplicated UI for what is fundamentally one CRUD surface over "users"). Department + Branch/Program + Academic Structure → one **Academic Structure** page (they are one hierarchy, not three independent concerns). Faculty's "Create Announcement" + "Manage Announcements" → one page with inline create (industry-standard pattern; a separate creation route adds navigation cost without product benefit). Placements & Careers → a category filter, not a page, since its content *is* Announcements/Events content, just filtered — a dedicated page would either duplicate the Announcements list or fragment placement content across two surfaces.

---

## 24. Page-by-Page Specifications

*(21-field template applied to each final page. Fields are kept concise; "N/A" marks fields with no meaningful state for that page.)*

### 24.1 Home
1. **Route**: `/`
2. **Purpose**: Public landing, orient a visitor, route to Login.
3. **Roles**: Public (unauthenticated)
4. **Main sections**: Hero/value prop, brief "how it works," footer with About content + contact.
5. **Primary actions**: Login
6. **Secondary actions**: N/A (Register is Admin-gated, not a public CTA — see §21)
7. **Data displayed**: Static marketing/informational content
8. **Filters**: N/A
9. **Search**: N/A
10. **Forms**: N/A
11. **API dependency**: None (fully static)
12. **Loading**: Standard page skeleton
13. **Empty**: N/A
14. **Error**: Generic public error page if hosting-level failure
15. **Success**: N/A
16. **Unauthorized**: N/A (fully public)
17. **Forbidden**: N/A
18. **Session-expired**: N/A
19. **Mobile**: Single-column, hero condensed, nav collapses to hamburger
20. **Accessibility**: Landmark regions, skip-to-content link, heading hierarchy from h1

### 24.2 Login
1. **Route**: `/login`
2. **Purpose**: Authenticate and route by role
3. **Roles**: Public
4. **Main sections**: Credential form, Forgot Password link
5. **Primary actions**: Submit login
6. **Secondary actions**: Go to Forgot Password
7. **Data displayed**: None (input only)
8. **Filters/Search**: N/A
9. **Forms**: Email/ID + Password
10. **API dependency**: Auth service (requires backend support, Part 2)
11. **Loading**: Spinner on submit button, form disabled during request
12. **Empty**: N/A
13. **Error**: Generic invalid-credentials message; distinct "account inactive" message (§21)
14. **Success**: Redirect to role-based Dashboard
15. **Unauthorized**: N/A (this is the entry point)
16. **Forbidden**: N/A
17. **Session-expired**: N/A (arriving here already implies no session)
18. **Mobile**: Full-width form, no layout shift on error
19. **Accessibility**: Field-level error association via `aria-describedby`, visible focus states, label-for-every-input

### 24.3 Register (Admin-only entry point)
1. **Route**: `/register` (or fully removed from public nav; reachable only via Admin-issued invite link — decision flagged §36)
2. **Purpose**: First-time password setup for an Admin-provisioned account
3. **Roles**: Public, but token-gated
4. **Main sections**: Invite-token validation, password-set form
5. **Primary actions**: Set password
6. **Secondary actions**: N/A
7. **Data displayed**: Pre-filled name/email from invite (read-only, never role)
8. **Filters/Search**: N/A
9. **Forms**: New password + confirm
10. **API dependency**: Invite/token validation (Part 2)
11. **Loading**: Spinner during token validation and submit
12. **Empty**: N/A
13. **Error**: Invalid/expired token → clear message + "contact your administrator"
14. **Success**: Redirect to Login with confirmation banner
15. **Unauthorized**: Invalid token treated as error state above
16. **Forbidden**: N/A
17. **Session-expired**: N/A
18. **Mobile**: Single-column form
19. **Accessibility**: Password strength feedback announced via `aria-live`

### 24.4 Forgot Password
1. **Route**: `/forgot-password`
2. **Purpose**: Initiate reset without confirming account existence
3. **Roles**: Public
4. **Main sections**: Email input form
5. **Primary actions**: Submit
6. **Secondary actions**: Back to Login
7. **Data displayed**: None
8–10. **Filters/Search/Forms**: Single email field
11. **API dependency**: Reset-initiation endpoint (Part 2)
12. **Loading**: Spinner on submit
13. **Empty**: N/A
14. **Error**: Only for malformed input (e.g., not an email) — never "no account found"
15. **Success**: Neutral message always shown (§21 anti-enumeration)
16–18. **Unauthorized/Forbidden/Session-expired**: N/A
19. **Mobile**: Single-column
20. **Accessibility**: Success message announced via `aria-live` region

### 24.5 Reset Password
1. **Route**: `/reset-password/{token}` (opaque token, non-guessable)
2. **Purpose**: Complete password reset
3. **Roles**: Public, token-gated
4–19: mirrors 24.3's pattern (token validation → new password form → success redirect to Login → expired-token honest state), with accessibility parity (password requirements announced, not color-only strength meter).

### 24.6 Dashboard (role-rendered)
1. **Route**: `/dashboard`
2. **Purpose**: Personalized priority-sorted snapshot
3. **Roles**: Student, Faculty, Admin (content varies — see §26–28)
4. **Main sections**: Role-specific widgets (per §26–28)
5. **Primary actions**: Role-specific quick actions
6. **Secondary actions**: Jump to full Notification Center / relevant management page
7. **Data displayed**: Aggregated, role-scoped
8. **Filters**: N/A (summary view; full filtering lives on dedicated list pages)
9. **Search**: N/A
10. **Forms**: N/A
11. **API dependency**: Aggregation endpoints (Part 2)
12. **Loading**: Skeleton cards per widget, load independently (no single blocking spinner)
13. **Empty**: Friendly empty-state per widget ("No urgent notifications right now")
14. **Error**: Per-widget error state with retry, not a full-page failure
15. **Success**: N/A (informational page)
16. **Unauthorized**: Redirect to Login if no session
17. **Forbidden**: N/A (role always has a Dashboard)
18. **Session-expired**: Interstitial per §21
19. **Mobile**: Widgets stack vertically, priority order preserved
20. **Accessibility**: Widget landmarks, logical tab order matching visual priority order

### 24.7 Notification Center
1. **Route**: `/notifications`
2. **Purpose**: Complete, filterable feed of all notifications for the user
3. **Roles**: Student, Faculty, Admin
4. **Main sections**: Tab bar (All/Unread/Read/Important/Urgent/Emergency), category chips, search, feed list
5. **Primary actions**: Mark read, Mark all read
6. **Secondary actions**: Open detail, filter/search
7. **Data displayed**: Priority-sorted notification list per §16
8. **Filters**: Category, priority, date range, read state
9. **Search**: Free-text over title/content
10. **Forms**: N/A
11. **API dependency**: Notification feed + read-state endpoints (Part 2)
12. **Loading**: Skeleton list rows, infinite-scroll spinner at bottom
13. **Empty**: "You're all caught up" state (distinct copy from a filtered-to-empty state, e.g., "No results match your filters")
14. **Error**: Inline retry banner, preserves already-loaded items
15. **Success**: Toast on "mark all read"
16. **Unauthorized**: Redirect to Login
17. **Forbidden**: N/A
18. **Session-expired**: Interstitial, preserves current filter state on re-login
19. **Mobile**: Filters collapse into a sheet/drawer; feed remains single-column
20. **Accessibility**: Live region announces new-unread arrivals; EMERGENCY banner has `role="alert"`

### 24.8 Announcement Details / Event Details / Query Details
*(Templated together — same shape, different data.)*
1. **Route**: `/announcements/{slug-or-uuid}`, `/events/{slug-or-uuid}`, `/queries/{uuid}` — **non-sequential identifiers, never raw incrementing IDs** (§0 requirement, applied to every record-specific route in this spec)
2. **Purpose**: Full content view
3. **Roles**: Whoever the item was targeted to (+ author + Admin)
4. **Main sections**: Full content/attachment/venue-logistics/thread (per type), metadata (author, date, category, priority)
5. **Primary actions**: Mark read (Announcement/Notification) / Register externally (Event) / Reply (Query, role-dependent)
6. **Secondary actions**: Share/copy link (internal), print/download attachment
7. **Data displayed**: Full record
8–10. **Filters/Search/Forms**: N/A (Query Details has a reply form for Faculty/Admin)
11. **API dependency**: Detail-fetch by identifier (Part 2)
12. **Loading**: Skeleton detail layout
13. **Empty**: N/A (record either exists or 404s)
14. **Error**: Generic fetch-failure with retry
15. **Success**: Reply-submitted confirmation (Query only)
16. **Unauthorized**: Redirect to Login if unauthenticated
17. **Forbidden**: Explicit "You don't have access to this item" (not a 404 masquerade — a targeted item outside your audience should read as forbidden, not "doesn't exist," since 404-masking here would confuse legitimate users far more than it protects anything sensitive)
18. **Session-expired**: Interstitial, returns to same detail page after re-login
19. **Mobile**: Single-column, attachment/poster collapses above the fold
20. **Accessibility**: Heading hierarchy, attachment links carry descriptive text (not "click here")

### 24.9 Announcements (list) / Events (list) / Queries (My Queries / Assigned / Management)
*(Templated — list-page shape shared across student/faculty/admin variants with scope differing.)*
1. **Route**: `/announcements`, `/events`, `/queries`
2. **Purpose**: Browse/search/filter the relevant record type within the viewer's authorized scope
3. **Roles**: Scope varies (Student: targeted-to-them only; Faculty: department + assigned; Admin: all)
4. **Main sections**: Filter bar, search, result list/table, (Faculty/Admin) inline create entry point
5. **Primary actions**: Open detail; (Faculty/Admin) Create new
6. **Secondary actions**: Filter, search, sort, export (Admin analytics-adjacent lists only)
7. **Data displayed**: Paginated/scrolled list of records with status chips
8. **Filters**: Category, priority/status, date range, (Admin) department/author
9. **Search**: Title/content free-text
10. **Forms**: Inline create/edit drawer or modal for authorized roles
11. **API dependency**: List + filter endpoints (Part 2)
12. **Loading**: Skeleton rows
13. **Empty**: Distinct copy for "no records exist yet" vs. "no results for current filters"
14. **Error**: Inline retry, preserves filter state
15. **Success**: Toast confirmation on create/edit/publish
16. **Unauthorized**: Redirect to Login
17. **Forbidden**: Create/Edit controls simply absent for Student (not disabled-with-tooltip — absence, per §5's role-boundary principle)
18. **Session-expired**: Interstitial, filter/search state preserved
19. **Mobile**: Table → card list transformation; filters in a collapsible sheet
20. **Accessibility**: Table semantics (`<table>`/ARIA grid as appropriate) or list semantics for card view; sort controls keyboard-operable

### 24.10 Submit Query
1. **Route**: `/queries/new`
2. **Purpose**: Structured query submission
3. **Roles**: Student
4. **Main sections**: Category select, question textarea, optional attachment
5. **Primary actions**: Submit
6. **Secondary actions**: Save as draft (optional nice-to-have, not MVP-blocking)
7. **Data displayed**: SLA-expectation copy (§20)
8–9. **Filters/Search**: N/A
10. **Forms**: Category, Question (required), Attachment (optional)
11. **API dependency**: Query-creation endpoint (Part 2)
12. **Loading**: Spinner on submit, form locked during request
13. **Empty**: N/A
14. **Error**: Field-level validation; attachment-rejection messaging per §20
15. **Success**: Confirmation with tracking status + link to Query Details
16. **Unauthorized**: Redirect to Login
17. **Forbidden**: N/A (Student-only route, others simply don't have it in nav)
18. **Session-expired**: Interstitial, preserves drafted text where feasible
19. **Mobile**: Single-column form, attachment picker uses native file input
20. **Accessibility**: Required-field indication both visually and via `aria-required`

### 24.11 Profile / Settings
1. **Route**: `/profile`, `/settings`
2. **Purpose**: View/edit self-service fields; manage Notification Preferences
3. **Roles**: Student, Faculty, Admin
4. **Main sections**: Read-only administrative fields (clearly labeled "Managed by Admin"), editable personal fields, Notification Preferences panel (§17), password change
5. **Primary actions**: Save changes
6. **Secondary actions**: Change password
7. **Data displayed**: Full profile per role's field set (§8/§9); role field itself is **not rendered as an editable control anywhere on this page**
8–10. **Filters/Search/Forms**: Edit forms per field group
11. **API dependency**: Profile read/update endpoints (Part 2)
12. **Loading**: Skeleton form
13. **Empty**: N/A
14. **Error**: Field-level validation errors
15. **Success**: Inline confirmation + toast, no full-page reload
16. **Unauthorized**: Redirect to Login
17. **Forbidden**: N/A (always accessible to self)
18. **Session-expired**: Interstitial, unsaved edits preserved where feasible with a warning
19. **Mobile**: Sectioned accordion instead of a long single-column scroll
20. **Accessibility**: Grouped fieldsets with legends, save-confirmation announced via `aria-live`

### 24.12 Admin: User Management
1. **Route**: `/admin/users`
2. **Purpose**: CRUD over Student + Faculty accounts, role assignment, activation/deactivation
3. **Roles**: Admin
4. **Main sections**: Role tabs (Students/Faculty), filter/search table, Create User action
5. **Primary actions**: Create, edit, activate/deactivate
6. **Secondary actions**: Reset a user's password (trigger reset flow on their behalf), bulk actions (V1 fast-follow)
7. **Data displayed**: Name, ID, department/role-relevant fields, account status — sensitive fields (§8) visible here since Admin is an authorized viewer
8. **Filters**: Role, department, year/section, account status
9. **Search**: Name/ID/email
10. **Forms**: Create/Edit User (includes the role selector — the **only** place role is ever settable)
11. **API dependency**: User CRUD endpoints (Part 2)
12. **Loading**: Skeleton table
13. **Empty**: "No users match your filters" vs. genuinely empty system state
14. **Error**: Inline retry, row-level error on failed single-row action
15. **Success**: Toast per action (created/updated/deactivated)
16. **Unauthorized**: Redirect to Login
17. **Forbidden**: Non-Admin roles never see this route rendered or in nav
18. **Session-expired**: Interstitial, table filters preserved
19. **Mobile**: Table → stacked card rows with a "..." action menu
20. **Accessibility**: Action menu keyboard-operable, destructive actions (deactivate) require explicit confirmation dialog

### 24.13 Admin: Academic Structure
1. **Route**: `/admin/academic-structure`
2. **Purpose**: Manage Department/Branch/Year/Section hierarchy
3. **Roles**: Admin
4. **Main sections**: Tree/hierarchical view, add/edit/deactivate per level
5. **Primary actions**: Add node at any level
6. **Secondary actions**: Rename, deactivate (never hard-delete a level with existing student records tied to it — deactivate + reassign path instead)
7. **Data displayed**: Hierarchy with student-count per node
8. **Filters**: Search-by-name within the tree
9. **Search**: Yes (as above)
10. **Forms**: Add/Edit node (name, parent, active status)
11. **API dependency**: Structure CRUD endpoints (Part 2)
12. **Loading**: Skeleton tree
13. **Empty**: Prompt to create the first Department
14. **Error**: Inline, node-level
15. **Success**: Toast per change
16–17. **Unauthorized/Forbidden**: Admin-only, same pattern as 24.12
18. **Session-expired**: Interstitial, tree-expansion state preserved where feasible
19. **Mobile**: Tree collapses to a drill-down (breadcrumb) navigation instead of nested indentation
20. **Accessibility**: Tree implemented with proper ARIA tree/treeitem roles or an equivalent accessible pattern, not div-soup

### 24.14 Admin: Hostel Management
Mirrors 24.13's shape over `Hostel → Block → Room` (Floor as a record attribute, not a targeting node — §12).

### 24.15 Admin: Announcement Management / Event Management (Admin superset)
Mirrors 24.9's list-page template with full unrestricted category/department scope and the inline create/edit drawer unlocked to all fields (no department lock, all categories including Emergency for Notification composer specifically — see 24.16).

### 24.16 Admin: Notification Management
1. **Route**: `/admin/notifications`
2. **Purpose**: Category configuration + the emergency/targeted broadcast composer distinct from Announcements (a raw push-style notification, not necessarily tied to a full announcement record)
3. **Roles**: Admin
4. **Main sections**: Category list (rename/reorder — the 11 categories are fixed at launch, not addable in V1 per §10 Future), Broadcast composer with the full targeting flow (§15) and Emergency toggle
5. **Primary actions**: Send/Publish broadcast
6. **Secondary actions**: Save as template (V1 fast-follow)
7. **Data displayed**: Category settings, recent broadcasts sent
8–10. **Filters/Search/Forms**: Broadcast composer form (title, body, category, priority, targeting)
11. **API dependency**: Broadcast + category endpoints (Part 2)
12. **Loading**: Standard form skeleton
13. **Empty**: N/A
14. **Error**: Field validation; recipient-count-zero guard per §15
15. **Success**: Confirmation restating recipient count and delivery time, toast + persisted entry in "recent broadcasts"
16–17. **Unauthorized/Forbidden**: Admin-only
18. **Session-expired**: Interstitial; an in-progress Emergency broadcast draft is preserved, never silently lost
19. **Mobile**: Full-width composer, targeting filters in a stepper rather than a dense form (touch-friendlier)
20. **Accessibility**: Emergency toggle has an explicit confirmation step (cannot be triggered by a single accidental tap) and is announced via `aria-live` on activation

### 24.17 Admin: Query Management
Mirrors 24.9 with full-scope visibility + an Assign action per row/detail.

### 24.18 Admin: Analytics
1. **Route**: `/admin/analytics`
2. **Purpose**: System-wide reach/read/engagement metrics
3. **Roles**: Admin
4. **Main sections**: Delivery/read-rate charts by category/department/priority, top-line counters
5. **Primary actions**: Change date range
6. **Secondary actions**: Export (V1 fast-follow), drill into a specific announcement's stats
7. **Data displayed**: Aggregate counts and rates only — never a per-student read/unread list surfaced here (that level of individual tracking, if ever needed, is a deliberate Part 2/3 privacy discussion, not assumed)
8. **Filters**: Date range, category, department
9. **Search**: N/A
10. **Forms**: N/A
11. **API dependency**: Analytics aggregation endpoints (Part 2)
12. **Loading**: Skeleton charts
13. **Empty**: "Not enough data yet for this range"
14. **Error**: Inline retry per chart
15. **Success**: N/A (read-only page)
16–17. **Unauthorized/Forbidden**: Admin-only
18. **Session-expired**: Interstitial, filters preserved
19. **Mobile**: Charts stack vertically, simplified to key metrics first
20. **Accessibility**: Charts paired with a data-table alternative view (not visual-only)

### 24.19 Admin: Audit Logs
1. **Route**: `/admin/audit-logs`
2. **Purpose**: Attributable history of sensitive actions (publish, edit, delete, role-change, activation/deactivation)
3. **Roles**: Admin
4. **Main sections**: Filterable log table
5. **Primary actions**: Filter/search
6. **Secondary actions**: View linked record (e.g., jump to the announcement that was edited)
7. **Data displayed**: Actor, action, target, timestamp
8. **Filters**: Actor, action type, date range
9. **Search**: Free-text over actor/target
10. **Forms**: N/A
11. **API dependency**: Audit log query endpoint (Part 2/3)
12. **Loading**: Skeleton table
13. **Empty**: "No matching audit events"
14. **Error**: Inline retry
15. **Success**: N/A (read-only)
16–17. **Unauthorized/Forbidden**: Admin-only
18. **Session-expired**: Interstitial, filters preserved
19. **Mobile**: Table → stacked rows
20. **Accessibility**: Standard table semantics, sortable columns keyboard-accessible

### 24.20 Admin: System Settings
1. **Route**: `/admin/settings`
2. **Purpose**: Institution-level configuration (academic calendar dates, retention windows, query reopen window, SLA copy — see open items §36)
3. **Roles**: Admin
4. **Main sections**: Grouped settings panels
5. **Primary actions**: Save
6. **Secondary actions**: Reset to default (per panel)
7. **Data displayed**: Current configuration values
8–10. **Filters/Search/Forms**: Settings forms per panel
11. **API dependency**: Settings CRUD (Part 2)
12. **Loading**: Skeleton form
13. **Empty**: N/A
14. **Error**: Field validation
15. **Success**: Toast + inline "Saved" state
16–17. **Unauthorized/Forbidden**: Admin-only
18. **Session-expired**: Interstitial, unsaved changes flagged
19. **Mobile**: Settings panels as an accordion
20. **Accessibility**: Grouped fieldsets, save-state announced

---

## 25. Navigation Architecture

- **Public header**: Logo, Home, Login. No Register link surfaced publicly (§21/§36).
- **Student sidebar**: Dashboard, Notifications, Announcements, Events, Queries, Profile/Settings.
- **Faculty sidebar**: Dashboard, Notifications, Announcement Management, Event Management, Assigned Queries, Profile/Settings.
- **Admin sidebar**: Dashboard, User Management, Academic Structure, Hostel Management, Announcement Management, Event Management, Notification Management, Query Management, Analytics, Audit Logs, System Settings, Admin Profile.
- **Header (authenticated)**: Search (global, scoped to role-visible content), Notification bell + badge, Profile menu (Profile, Settings, Logout).
- **Mobile navigation**: Bottom tab bar for the 3–4 most-used destinations per role (Student: Dashboard/Notifications/Announcements/Queries; Faculty: Dashboard/Notifications/Manage/Queries; Admin: Dashboard/Users/Content/More), with a "More" overflow into a full sidebar drawer for the rest.
- **Breadcrumbs**: shown on nested/detail pages (e.g., Admin > Academic Structure > CSE > Year 3) and on all Detail pages (List Page Name > Item Title).
- **Profile menu**: avatar/initials, name, role label (display-only, never editable here), Settings, Logout.
- **Notification badge**: on the bell icon, per §16 counting rules.
- **Quick actions**: role-appropriate (Faculty/Admin get a persistent "+ Create" affordance near their content management sections; Students do not see create affordances anywhere, consistent with §7).

**Enforcement principle**: unauthorized controls are absent from the rendered nav and route table for that role — not hidden via CSS `display:none` and not disabled-with-tooltip. A Student's client bundle should not even reference Admin-only route components in a way that implies their existence.

---

## 26. Student Dashboard

**Content, in priority order:**
1. Welcome + Profile Summary (name, department/year/section chip)
2. Emergency banner (if any active — always first, per §14, regardless of other widget order)
3. Urgent Notifications widget
4. Latest Announcements (recency + relevance blended)
5. Upcoming Events (soonest first, department/interest-relevant)
6. Placement Updates (filtered Announcements/Events, category = Placements & Careers)
7. Academic Updates
8. Hostel Updates (only rendered at all if the student is a Hosteller — day scholars simply don't see this widget, not an empty one)
9. Query Status (open queries snapshot)
10. Quick Actions (Submit Query, View All Notifications)
11. Calendar (upcoming exam/event dates, lightweight, links out to full Events)
12. Recent Activity (their own read history — optional, low priority, V1 fast-follow candidate if it doesn't fit MVP)

Ordering logic: Emergency → Urgent → Important → Relevant (department/personal match) → General, then recency as tiebreaker within a tier — matching §14/§21's stated priority ladder exactly.

---

## 27. Faculty Dashboard

**Content:** Profile, Important Notifications, Department Updates, Upcoming Events (own department), Create Announcement (quick action), Manage Announcements (quick link), Student Queries (assigned queue snapshot), Quick Actions, Recent Activity (their own authored-content activity).

Only actions the specific Faculty member is authorized for render — e.g., a Faculty member with zero assigned queries doesn't see a queue widget claiming "0 pending" as if it's a normal steady state worth a whole card; it collapses to a one-line status instead, avoiding dashboard clutter that implies false importance.

---

## 28. Admin Dashboard

**Metrics, each with a clear justification (per "no meaningless metrics" instruction):**

| Metric | Why it belongs |
|---|---|
| Total Students / Total Faculty | Baseline system scale, sanity-check for onboarding progress |
| Active Users (recent login activity) | Adoption health signal |
| Recent Registrations | New-account onboarding visibility |
| Published Announcements (this period) | Sender activity/throughput |
| Urgent + Emergency Notifications (active) | Immediate operational awareness — surfaced prominently, not buried in a list |
| Upcoming Events | Cross-check against Event Management without navigating away |
| Pending Queries | Operational backlog visibility (staffing/SLA signal) |
| Hostellers count | Feeds hostel-targeting sanity checks |
| Departments count | Structural sanity-check |
| Notification Statistics (delivery/read rate summary) | Links to full Analytics, gives the headline number without a full page load |
| Recent Activity (system-wide, from Audit Logs) | Fast anomaly-spotting without opening Audit Logs |
| System Health | Uptime/error-rate summary (data source defined in Part 2/3 — this dashboard only consumes it) |

Deliberately excluded: vanity counters with no operational use (e.g., raw page-view counts) — flagged as "avoid meaningless metrics" compliance.

---

## 29. UI/UX Design System

**Brand personality**: Clear, trustworthy, efficient — a utility the campus relies on, not a marketing site. Calm by default; visually loud only where genuine urgency exists (Emergency/Urgent), so that urgency signaling isn't diluted by decorative noise elsewhere.

**Color palette** (roles, not literal hex — finalize hex/token values against the existing Tailwind config in Part 2/3 implementation, since "improve rather than replace" applies to design tokens too):
- Neutral/background scale (light + dark-mode-ready neutrals)
- One primary brand accent (used for primary actions, active nav state)
- Semantic scale: Info (Low/Normal), Success, Warning (Important/Urgent), Danger (Emergency) — each paired with an icon, never color-only (WCAG 1.4.1, applied system-wide, not just to notification priority).

**Typography**: One clear type scale (display/heading/body/caption), a single font family for UI text (a distinct monospace only if code/IDs need it — unlikely in this product), generous line-height for readability on long announcement bodies.

**Spacing/Radius/Shadows**: A consistent spacing scale (4/8px-based rhythm), moderate border-radius (rounded but not pill-shaped everywhere — avoids the "generic template" look explicitly called out as unwanted), subtle elevation shadows reserved for overlays/modals/dropdowns, not applied to every card (flat cards + one elevation tier for popovers reads as more "polished SaaS" than shadow-on-everything).

**Components** (behavioral notes only, no visual code, per scope fence):
- **Buttons**: primary/secondary/destructive/ghost variants; destructive actions always require a confirmation dialog, never a bare button.
- **Cards**: used for feed items, events, dashboard widgets — never the sole layout primitive (tables/lists used where they fit better, avoiding the "collection of plain rectangular cards" anti-pattern named explicitly in the brief).
- **Tables**: for Admin management surfaces; responsive collapse to stacked rows on mobile.
- **Forms/Inputs/Selects/Dropdowns**: consistent label placement (above field, not placeholder-as-label — placeholder-only labels fail accessibility and disappear on input, actively harmful here).
- **Modals/Dialogs**: reserved for focused, blocking decisions (confirmations, quick create); anything long-form (full announcement creation) is a full page/drawer, not a modal, to avoid cramped forms.
- **Toasts**: transient success/error feedback, auto-dismiss with a manual dismiss option, never used for content requiring action (that's a banner or dialog instead).
- **Alerts/Banners**: persistent, in-context; the Emergency banner is the one alert type that is deliberately impossible to visually miss.
- **Badges**: category/priority/status labeling, always paired with text (never a bare colored dot as the only signal).
- **Tabs/Pagination**: tabs for view-switching (Notification Center filters), pagination for comparison-heavy tabular data (Admin lists), infinite scroll for consumption feeds (§16).
- **Empty/Skeleton/Error states**: every list/detail surface in §24 has explicit, distinct copy for each — never a shared generic "Nothing here" or "Something went wrong" across unrelated contexts.
- **Confirmation dialogs**: for all destructive or irreversible-feeling actions (deactivate user, publish Emergency, delete draft).
- **Icons**: one consistent icon set throughout; icons never stand alone as the sole meaning-carrier for anything status-related.

---

## 30. Role-Specific Visual Experience

One coherent NotifyHub brand system; role differentiation is achieved through **emphasis and information density**, not separate palettes or component sets:
- **Student**: lighter information density, larger touch targets, feed-forward layout — optimized for quick daily scanning.
- **Faculty**: slightly denser, action-oriented (create/manage affordances more prominent), still calm.
- **Admin**: highest information density, table-forward, management-oriented — more visible structure (breadcrumbs, filters) since Admin tasks are inherently more complex.

All three share identical color tokens, typography, and core components — only layout density and which components dominate a given screen change.

---

## 31. Responsive Design

| Element | Desktop/Laptop | Tablet | Mobile |
|---|---|---|---|
| Sidebar | Persistent, expanded | Collapsible, icon-only default | Replaced by bottom tab bar + drawer (§25) |
| Header | Full search + icons + profile | Same, search may collapse to icon-triggered | Condensed: logo, notification bell, profile avatar only |
| Tables | Full columns | Priority columns + horizontal scroll for rest | Stacked card rows (§24 pattern, applied consistently) |
| Cards | Grid, 3–4 columns | 2 columns | Single column |
| Forms | Multi-column where logical (e.g., name/email side-by-side) | Mostly single column | Always single column, larger touch targets |
| Notification lists | Full-width feed with side detail panel option | Full-width feed | Full-width feed, tap-through to detail (no split view) |
| Modals | Centered, fixed max-width | Same | Full-screen sheet, not a small centered box |
| Filters | Inline filter bar | Inline, may wrap | Collapsible bottom sheet/drawer (§16/§24) |
| Dashboards | Multi-column widget grid | 2-column | Single-column stacked widgets, priority order preserved (§26) |

---

## 32. Accessibility (WCAG 2.2 AA target)

- **Keyboard navigation**: every interactive element (including custom dropdowns, tabs, tree views in §24.13) reachable and operable via keyboard alone, in a logical order matching visual layout.
- **Focus indicators**: visible, high-contrast focus rings on all interactive elements — never removed via CSS reset without a visible replacement.
- **Screen readers**: semantic HTML first (real `<button>`, `<table>`, `<nav>`); ARIA only to fill genuine gaps (custom tree, live regions for toasts/Emergency banners/new-notification arrival).
- **Labels**: every form field has a persistent, associated label — never placeholder-only (per §29).
- **Error messages**: programmatically associated with their field, described in plain language, announced via live region on submit failure.
- **Contrast**: text and meaningful icons meet AA contrast against their background in both light content and semantic-color states (Warning/Danger colors chosen with contrast checked, not just "looks urgent").
- **Forms**: logical tab order, grouped fieldsets with legends for related fields (e.g., targeting filters in §15).
- **Modals**: focus trapped within while open, returns to the triggering element on close, `Esc` closes non-destructive modals.
- **Tables**: proper header association (`<th scope>`), sortable columns announce sort state.
- **Notifications**: Emergency/new-arrival content uses `aria-live="assertive"` sparingly and only for genuinely urgent interruptions; routine updates use polite live regions or none at all (assertive-everywhere would be as harmful as silence).
- **Responsive typography**: relative units (rem) so user browser zoom/font-size preferences are respected; no fixed-pixel text that resists zoom.

---

## 33. Search & Filtering

| Area | Search needed? | Fields | Filters | Sorting | Pagination | Empty results | Mobile |
|---|---|---|---|---|---|---|---|
| Notifications | Yes | Title/content | Category, priority, read state, date | Priority then recency | Infinite scroll | Distinct "caught up" vs "no matches" copy | Sheet-based filters |
| Announcements | Yes | Title/content | Category, priority, status, author, date | Recency (default), priority | Infinite scroll (student) / numbered (admin table) | Same pattern | Sheet-based filters |
| Events | Yes | Title/description | Category, department, date range, registration-open | Soonest-first default | Infinite scroll | Same pattern | Sheet-based filters |
| Students (Admin) | Yes | Name/ID/email | Department, year, section, status | Name (default) | Numbered pagination | "No users match" | Card-row list |
| Faculty (Admin) | Yes | Name/ID/email | Department, status | Name (default) | Numbered pagination | Same | Card-row list |
| Users (combined, §23) | Yes | Name/ID/email | Role tab + above | Name (default) | Numbered pagination | Same | Card-row list |
| Queries | Yes | Question text | Category, status, priority, date | Status-then-recency | Numbered pagination (Admin/Faculty), infinite (Student "My Queries") | Distinct "no open queries" vs "no matches" | Sheet-based filters |

Deliberately **no dedicated global search page** — search is contextual to the list it's embedded in, per "avoid unnecessary search functionality." A cross-entity global search (notifications + events + queries in one box) is a Version 1 candidate only if usage data shows people actually want it (§36).

---

## 34. Product Functional Requirements

1. The system shall allow Admin to create, edit, deactivate, and reassign the role of any user, with role changes restricted to Admin exclusively.
2. The system shall allow Faculty to create Announcements only within the Academic, Department, and Events categories, scoped to their own department.
3. The system shall allow Admin to create content in any category, including Emergency, with no department scope restriction.
4. The system shall prevent publishing of any targeted content that resolves to zero recipients without an explicit override confirmation naming the empty result.
5. The system shall display a live, accurate estimated recipient count during targeting before publish.
6. The system shall never permit Emergency-priority content to be muted, snoozed, or filtered out by any user preference.
7. The system shall record and display read/unread state per user per notification, independent of other recipients' state.
8. The system shall support the full Announcement lifecycle (DRAFT → SCHEDULED → PUBLISHED → EXPIRED → ARCHIVED) with state-appropriate available actions at each stage.
9. The system shall support the full Query lifecycle (PENDING → ASSIGNED → IN_PROGRESS → ANSWERED → CLOSED, with REOPENED reachable within a defined window).
10. The system shall restrict visibility of sensitive student fields (Phone, Personal Email, Room, Hostel Block, Account Status) to the student themself and Admin only.
11. The system shall never confirm a file upload as successful until backend storage confirmation is received.
12. The system shall use non-enumerable, neutral responses for Forgot Password regardless of account existence.
13. The system shall provide role-appropriate landing pages immediately following successful authentication.
14. The system shall log publish, edit, delete, role-change, and activation/deactivation actions for Admin audit review.
15. The system shall render navigation and routes such that a user only ever sees entries for actions their role is authorized to perform.

---

## 35. Non-Functional Requirements

- **Usability**: A first-time Student should be able to locate and read an Urgent notification within **2 taps/clicks** from login. A Faculty member should be able to publish a department announcement (create → target → publish) in **under 3 minutes** for a typical case.
- **Accessibility**: WCAG 2.2 AA conformance across all authenticated and public pages; zero critical-severity automated-scan violations (e.g., via axe-core) at release.
- **Responsiveness**: Full functional parity across breakpoints at **≥360px width** (mobile), **≥768px** (tablet), **≥1280px** (desktop) — no feature available on desktop-only.
- **Performance**: Initial dashboard content visible (largest contentful paint) within **2.5 seconds** on a typical campus network (3G/4G-equivalent throttled baseline); Notification Center feed paginates/loads next page within **1 second** of scroll-trigger under normal load.
- **Reliability**: Notification delivery-status (delivered/read) reconciliation should reach eventual consistency within **5 minutes** of a status-changing action (exact SLA finalized with Part 2 architecture).
- **Security** (UX-visible commitments only — mechanisms are Part 2/3): no client-side role storage that a user can alter to change rendered permissions; every authorization check enforced server-side regardless of what the UI renders; anti-enumeration behavior per §21 verified in QA as an explicit test case, not incidental.
- **Maintainability**: Category and priority names (§13/§14) treated as a fixed, centrally-referenced vocabulary — the UX must not hardcode label strings in more than one place per surface (a design-system-token/config approach, detailed further in Parts 2–4).
- **Scalability**: The academic/hostel structure (§11/§12) and targeting UX (§15) must support at minimum **50 departments, 500 sections, and 20 hostels** without requiring UI redesign (form the basis for pagination/virtualization decisions in the structure-management pages).
- **Availability**: Target **99.5%** uptime for the notification-delivery and login path specifically (the two failure modes with the highest real-world cost to the institution), acknowledging final SLA ownership sits with infra design in Part 3.

---

## 36. Open Questions / Product Decisions Required

**1. Should student self-registration exist at all, or is Admin-provisioning the permanent model?**
- Options: (a) Admin-only provisioning forever, (b) self-registration with Admin approval queue, (c) self-registration with institutional-email-domain auto-verification.
- Advantages: (a) maximum control/security, zero fake-account risk; (b) reduces Admin data-entry load while retaining a gate; (c) fastest onboarding at scale.
- Disadvantages: (a) doesn't scale to large incoming cohorts without heavy Admin effort; (b) adds an approval-queue UX and latency; (c) risks account-creation abuse if email verification is weak.
- **Recommended**: (a) for V1 (matches "role is server-assigned, trusted attribute" posture most conservatively), revisit (b) once user-count growth makes Admin data entry a bottleneck.
- Impact: UX (Register page fate, §24.3), Frontend (invite-flow components either built now or deferred), Backend (invite-token vs. open-registration endpoint), Database (invite-token table either way), Security (largest impact — open registration meaningfully changes the threat model), Testing (enumeration/abuse test cases scale with openness).

**2. Should Faculty ever be allowed to target outside their own department (with Admin approval)?**
- Options: (a) never (hard department lock, current MVP default), (b) request-based cross-department targeting requiring Admin sign-off, (c) fully open targeting for Faculty.
- Advantages: (a) simplest, safest, matches "Faculty must not automatically have administrative privileges"; (b) supports legitimate inter-department events without full trust; (c) most flexible for genuinely cross-cutting Faculty-run events.
- Disadvantages: (a) inter-departmental Faculty-run events need an Admin proxy to publish, adding friction; (b) adds an approval-queue UX; (c) erodes the department-scope boundary that currently limits blast radius of a compromised Faculty account.
- **Recommended**: (a) for MVP, (b) as the V1 evolution — matches the spec's own "Faculty locked to department by default" framing while leaving room to grow.
- Impact: UX (targeting step conditional logic), Frontend (approval-queue components if (b)), Backend (approval workflow endpoints), Database (approval-request records), Security (scope-escalation surface), Testing (department-boundary test matrix expands).

**3. Attachment size/type limits — exact numbers.**
- Options: (a) conservative (5MB, PDF/JPG/PNG only), (b) moderate (10MB, + DOCX/PPTX), (c) generous (25MB+, broad type list).
- Advantages/Disadvantages trade storage cost and abuse surface (b/c) against genuine faculty need to attach syllabi/posters as documents, not just images (a is too narrow for real academic content).
- **Recommended**: (b) as a starting point, confirmed against actual storage/infra budget in Part 2.
- Impact: UX (copy in §18/§20 upload controls), Frontend (client-side validation rules), Backend (upload size limits), Database (blob/reference storage sizing), Security (malware-scanning cost scales with size/type breadth), Testing (boundary-size test cases).

**4. Query reopen window and response-time SLA copy — exact figures.**
- Options: (a) fixed short window (e.g., 7 days) + generic SLA copy, (b) configurable-per-category window/SLA set by Admin in System Settings.
- Advantages: (a) simple, ships faster; (b) lets Admin tune expectations per query type (Examination queries may need faster SLA than Library queries).
- Disadvantages: (a) one-size-fits-all may misrepresent urgency for some categories; (b) adds a System Settings surface (already scoped in §24.20, so incremental cost is low).
- **Recommended**: (b), since §24.20 already anticipates this configuration surface.
- Impact: UX (Settings page fields, §20 copy becomes dynamic), Frontend (fetch config instead of hardcoding), Backend (settings storage/read), Database (settings table), Security (low), Testing (config-driven copy test cases).

**5. In-app Event registration/capacity tracking — MVP or deferred?**
- Options: (a) external URL only (current MVP recommendation, §19), (b) full in-app registration with capacity/waitlist tracking.
- Advantages: (a) far less scope, ships faster, adequate for most campus events that already use external forms; (b) keeps the whole flow in-product, better data/analytics.
- Disadvantages: (a) fragments the experience back out to external tools for the one action most likely to need reliability; (b) meaningfully larger scope (capacity, waitlists, cancellation-refund-of-seat logic) for V1.
- **Recommended**: (a) for MVP as stated, (b) as an explicit Version 1 target given clear demand.
- Impact: UX (Event Details action, §24.8), Frontend (registration widget if (b)), Backend (registration/capacity endpoints), Database (registration records), Security (PII in registration data), Testing (capacity-edge-case tests if (b)).

**6. Admin "view as" / impersonation — build it, and if so, how constrained?**
- Options: (a) don't build it in V1, (b) build a fully audited, time-boxed, banner-flagged "view as" mode.
- Advantages: (a) removes an entire privacy/trust-risk surface; (b) genuinely useful for support/debugging ("what does this student actually see").
- Disadvantages: (a) Admin support workflows rely on asking the user to screenshot instead; (b) even audited, it's a trust-sensitive feature that needs careful UX (unmistakable banner, auto-timeout, no destructive actions performable while impersonating).
- **Recommended**: (a) for MVP; revisit (b) only if support-ticket volume demonstrates real need, with mandatory audit logging designed in from day one.
- Impact: UX (persistent "viewing as" banner if built), Frontend (mode-switch component), Backend (impersonation-session mechanics), Database (audit trail), Security (high — this is the single highest-risk open item in this document), Testing (impersonation-boundary tests, e.g., cannot perform Admin actions while impersonating).

**7. Account-status disclosure at login (deactivated-account message) vs. strict anti-enumeration purism.**
- Options: (a) keep the distinct "account inactive" message as specified in §21, (b) fold it into the fully generic invalid-credentials message for maximum enumeration resistance.
- Advantages: (a) reduces confused support tickets from legitimately deactivated users (e.g., graduated students, offboarded faculty); (b) marginally reduces information leaked to an attacker probing for active accounts.
- Disadvantages: (a) technically reveals "this identifier belongs to a known, deactivated account," a narrow enumeration surface; (b) worse UX for a large, routine, non-malicious population (every graduating cohort).
- **Recommended**: (a), as already reflected in §21 — the support-burden cost of full purism here outweighs the marginal security benefit for a closed institutional user base (not a public consumer app).
- Impact: UX (login error-state copy), Frontend (error-state branching), Backend (status-check-before-generic-fail ordering), Security (documented, accepted tradeoff — flag explicitly for Part 2/3 sign-off), Testing (explicit test case distinguishing the two failure paths).

---

## 37. Recommended Product Architecture

**Summary of the shape this specification converges on:**

- **Three roles, one coherent app**: STUDENT, FACULTY, ADMIN share a single design system and app shell; capability differences are enforced through absent-not-disabled navigation/routes and server-side authorization (Part 2), never client-side-only gating.
- **Four content primitives**: Announcement, Event, Notification (broadcast), Query — each with its own lifecycle state machine, sharing a common Category (11 fixed values) and Priority (5 fixed values) vocabulary applied consistently across all four.
- **One targeting engine**: a single audience-selection UX (§15) reused identically across Announcement, Event, and Notification creation — not three separate targeting implementations — built against the Academic Structure (§11) and Hostel Structure (§12) hierarchies, both capped deliberately shallow (no room/floor-level targeting) to keep the UX tractable at scale.
- **One consumption surface**: the Notification Center (§16) is the canonical feed; Dashboards (§26–28) are curated, priority-sorted *views into* that same underlying data, not a separate data model.
- **Consolidated Admin surfaces**: User Management, Academic Structure, and content-management pages are deliberately merged from the candidate list's more fragmented page set (§23) to reduce navigation cost without losing functional coverage.
- **Non-negotiable Emergency path**: a single, consistently-enforced rule (never mutable, always acknowledged, always visually distinct without relying on color) threading through Categories, Priorities, Preferences, and the Notification Center — this is the one piece of product logic every other part of the system defers to.
- **Everything backend-shaped is deferred, not invented**: API contracts, DB schemas, auth mechanics, and infra are explicitly out of scope here and flagged inline wherever this document's UX decisions imply a requirement on Part 2/3 (recipient-count computation, read-state reconciliation, file storage, audit logging, session mechanics).

This specification is intended to be handed to an engineering team as the authoritative NotifyHub Product & UX baseline for Parts 2–4 to build against.
