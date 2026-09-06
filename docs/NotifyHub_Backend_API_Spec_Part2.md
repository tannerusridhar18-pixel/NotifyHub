# NotifyHub — Backend, Database, API & Data Architecture Specification
### Part 2 of 4: Backend, Data & API Architecture Only

> Scope fence: reuses — never redefines — the roles (ADMIN/FACULTY/STUDENT), the 11 Notification Categories, the 5 Priorities (LOW/NORMAL/IMPORTANT/URGENT/EMERGENCY), and the lifecycle status names fixed in Part 1. Pentest scenarios, CI/CD, and infra topology are Part 3/4 and are flagged inline as "hardened further in Part 3" where relevant.

---

## 1. Backend Architecture

**Recommendation: modular monolith**, not microservices. NotifyHub's scale (thousands of students, hundreds of faculty, single institution) doesn't justify the operational cost of service boundaries, network calls, and distributed transactions that microservices impose. A well-modularized monolith gets the maintainability benefit without the distributed-systems tax, and is the correct extension of the existing Spring Boot codebase rather than a rewrite.

**Layering, per module:**
```text
Controller  →  DTO (request)  →  Bean Validation  →  Service  →  Business Rules  →  Repository (Spring Data JPA)  →  MySQL
                                                                                              ↓
Controller  ←  DTO (response)  ←  ─────────────────────────────────────────────────────────┘
```
- **Controller**: thin — maps HTTP to DTOs, delegates entirely to a Service, never contains business logic or repository calls directly.
- **DTO**: separate Request and Response DTOs per operation (not one shared DTO reused for create/update/read) — this is what makes the mass-assignment guard (§5) structurally enforceable: a `RegisterRequest` DTO simply has no `role` field to bind, so there is no field to strip.
- **Validation**: Bean Validation (`@Valid`, `@NotNull`, `@Size`, custom validators for cross-field rules like "Hostel/Block required only if Hosteller=YES") runs before the Service is invoked.
- **Service**: owns business rules and transaction boundaries (`@Transactional`); the only layer allowed to call multiple repositories or coordinate a multi-step operation.
- **Repository**: Spring Data JPA interfaces, query methods or `@Query` for anything beyond trivial CRUD; no business logic here.

**Avoiding named anti-patterns:**
- **God services**: one service per bounded module (below), not one `NotificationService` that also handles targeting, delivery, and preferences — those are three collaborating services (`TargetingService`, `NotificationDeliveryService`, `NotificationPreferenceService`) composed by a thin orchestrating `NotificationService`.
- **Duplicated logic**: targeting logic is written once (§13) and reused by Announcement, Event, and Notification creation, not copy-pasted per module.
- **Excessive abstraction**: no repository-of-repositories, no generic `CrudService<T>` base class that ends up fighting Spring Data JPA's own abstractions — plain, explicit services per module.
- **Unnecessary microservices**: explicitly rejected above.

---

## 2. Module Boundaries

```text
com.notifyhub
 ├── auth                (registration, login, refresh, password reset, JWT issuing/validation)
 ├── users               (User entity/service — shared identity, activation/deactivation, role, shared by all profile types)
 ├── students             (StudentProfile, student-specific queries)
 ├── faculty              (FacultyProfile, faculty-specific queries)
 ├── academicstructure    (Department, Branch, Section — the configurable hierarchy)
 ├── hostels              (Hostel, HostelBlock, Room)
 ├── announcements        (Announcement + lifecycle)
 ├── events               (Event + lifecycle)
 ├── notifications        (Notification, NotificationRecipient, delivery)
 ├── targeting            (shared TargetRule engine — used by announcements/events/notifications)
 ├── queries              (Query, QueryResponse)
 ├── attachments          (polymorphic Attachment storage/metadata, shared by announcements/events/queries)
 ├── preferences          (NotificationPreference)
 ├── analytics            (read-only aggregation over the above; no writes)
 ├── audit                (AuditLog — write-side hooked in via a shared interceptor/aspect, read-side Admin API)
 └── common               (error model, pagination envelope, base validators, security config)
```

Each module = one Java package with its own controller/service/repository/dto sub-packages. A module may depend on `common` and on other modules' **public service interfaces** only — never reach into another module's repository directly (e.g., `announcements` calls `targeting`'s service, not `targeting`'s repository). This keeps the monolith splittable later if a genuine scaling reason ever emerges, without paying for that optionality now.

---

## 3. Domain Model — Keep / Remove / Merge / Defer

| Candidate | Decision | Rationale |
|---|---|---|
| User | **Keep** | Shared identity/auth record for all three roles. |
| StudentProfile | **Keep** | Role-specific profile, 1:1 with User. |
| FacultyProfile | **Keep** | Role-specific profile, 1:1 with User. |
| Department | **Keep** | Configurable, targeting-relevant (Part 1 §11). |
| Branch | **Keep** | Configurable, targeting-relevant; absorbs "Course" (below). |
| Course | **Merge into Branch** | Part 1 §11 decision: no distinct product use for a separate Course entity; represented as a descriptive attribute on Branch if ever needed. |
| AcademicYear | **Defer** | Part 1 §11 decision: treated as a global academic-calendar value in system configuration, not a managed entity with its own table. |
| Semester | **Keep, as an attribute** | A small bounded integer column on StudentProfile (derived from Year), not a separately manageable entity — no independent lifecycle or admin CRUD need. |
| Section | **Keep** | Configurable, targeting-relevant table scoped to Department + Branch + Year. |
| Year | **Keep, as an attribute** | A bounded integer column (1–N, N configurable per Branch in System Settings), not a table — Year has no attributes of its own beyond its number; a table would be pure overhead. |
| Hostel | **Keep** | Configurable, targeting-relevant. |
| HostelBlock | **Keep** | Configurable, targeting-relevant (finest targeting grain per Part 1 §12). |
| Floor | **Merge into Room** | Part 1 §12 decision: tracked as a column on Room for record-completeness, not exposed as a targeting dimension — doesn't warrant its own table. |
| Room | **Keep** | Needed for student assignment and (non-targeting) record-keeping. |
| Announcement | **Keep** | Core content entity. |
| AnnouncementTarget | **Merge into a shared `TargetRule` entity** | See §13 — Announcement, Event, and Notification targeting share identical shape; one polymorphic table (`target_rule` with `target_type` + `target_id`) avoids duplicated schema/logic across three near-identical tables. |
| Event | **Keep** | Core content entity. |
| EventTarget | **Merge into `TargetRule`** | Same rationale as AnnouncementTarget. |
| Notification | **Keep** | The raw, standalone broadcast entity from Part 1 §24.16 — distinct from Announcement (a Notification need not have the full announcement authoring/preview surface; it's the Admin broadcast composer's output). |
| NotificationRecipient | **Keep** | Per-user delivery/read state — the highest-volume table in the system (§28). |
| Query | **Keep** | Core content entity. |
| QueryResponse | **Keep** | Threaded response records. |
| RefreshToken | **Keep** | Already exists in the current codebase; extended per §21. |
| Attachment | **Keep, generalized/polymorphic** | One `attachment` table with `owner_type` (ANNOUNCEMENT/EVENT/QUERY) + `owner_id`, instead of three near-identical attachment tables. |
| AuditLog | **Keep** | Required for Admin audit trail (Part 1 §10/§24.19). |
| NotificationPreference | **Keep** | Per-user, per-category mute/channel settings (Part 1 §17). |
| **New: TargetRule** | **Add** | Not in the candidate list but required to implement the consolidation above without duplicating Announcement/Event/Notification targeting logic. |
| **New: PasswordResetToken** | **Add** | Required by §18's hardened reset-token requirements; doesn't fit cleanly inside RefreshToken's shape (different lifetime/single-use semantics). |
| **New: LoginAttempt** | **Add** | Required to implement rate-limiting/lockout (§20) without an external cache dependency in V1. |

---

## 4. User Architecture

```text
User
 ├── id (PK)
 ├── email (unique, institutional)
 ├── passwordHash (BCrypt)
 ├── role (ADMIN | FACULTY | STUDENT) — enum, server-set only
 ├── accountStatus (ACTIVE | INACTIVE)
 ├── failedLoginAttempts, lockedUntil (supports §20)
 ├── createdAt, updatedAt
 └── (1:1) → StudentProfile  or  (1:1) → FacultyProfile   [exactly one, enforced by service logic + a DB check]
```

**Authentication fields** (email, passwordHash, role, accountStatus, lockout fields) live on `User`. **Profile fields** (department, year, section, hostel info for students; department, designation for faculty) live on the role-specific profile table — kept separate so authentication concerns never bleed into profile CRUD, and so a Faculty profile update can never accidentally touch a security-relevant field.

**Mass-assignment guard, structurally enforced:**
- `RegisterRequest` DTO fields: `email`, `password`, `name`, and role-appropriate profile fields **only**. No `role` field exists on this class at all — not "present but ignored," genuinely absent, so there is nothing to bind even if an attacker adds an extra JSON key (Jackson's default `FAIL_ON_UNKNOWN_PROPERTIES` can be left off for forward-compatibility, but the field simply has nowhere to land in the entity mapping since the Service explicitly sets `role` itself, never copies it from the DTO).
- Admin-provisioning uses a **separate** `AdminCreateUserRequest` DTO (Admin-authenticated route only) which *does* have a `role` field — this is the one and only DTO in the system where role is client-settable, and it's reachable only by an already-authenticated Admin principal.
- Same pattern applies to any other privilege-adjacent field (e.g., `accountStatus`) — self-service profile-update DTOs never include it.

---

## 5. Student Architecture

```text
StudentProfile
 ├── id (PK)
 ├── userId (FK → User, unique)
 ├── studentId (unique, institutional ID)
 ├── name
 ├── phone (nullable, sensitive)
 ├── personalEmail (nullable, sensitive)
 ├── departmentId (FK → Department)
 ├── branchId (FK → Branch)
 ├── year (int, bounded)
 ├── semester (int, derived/bounded)
 ├── sectionId (FK → Section)
 ├── batch (nullable, descriptive string, e.g. "2023–2027")
 ├── isHosteller (boolean)
 ├── hostelId (FK → Hostel, nullable — required iff isHosteller)
 ├── blockId (FK → HostelBlock, nullable — required iff isHosteller)
 ├── roomId (FK → Room, nullable — optional even for hostellers, since room assignment may lag enrollment)
 └── createdAt, updatedAt
```

**Normalization**: Department/Branch/Section/Hostel/Block/Room are all foreign keys to their own managed tables, never free-text strings — this is what makes targeting joins possible and prevents "CSE" vs "cse" vs "Computer Science" drift.
**Constraints**: `CHECK (isHosteller = TRUE OR (hostelId IS NULL AND blockId IS NULL AND roomId IS NULL))` — enforced both at the DB level and in Service validation, so the two layers agree and neither can be bypassed by a direct DB write elsewhere in the app.
**Uniqueness**: `studentId` unique; `userId` unique (enforces the 1:1 with User).
**Optional fields**: phone, personalEmail, batch, roomId.
**Validation**: `year` bounded by the Branch's configured max-year (System Settings, Part 1 §11); phone format validated if present; personalEmail format validated if present and must differ from the institutional `email` on User (prevents a confusing duplicate).

---

## 6. Faculty Architecture

```text
FacultyProfile
 ├── id (PK)
 ├── userId (FK → User, unique)
 ├── facultyId (unique, institutional ID)
 ├── name
 ├── phone (nullable)
 ├── departmentId (FK → Department)
 ├── designation (string, e.g. "Assistant Professor" — free text, not a managed entity; no product workflow depends on designation as a structured/filterable value, so a table would be over-modeling)
 └── createdAt, updatedAt
```

Deliberately **not modeled**: HR-adjacent data (salary, employment history, leave records) — explicitly out of scope per §7's "do not over-model HR information NotifyHub does not require." Permissions are not a column on FacultyProfile either — they derive entirely from `role = FACULTY` plus department-scope checks in the Authorization layer (§13/§22), not from a per-faculty permissions bitmask, since Part 1 defines no per-faculty variation in V1.

---

## 7. Academic Architecture

| Concept | Representation | Why |
|---|---|---|
| Department | Table | Configurable, has its own lifecycle (add/rename/deactivate per Part 1 §24.13). |
| Branch/Program | Table (FK → Department) | Same reasoning; absorbs Course. |
| Course | Attribute on Branch (nullable descriptive field) | No independent management need (§3). |
| Academic Year | System Settings config value | Global, single current value; not per-record. |
| Year | Bounded integer attribute on StudentProfile | No attributes of its own; range validated against Branch config. |
| Semester | Bounded integer attribute on StudentProfile | Derived convenience field (`semester = (year - 1) * 2 + currentTermIndex`), not independently editable in most cases. |
| Section | Table (FK → Department, Branch, Year) | Configurable, targeting-relevant, has its own admin lifecycle. |

This keeps exactly two configurable hierarchy tables (Department, Branch) plus one targeting-leaf table (Section), instead of five-plus tables for a hierarchy that Part 1 explicitly asked to keep shallow. Year/Semester as attributes also means targeting queries filter on simple integer columns (fast, indexable) rather than joining through additional tables.

---

## 8. Hostel Architecture

```text
Hostel
 ├── id, name, type (e.g., "Boys"/"Girls" — a simple enum/string, gender-segregation is descriptive, not a business rule enforced elsewhere), totalCapacity, active

HostelBlock
 ├── id, hostelId (FK), name, capacity, active

Room
 ├── id, blockId (FK), roomNumber, floor (int column — see §3, no separate Floor table), capacity, currentOccupancy (derived or maintained), active
```

**Targeting support**: `TargetRule` references `hostelId` and/or `blockId` only — never `roomId`, per Part 1's explicit exclusion of room-level targeting.
**Occupancy**: `currentOccupancy` on Room is maintained by the Service layer whenever a StudentProfile's `roomId` changes (increment/decrement in the same transaction as the profile update), rather than computed via a live `COUNT()` on every read — cheap to keep in sync, expensive to recompute constantly.
**Status**: `active` boolean on all three levels supports deactivation without deleting historical student-assignment records.

---

## 9. Announcement Architecture

```text
Announcement
 ├── id (PK, UUID — non-guessable per Part 1 §0 route requirement)
 ├── title, content
 ├── category (enum — the fixed 11 from Part 1 §13)
 ├── priority (enum — the fixed 5 from Part 1 §14)
 ├── authorId (FK → User)
 ├── status (DRAFT | SCHEDULED | PUBLISHED | EXPIRED | ARCHIVED)
 ├── scheduledAt (nullable)
 ├── publishedAt (nullable)
 ├── expiresAt (nullable)
 ├── createdAt, updatedAt
 └── (target via TargetRule where targetType = ANNOUNCEMENT, targetId = this.id)
```

**Lifecycle & who can do what** (reusing Part 1 §18 verbatim):

| Transition | Who |
|---|---|
| Create (DRAFT) | Faculty (category ∈ {Academic, Department, Events}, own department scope) · Admin (any category/scope) |
| DRAFT → SCHEDULED / PUBLISHED | Author or Admin |
| SCHEDULED → DRAFT (cancel) | Author or Admin, only before `scheduledAt` |
| PUBLISHED → EXPIRED | System (scheduler, §33) when `expiresAt` passes, or Admin manually |
| EXPIRED/PUBLISHED → ARCHIVED | Author, Admin, or system after retention window |
| Edit while PUBLISHED | Restricted to a "correction" update (title/content only — category/priority/target are immutable post-publish per Part 1 §18) |
| Delete | Only DRAFT, by author or Admin — PUBLISHED content is archived, never hard-deleted |

`CANCELLED` is intentionally **not** a separate status here (unlike Event) — Part 1's Announcement lifecycle has no distinct "cancelled" concept; a scheduled item that's called off simply returns to DRAFT.

---

## 10. Event Architecture

```text
Event
 ├── id (UUID)
 ├── title, description
 ├── category (Events-related subset or reuse the same 11-category enum, scoped to "Events")
 ├── organizerId (FK → User)
 ├── venue, startAt, endAt, registrationDeadline (nullable)
 ├── eligibility (free text — no structured eligibility engine in V1)
 ├── departmentId (nullable FK → Department — null = college-wide)
 ├── minYear, maxYear (nullable ints — simpler than a Year-range table)
 ├── registrationUrl (external, per Part 1 §19/§36 MVP decision)
 ├── capacity (nullable int — displayed but not enforced against live registration counts in V1, since registration itself is external per Part 1 §36)
 ├── posterAttachmentId (FK → Attachment, nullable)
 ├── status (DRAFT | UPCOMING | LIVE | COMPLETED | CANCELLED | ARCHIVED)
 ├── createdAt, updatedAt
 └── (target via TargetRule where targetType = EVENT)
```

**Lifecycle**: `DRAFT → UPCOMING → LIVE → COMPLETED → ARCHIVED`, with `CANCELLED` reachable from `UPCOMING` or `LIVE` (matches Part 1 §19's explicit branch). `UPCOMING`/`LIVE`/`COMPLETED` transitions are system-computed from `startAt`/`endAt` via the scheduler (§33), not manually set, so an event never says "Upcoming" after it has already started.
**Permissions**: identical shape to Announcement — Faculty locked to own department (`departmentId` must equal their own or be left college-wide only by Admin), Admin unrestricted.

---

## 11. Query Architecture

```text
Query
 ├── id (UUID)
 ├── studentId (FK → User, the submitter)
 ├── category, priority (student-suggested; re-settable by Faculty/Admin on assignment per Part 1 §20)
 ├── question (text)
 ├── status (PENDING | ASSIGNED | IN_PROGRESS | ANSWERED | CLOSED | REOPENED)
 ├── assignedToId (FK → User, nullable, must be role=FACULTY or ADMIN)
 ├── assignedAt, reopenDeadline (computed = answeredAt/closedAt + configured window, System Settings)
 ├── createdAt, updatedAt

QueryResponse
 ├── id
 ├── queryId (FK → Query)
 ├── responderId (FK → User)
 ├── content
 └── createdAt
```

**Ownership/access**: Student sees only their own Query; Faculty sees Queries where `assignedToId = self` (or unassigned in their department queue, per Part 1 §20's self-claim flow); Admin sees all.
**Reopening**: allowed only while `now() < reopenDeadline`, transitions ANSWERED/CLOSED → REOPENED → (re-enters IN_PROGRESS on responder's next action), notifies the original `assignedToId` first (Part 1 §20).
**SLA metadata**: `reopenDeadline` and an informational SLA-copy source (System Settings, per Part 1 open item §36) — no hard SLA-breach automation in V1 (would need escalation rules, explicitly deferred to Part 1 §10 Version 1 scope).

---

## 12. Notification Architecture

```text
Notification
 ├── id (UUID)
 ├── title, content
 ├── category, priority (same fixed enums)
 ├── createdById (FK → User, must be role=ADMIN for Emergency; Admin or Faculty otherwise per Part 1 targeting scope rules)
 ├── status (DRAFT | SCHEDULED | PUBLISHED | EXPIRED | ARCHIVED)
 ├── scheduledAt, publishedAt, expiresAt (nullable)
 ├── actionUrl (nullable — deep link to an Announcement/Event/Query if this Notification is *about* one; null for a standalone broadcast)
 ├── createdAt, updatedAt
 └── (target via TargetRule where targetType = NOTIFICATION)
```

**Target rules — normalized, not embedded.** A `TargetRule` row set, not a single JSON blob on Notification, so the targeting engine (§13) can query "does this rule set match user X" with indexed SQL rather than deserializing and evaluating JSON per row — critical once `NotificationRecipient` (§17) is large. See §13 for the full representation.

---

## 13. Targeting Engine

**Representation.** One shared table, not three duplicated ones:

```text
target_rule
 ├── id
 ├── targetType (ANNOUNCEMENT | EVENT | NOTIFICATION)
 ├── targetId (the Announcement/Event/Notification's id)
 ├── audienceType (EVERYONE | ALL_STUDENTS | ALL_FACULTY | CUSTOM)
 ├── departmentId (nullable FK)
 ├── branchId (nullable FK)
 ├── year (nullable int)
 ├── section Id (nullable FK)
 ├── hostellerStatus (nullable boolean)
 ├── hostelId (nullable FK)
 ├── hostelBlockId (nullable FK)
```

A single target can have **one or more** `target_rule` rows when audienceType = CUSTOM with multiple disjoint selections (e.g., "CSE Year 3" **or** "ECE Year 3" is two rows). This gives clean **OR-across-rows, AND-within-a-row** semantics:
- **Within one row**, every non-null column is an AND condition (Department = CSE AND Year = 3).
- **Across multiple rows** for the same `(targetType, targetId)`, a user matches if they satisfy **any** row (OR) — this maps directly to how the UI's multi-select-then-add-another-filter-group pattern (Part 1 §15) naturally composes.
- **Exclusions**: not supported as a first-class concept in V1 (no "everyone except X" rule) — Part 1's targeting UX never asked for exclusion lists, and adding NOT-semantics would complicate both the UI and the SQL disproportionately to demonstrated need. Flagged as a Version-1-candidate in §38 if a real exclusion need surfaces.
- **Empty targets**: the recipient-count computation (used for the live preview, Part 1 §15) runs the same matching query the publish step will use, so "0 recipients" is caught before publish, never discovered after.
- **Duplicate prevention**: a user matching more than one `target_rule` row for the same target is still materialized into exactly **one** `NotificationRecipient` row — the eligible-user query is `SELECT DISTINCT user_id`, and recipient creation is `INSERT ... ON DUPLICATE KEY` guarded by a unique constraint on `(notification_id, user_id)`.
- **Target changes after publish**: Part 1 §18 already forbids re-targeting a PUBLISHED Announcement; the backend enforces this by making `target_rule` rows for a PUBLISHED/DELIVERED target immutable at the Service layer (no update endpoint reaches them once status leaves DRAFT/SCHEDULED).
- **Large recipient sets**: eligible-user resolution runs as a set-based SQL query (joins against StudentProfile/FacultyProfile), never row-by-row application code iteration; recipient-row insertion is batched (JDBC batch insert, chunked at e.g. 1,000 rows) rather than one `INSERT` per recipient.

**Model comparison and recommendation:**

| | Model A — Materialization | Model B — Dynamic | Model C — Hybrid |
|---|---|---|---|
| Read performance | Excellent (indexed lookup on `NotificationRecipient`) | Poor at scale (recomputes matching on every feed load) | Excellent |
| Write cost | One batch job at publish time | None | One batch job at publish time |
| Correctness if a student transfers department mid-flight | Recipient list reflects targeting **at publish time** (arguably correct — they got the notice when it was relevant to their old department) | Reflects **current** department (a transferred student would retroactively lose/gain historical notices, which is confusing and breaks the "read" history) | Same as A |
| Complexity | Low | Low | Medium |

**Recommended: Model A (recipient materialization) for V1**, i.e. the "hybrid" framing collapses to plain materialization in practice: `NotificationRecipient` rows are created at publish time via the batched query above, and read/unread state lives on those rows from then on. There is no dynamic re-evaluation at read time in V1 — Model B's live-recompute cost is the wrong tradeoff for a read-heavy feed, and Model C's added complexity (deciding *when* to fall back to dynamic evaluation) isn't justified without a concrete scenario Model A can't handle. If a future need emerges for "notify everyone who *currently* matches X, updated live" (a genuinely dynamic audience), that's a distinct feature to design later, not a reason to complicate the default path now.

---

## 14. Notification Lifecycle

```text
DRAFT → SCHEDULED → PUBLISHED → EXPIRED → ARCHIVED
```

**`READ` is recipient state, not notification state** — a Notification's own status only ever reflects its authoring/publishing lifecycle (is it live at all); whether a *specific user* has read it lives entirely on `NotificationRecipient.readAt`. Conflating the two would make "is this notification read" a meaningless question the moment it has more than one recipient. `DELIVERED` similarly is a recipient-level timestamp (`deliveredAt`), not a Notification-level status — see §17.

- **Scheduled cancellation**: SCHEDULED → DRAFT, only before `scheduledAt`, blocked once the scheduler has picked it up for publishing (a short in-flight window guarded by a `PUBLISHING` transient lock — see §33).
- **Rescheduling**: update `scheduledAt` while still SCHEDULED; no-op after publish (must create a new Notification instead).
- **Published edits**: title/content correction only (mirrors Announcement, §9); category/priority/target are frozen once recipients have been materialized.
- **Expiration**: system-driven (scheduler) when `expiresAt` passes; recipient rows are **not** deleted, just excluded from default "active" queries (Part 1 §16's "Expired" filter).
- **Failed delivery**: if the batched `NotificationRecipient` insert partially fails mid-batch, the entire publish transaction rolls back (§29) — a Notification is never left half-materialized; it's retried as a whole.
- **Retry**: publish is idempotent (an `Idempotency-Key` header, §24) so a retried publish request after a transient failure doesn't double-materialize recipients.
- **Duplicate prevention**: the `(notification_id, user_id)` unique constraint on `NotificationRecipient` is the final backstop even if application-level idempotency somehow fails.
- **Archiving/Deletion**: archive is a status flip, never a hard delete of a PUBLISHED notification or its recipient rows (audit/history integrity, Part 1 §18's "never hard-delete published content").

---

## 15. Delivery Architecture

| Channel | Complexity | Cost | Reliability | Infra | Scalability | Security |
|---|---|---|---|---|---|---|
| DB-backed in-app + polling | Low | Low | High (DB is already the source of truth) | None beyond existing MySQL | Good to tens of thousands of users at modest poll intervals | Straightforward, same auth as any API |
| Server-Sent Events | Medium | Low | Good | Needs long-lived connections handled by the app server | Fine at moderate scale, harder behind some proxies | Straightforward |
| WebSockets | Medium-High | Medium | Good | Needs a stateful connection layer, complicates horizontal scaling (sticky sessions or a pub/sub backplane) | Requires more infra work to scale out | Needs careful auth-on-connect handling |
| Browser Push | Medium | Low-Medium | Depends on external push service (FCM/APNs-equivalent web push) | External service dependency | Good | Needs subscription-key management |
| Email | Low-Medium | Low (institutional SMTP likely exists) | Good, but not real-time | SMTP relay | Good | Standard, watch for injection in templated content |
| SMS | Low | **Ongoing per-message cost** | Good | Third-party SMS gateway | Cost scales with volume | Standard |

**Recommended — Version 1: database-backed in-app notifications with client polling** (e.g., every 30–60 seconds, or on-focus/on-navigation refetch), optionally paired with **Email** for IMPORTANT-and-above categories where the user's preferences allow it (Part 1 §17). This needs no new infrastructure beyond what already exists (MySQL + an SMTP relay), is trivially reliable (the DB write *is* the delivery record), and matches "do not introduce unnecessary infrastructure."

**Recommended — Future**: **Server-Sent Events** for near-real-time in-app delivery (simpler than WebSockets, one-directional which is all a notification feed needs, plays well with a load balancer without a pub/sub backplane at moderate scale), plus **Browser Push** for Emergency-priority alerts specifically, where near-real-time delivery genuinely matters even if the app isn't open. WebSockets are not recommended even for Future unless a genuinely bidirectional real-time feature emerges (none is currently in scope) — SSE covers the actual requirement with less operational complexity.

---

## 16. Notification Recipient Model

```text
NotificationRecipient
 ├── id
 ├── notificationId (FK)
 ├── userId (FK)
 ├── state (UNREAD | READ)
 ├── deliveredAt (set at materialization time — see §14)
 ├── readAt (nullable)
 ├── acknowledgedAt (nullable — only meaningfully used for EMERGENCY/ack-required items per Part 1 §14)
 └── UNIQUE (notificationId, userId)
```

`acknowledgedAt` is included (not dropped) specifically because Part 1 §14 makes acknowledgement **mandatory** for EMERGENCY and makes it a hard product law — this needs to be queryable/enforceable ("has every targeted user acknowledged this Emergency alert" is a real Admin-facing question), so it earns its column despite being null for the vast majority of rows.

**Efficient queries** (indexes detailed fully in §27, previewed here):
- **Unread count**: `COUNT(*) WHERE userId = ? AND state = 'UNREAD'` — served by a composite index `(userId, state)`.
- **Recent notifications / feed**: join `NotificationRecipient` → `Notification`, ordered by priority-rank then `deliveredAt DESC`, `WHERE userId = ?` — composite index `(userId, deliveredAt)` plus the Notification-side `priority` column is small enough to sort in-memory per page rather than needing its own index.
- **Category/priority filters**: filter on the joined `Notification.category`/`.priority`, indexed on the Notification table itself (`(category)`, `(priority)`), combined with the recipient-side `userId` filter — MySQL's optimizer handles this join+filter combination well at the target scale (§28 goes further into partitioning/archiving for when it doesn't).
- **Search**: full-text search (MySQL `FULLTEXT` index) on `Notification.title`/`.content`, joined back to the user's recipient rows — search is never run across all notifications system-wide for a Student, only within their own recipient set.
- **Pagination**: cursor-based (`WHERE (priority_rank, delivered_at, id) < (last seen values)`), not `OFFSET`-based, since offset pagination degrades badly on a table this large (§28).

---

## 17. Authentication Architecture

```text
Registration → DTO Validation → Business Validation → Duplicate Check → Password Hashing (BCrypt) → Transaction → MySQL Insert → Response
```

The response is only sent **after** the transaction commits successfully — never optimistically. If the insert fails (constraint violation, DB unavailability), the endpoint returns an error, not a success payload with a subsequently-missing record. This is the literal backend implementation of Part 1 §21's "success reflects actual backend confirmation only."

**Login / Logout / Refresh**: see §19/§20/§21.

**Forgot Password / Reset Password:**
```text
PasswordResetToken
 ├── id
 ├── userId (FK)
 ├── tokenHash (the raw token is never stored — only its hash, e.g. SHA-256, distinct from the BCrypt password hash)
 ├── expiresAt (createdAt + 15–30 min, configurable)
 ├── usedAt (nullable — set on redemption, and checked to reject reuse)
 └── createdAt
```
- Raw token: cryptographically random (`SecureRandom`, sufficient entropy — e.g., 32 bytes, URL-safe base64-encoded), never sequential/predictable.
- Single-use: `usedAt` set atomically on redemption inside the same transaction that changes the password; a second attempt with the same token sees `usedAt IS NOT NULL` and is rejected.
- Invalidated on password change through any path (including a direct Admin-triggered reset) — any outstanding unused token for that user is proactively expired.
- The `/auth/forgot-password` endpoint returns the identical response and identical timing profile regardless of whether the email exists (constant-shape response; the email-sending side-effect is fire-and-forget/async so response latency doesn't leak existence either) and is rate-limited per §20's general principle.

**Activation/Deactivation**: `User.accountStatus` flip, Admin-only, audited (§30).

---

## 18. Registration

```text
POST /api/v1/auth/register
```

**One endpoint, not two** — Student and Faculty registration share the same request shape (email, password, name, plus role-appropriate profile fields nested under a `profile` object) and the same validation/duplicate-check/hashing/transaction pipeline; the only difference is *which* profile sub-DTO is populated, which the endpoint infers from which profile fields are present alongside a **separate, out-of-band context** — not a client-supplied role field. Concretely: registration is **invite-token-gated** (per Part 1 §36's recommendation to keep registration Admin-provisioned in V1), and the invite record itself (created by Admin) already carries the intended role and pre-filled profile scaffolding. The public registration endpoint's job is only "set a password for this pre-provisioned, invited identity" — so there is structurally no scenario where a client's request body determines the role at all.

- **Request DTO**: `{ inviteToken, password, confirmPassword }` — nothing else; name/email/profile fields come from the invite record, not the request.
- **Password policy**: minimum length + complexity (e.g., 8+ chars, at least one letter and one number — exact policy is a Part 1-adjacent product/security decision, not asserted here as a fabricated standard) enforced by Bean Validation + a custom validator.
- **Duplicate handling**: an invite token is single-use (mirrors PasswordResetToken's shape); a second registration attempt with a redeemed token returns a clear, non-enumerating "This invite is no longer valid" error.
- **Transaction**: invite-redemption + password-set + User-activation happen in one transaction.
- **Response**: minimal confirmation, no auto-login token issued directly from registration (forces an explicit Login step, keeping the two flows cleanly separated for auditing).
- **Errors**: invalid/expired/already-used token (400/410-style semantics under the shared error model, §25), password-policy violation (422/400).

**Structural guarantee restated**: the `RegisterRequest`/invite-redemption DTO class has no `role`, `isAdmin`, `accountStatus`, or any privilege-adjacent field — it cannot be added to accidentally later without a deliberate, reviewable change to the class itself, which is a stronger guarantee than a runtime check that could be forgotten on some code path.

---

## 19. Login Architecture

```text
Login → Credential validation → Account status check → Authentication → Access token → Refresh token → Role resolution → Frontend redirect
```

1. Look up `User` by email. **Regardless of whether the email exists**, run the password comparison against either the real hash or a dummy pre-computed hash (constant-time-shaped work) so response timing doesn't leak existence.
2. If credentials are invalid **or** the user doesn't exist: identical generic message, identical status code, identical response shape — "Invalid email or password."
3. If credentials are valid but `accountStatus = INACTIVE`: a **distinct** message is shown here — this is Part 1 §21/§36's deliberately accepted, explicitly-flagged exception to strict enumeration-hiding (an institutional-app tradeoff, not an oversight).
4. If valid and active: issue access + refresh tokens (§21), resolve `role` from the authenticated `User` (never from client input), return role alongside the tokens so the frontend can redirect to the correct dashboard.

**Hardening:**
- **Rate limiting/lockout**: tracked via the `LoginAttempt` table (or an in-memory/Redis-backed counter if introduced later, §37) — `failedLoginAttempts` and `lockedUntil` columns on `User` are incremented/set by the login Service on each failure; a progressive backoff (e.g., short lock after 5 failures, longer after 10) rather than a permanent lock, with an Admin-triggered unlock path (`PATCH /admin/users/{id}/unlock`) and no self-service unlock beyond waiting out the timer (a self-service unlock would itself be an enumeration/abuse vector).
- **Identical error messages**: enforced above.
- **Registration/reset rate-limiting**: same per-account-and-per-IP throttling principle applied to `/auth/register` (invite redemption attempts) and `/auth/forgot-password`.

---

## 20. JWT / Refresh Token Architecture

- **Access token lifetime**: short, e.g. 15 minutes — long enough to avoid excessive refresh traffic, short enough to bound the blast radius of a stolen access token.
- **Refresh token lifetime**: longer, e.g. 7–14 days, sliding or fixed (recommend sliding with a hard absolute cap, e.g. renew-on-use up to a 30-day absolute maximum) — exact numbers are a product/ops call, flagged in §38 if not already decided by the existing codebase (Part 2 §1 says the existing project already has this; preserve its numbers unless there's a specific reason to change them).
- **Rotation**: refresh tokens rotate on every use (old one invalidated, new one issued) — this is what makes reuse detection meaningful (below).
- **Hashing**: only the hash of the refresh token is stored in `RefreshToken` (the existing codebase already does this per Part 2 §2 — preserved, not redesigned).
- **Revocation**: logout revokes the specific `RefreshToken` row (and, for a full "log out everywhere," all rows for that user); Admin deactivation revokes all of a user's refresh tokens immediately.
- **Storage (frontend)**: **httpOnly, Secure, SameSite=Strict (or Lax if a cross-site redirect flow requires it) cookies** for both access and refresh tokens, not JS-accessible `localStorage`. Trade-off: this closes the XSS-token-theft vector (JS can't read the cookie even if an XSS bug exists elsewhere) but opens a CSRF surface, mitigated by `SameSite` plus a synchronizer CSRF token on state-changing requests (standard double-submit-cookie or header pattern) — this is the security-hardened default per §0's instruction that hardened options aren't optional-among-equals here.
- **Device/session model**: one `RefreshToken` row per device/session (not one row per user), so "log out this device" vs. "log out everywhere" are both representable, and reuse detection is scoped to a token **family** (a chain of rotations from one original login), not the whole user.
- **Token theft mitigation — reuse detection**: each `RefreshToken` row tracks a `familyId`. If a token is presented that matches a `familyId` but is **not** the current, latest token in that family (i.e., an already-rotated-away token is reused), the entire family is revoked immediately and the event is flagged for audit (§30) — this is the standard, well-established refresh-rotation-with-reuse-detection pattern, described here in plain terms rather than attributed to a specific library's internals per §0's "no fabricated authority" instruction.
- **Algorithm confusion defense**: the signing algorithm (e.g., HS256) is fixed in server configuration and the verifier is configured to accept only that algorithm — a token's own `alg` header is never used to select the verification method, and `none` is explicitly rejected.
- **Key management**: signing key from environment variables/secrets manager only; rotation approach = support two active keys (current + previous) during a rotation window so in-flight tokens signed with the previous key still validate until they naturally expire, then retire the previous key — detailed operational mechanics belong to Part 3/4.

---

## 21. Authorization

**Model**: Role + Permission (implicit in role for V1, no separate permission table since Part 1 defines no per-user permission variation) + Ownership + Department scope + Resource scope, checked **server-side on every request**, via Spring Security method-level annotations (`@PreAuthorize`) backed by a custom scope-resolution service — never relying on the frontend hiding a button.

| Capability | Rule |
|---|---|
| Admin → any Announcement/Event/Notification, any category/department | `role == ADMIN` |
| Faculty → Announcement/Event in {Academic, Department, Events}, own department | `role == FACULTY AND category IN (...) AND resource.departmentId == principal.departmentId` |
| Student → own Query | `role == STUDENT AND resource.studentId == principal.userId` |
| Admin → all Queries | `role == ADMIN` |
| Faculty → assigned Queries | `role == FACULTY AND resource.assignedToId == principal.userId` |

**General rules, applied uniformly:**
- Ownership/scope is resolved **from the authenticated principal** (the JWT's subject, looked up server-side), never from a client-supplied `userId`/`departmentId` in the request body — a request to fetch "my query" never takes a student ID as input; it's always "the query with this ID, if it belongs to the calling principal."
- Every request DTO is an explicit allow-list — `role`, `status` (in most contexts), `ownerId`, timestamps, and any computed/derived flag are never bindable fields on a client-facing DTO; they're set by the Service from server-side facts.
- **404-over-403 for existence-hiding**: e.g., a Student requesting another student's Query, or a Faculty member requesting an Announcement outside their department, gets `404 Not Found`, not `403 Forbidden` — this avoids confirming the resource exists at all to someone with no legitimate reason to know. (Admin-facing endpoints, where the requester is expected to see "this exists but you lack permission" for legitimate operational reasons, may use 403 — the choice is deliberate per-endpoint, not blanket.)

---

## 22. REST API Architecture

Base path: `/api/v1/`

Final resource groups (consolidating the candidate list per the "do not create unnecessary endpoints" instruction):

```text
/auth                    (register, login, refresh, logout, forgot-password, reset-password)
/users                   (self-profile: GET/PATCH "me"; Admin CRUD lives under /admin/users, not duplicated here)
/students                (Admin/Faculty-facing student lookups — read-mostly; write path is via /admin/users)
/faculty                 (Admin-facing faculty lookups — same pattern)
/academic-structure      (Department + Branch + Section, one resource group — consolidates the candidate list's separate /departments, /branches, /courses, since Part 1/§7 already merged these conceptually)
/hostels                 (Hostel + Block + Room)
/announcements
/events
/notifications
/queries
/preferences             (the calling user's own NotificationPreference rows)
/admin                   (Admin-only sub-resources: /admin/users, /admin/audit-logs, /admin/analytics, /admin/settings)
```

**Dropped from the candidate list**: separate `/departments`, `/branches`, `/courses` top-level groups (merged into `/academic-structure`, matching the Part 1 page consolidation and the §3/§7 entity decisions) — three thin CRUD groups over what is functionally one hierarchy would be exactly the "unnecessary endpoints" the prompt warns against.

---

## 23. Endpoint Specification

*(Representative full specification per the required 13-field template; templated across resource groups where the shape repeats identically, per §0's length-management instruction — every field is still addressed, not thinned.)*

### Auth

**`POST /api/v1/auth/register`**
- Purpose: redeem an invite token, set password, activate account.
- Auth: none (public, but token-gated).
- Authz: n/a.
- Request: `{ inviteToken, password, confirmPassword }`.
- Validation: token format, password policy, `password == confirmPassword`.
- Response: `{ message }` (no tokens issued — see §18).
- Status codes: 201 Created; 400 (validation), 404/410 (invalid/expired/used token — modeled as `INVALID_TOKEN` under the shared error model, not literally distinguishing 404 vs 410 to avoid leaking which failure mode occurred).
- Pagination/Filtering/Sorting: n/a.
- Idempotency: naturally idempotent-safe by token single-use (a retry with the same already-used token is rejected, not duplicated).

**`POST /api/v1/auth/login`**
- Purpose: authenticate, issue tokens.
- Auth: none. Authz: n/a.
- Request: `{ email, password }`.
- Validation: presence/format only (no business-logic leakage in validation errors — a malformed email still returns the generic invalid-credentials shape once it reaches the credential check, not a distinct "bad format" reveal beyond basic client-side UX help).
- Response: sets httpOnly cookies (access+refresh); body: `{ role, mustChangePassword? }`.
- Status codes: 200; 401 (invalid credentials — generic); 403 (`ACCOUNT_INACTIVE` — the one deliberate exception, §19); 429 (locked/rate-limited).
- Idempotency: n/a (not a mutating resource-creation call in the idempotency-key sense).

**`POST /api/v1/auth/refresh`**, **`POST /api/v1/auth/logout`**, **`POST /api/v1/auth/forgot-password`**, **`POST /api/v1/auth/reset-password`** — follow the same shape; forgot-password/reset-password specifically return the constant neutral response described in §17/§18 regardless of outcome, and are rate-limited (429 on abuse).

### Academic Structure / Hostels (CRUD template, Admin-write / broader-read)

**`GET /api/v1/academic-structure/departments`** — Auth: any authenticated role. Authz: read-only for all; response excludes nothing sensitive (departments aren't sensitive). Pagination: yes, max page size 100. Filtering: `active` flag. Sorting: name.
**`POST /api/v1/academic-structure/departments`** — Auth required. Authz: `ADMIN` only. Request: `{ name }`. Validation: unique name. Response: created Department. Status: 201; 400; 409 (`DUPLICATE_NAME`).
**`PATCH/DELETE .../departments/{id}`** — Admin only; delete is actually deactivate (`active=false`) if any Branch/StudentProfile references it, to avoid orphaning (§30) — a true hard delete is only permitted when zero references exist.

The same CRUD shape applies to `branches` (nested under a department), `sections`, `hostels`, `hostel-blocks`, `rooms` — each Admin-write, broadly-readable, paginated (max 100/page), filterable by parent and `active`.

### Announcements / Events / Notifications (content template)

**`POST /api/v1/announcements`**
- Purpose: create a DRAFT.
- Auth: required. Authz: `FACULTY` (category-and-department-scoped, §21) or `ADMIN`.
- Request: `{ title, content, category, priority, targetRules: [...], scheduledAt?, expiresAt?, attachmentIds? }`.
- Validation: category ∈ allowed set for the caller's role; `targetRules` shape valid; `scheduledAt` in the future if present.
- Response: created Announcement (DRAFT).
- Status: 201; 400; 403 (category/department outside caller's scope).
- Pagination/Filtering/Sorting: n/a for a single-resource create.
- Idempotency: not required for DRAFT creation itself (no delivery side-effect yet).

**`POST /api/v1/announcements/{id}/publish`**
- Purpose: transition DRAFT/SCHEDULED → PUBLISHED, materialize recipients.
- Auth/Authz: same as create, restricted to the author or Admin.
- Request: `{}` or `{ scheduledAt }` if scheduling rather than publishing immediately.
- Validation: target resolves to ≥1 recipient (else 422 `EMPTY_TARGET`, matching Part 1 §15's empty-result guard); category/priority/target are frozen from this point.
- Response: updated Announcement with `recipientCount`.
- Status: 200; 400; 403; 409 (already published); 422 (`EMPTY_TARGET`).
- **Idempotency: mandatory.** Client sends an `Idempotency-Key` header; the server stores a short-lived record of `(key → result)` and returns the original result for a retried request with the same key, instead of re-materializing recipients (§14/§24's explicit requirement).

**`GET /api/v1/announcements`** — role-scoped list (Student: only what targets them; Faculty: own department + authored; Admin: all). Filtering: category, priority, status, date range, author. Sorting: recency default. Pagination: cursor-based, **hard max page size 50** (prevents unbounded-query exhaustion per §24's requirement).

**`GET /api/v1/announcements/{id}`** — Authz: must be in the caller's eligible-recipient set, be the author, or be Admin — otherwise 404 (§21's existence-hiding rule).

Event and Notification endpoints mirror this exact shape (`create/draft`, `publish` with mandatory idempotency, `list` with the same pagination cap, `get-by-id` with the same 404-over-403 rule), differing only in their type-specific fields (§10/§12).

### Queries

**`POST /api/v1/queries`** — Auth: `STUDENT`. Request: `{ category, question, priority?, attachmentIds? }`. Response: created Query (PENDING). Status: 201; 400.
**`POST /api/v1/queries/{id}/assign`** — Auth: `ADMIN` or `FACULTY` (self-claim). Request: `{ assignedToId? }` (omitted = self-claim). Authz: Faculty can only self-claim from their own department's unassigned queue, or accept an Admin-directed assignment; cannot assign to a third party. Status: 200; 403; 409 (already assigned).
**`POST /api/v1/queries/{id}/responses`** — Auth: assigned Faculty or Admin. Request: `{ content, attachmentIds? }`. Side effect: Query status advances toward ANSWERED. Status: 201; 403 (not the assignee).
**`POST /api/v1/queries/{id}/reopen`** — Auth: the original `studentId` only. Validation: `now() < reopenDeadline`. Status: 200; 409 (window expired).
**`GET /api/v1/queries`** — role-scoped (own / assigned / all), paginated (max 50), filterable by category/status/priority/date.

### Preferences

**`GET /api/v1/preferences`** / **`PATCH /api/v1/preferences`** — Auth: any authenticated role, self only (no `userId` in the request — always "mine," per §21). Request (PATCH): `{ categoryPreferences: [{ category, muted, channels }] }`. Validation: Emergency and (per Part 1 §17) the non-muteable portion of Examination are rejected if present in the payload attempting to mute them — `422 CANNOT_MUTE_CATEGORY`.

### Admin

**`GET/POST/PATCH /api/v1/admin/users`** — full User+Profile CRUD, the only place `role` is client-settable (§4/§18). **`POST /api/v1/admin/users/{id}/unlock`** (§20). **`GET /api/v1/admin/audit-logs`** — paginated, filterable by actor/action/date, max page size 100. **`GET /api/v1/admin/analytics/*`** — aggregate-only endpoints (§ Part 1 §24.18 — never a per-student read-list). **`GET/PATCH /api/v1/admin/settings`** — System Settings (retention windows, reopen window, academic-year value, SLA copy).

---

## 24. Error Model

```json
{
  "timestamp": "2026-09-06T10:30:00Z",
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "Invalid request",
  "path": "/api/v1/announcements",
  "fieldErrors": [
    { "field": "targetRules", "issue": "At least one target rule is required" }
  ]
}
```

One shape for every error, produced by a single global `@ControllerAdvice` exception handler — no controller writes its own ad-hoc error response.

| Error code | Status | Notes |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field-level detail included. |
| `INVALID_CREDENTIALS` | 401 | Generic, identical for wrong-password and non-existent-account (§19). |
| `ACCOUNT_INACTIVE` | 403 | Deliberate exception (§19/§36). |
| `UNAUTHENTICATED` | 401 | Missing/expired/invalid token. |
| `FORBIDDEN` | 403 | Used only where existence-confirmation is acceptable (Admin contexts, §21). |
| `NOT_FOUND` | 404 | Also used in place of 403 where existence-hiding applies (§21). |
| `CONFLICT` | 409 | Duplicate email/studentId, double-publish, already-assigned query, etc. |
| `EMPTY_TARGET` | 422 | Publish attempted with zero resolved recipients. |
| `CANNOT_MUTE_CATEGORY` | 422 | Attempt to mute Emergency or the non-muteable Examination slice. |
| `RATE_LIMITED` | 429 | Login/registration/reset-request throttling. |
| `INTERNAL_ERROR` | 500 | Generic — **never** includes stack traces, SQL text, or internal class/package names in the response body; full detail goes to server-side logs only. |
| `SERVICE_UNAVAILABLE` | 503 | DB or downstream (e.g., email relay) unavailability, generic message. |

Nothing beyond this table's fields is ever serialized to the client — this is the enforcement point for "never expose SQL errors, stack traces, secrets, internal implementation details."

---

## 25. Database Architecture / 26. Complete Schema

Normalized relational design (3NF for structural tables; `NotificationRecipient` deliberately denormalized-by-design in the sense of being a wide, indexed fact table rather than something to normalize further — that's the correct shape for its access pattern, not a violation).

*(Every table below follows the same audit convention unless noted: `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`. Soft-delete/archive strategy: content tables (`announcement`, `event`, `notification`) use a `status` column that includes `ARCHIVED` rather than a separate `deleted_at` column — archiving *is* a status, not a deletion; structural tables (`department`, `hostel`, etc.) use `active BOOLEAN DEFAULT TRUE` for the same reason — deactivate, don't delete, when references exist.)*

| Table | Purpose | Key columns (beyond PK/audit) | PK | FKs | Unique | Indexes | Nullability highlights |
|---|---|---|---|---|---|---|---|
| `user` | Identity + auth | email, password_hash, role, account_status, failed_login_attempts, locked_until | id (BIGINT) | — | `email` | `(role)` | password_hash never null |
| `student_profile` | Student profile | student_id, name, phone, personal_email, department_id, branch_id, year, semester, section_id, batch, is_hosteller, hostel_id, block_id, room_id | id | user_id→user, department_id→department, branch_id→branch, section_id→section, hostel_id→hostel, block_id→hostel_block, room_id→room | `user_id`, `student_id` | `(department_id, branch_id, year, section_id)` composite for targeting joins | hostel_id/block_id nullable unless is_hosteller |
| `faculty_profile` | Faculty profile | faculty_id, name, phone, department_id, designation | id | user_id→user, department_id→department | `user_id`, `faculty_id` | `(department_id)` | — |
| `department` | Academic hierarchy root | name, active | id | — | `name` | — | — |
| `branch` | Program under a department | name, department_id, course_note, max_year, active | id | department_id→department | `(department_id, name)` | `(department_id)` | — |
| `section` | Targeting leaf | name, department_id, branch_id, year, active | id | department_id, branch_id | `(department_id, branch_id, year, name)` | `(department_id, branch_id, year)` | — |
| `hostel` | Hostel | name, type, active | id | — | `name` | — | — |
| `hostel_block` | Block | name, hostel_id, active | id | hostel_id→hostel | `(hostel_id, name)` | `(hostel_id)` | — |
| `room` | Room | room_number, block_id, floor, capacity, current_occupancy, active | id | block_id→hostel_block | `(block_id, room_number)` | `(block_id)` | — |
| `announcement` | Announcement content | title, content, category, priority, author_id, status, scheduled_at, published_at, expires_at | id (UUID) | author_id→user | — | `(status)`, `(category)`, `(priority)`, `(author_id)` | content TEXT |
| `event` | Event content | title, description, category, organizer_id, venue, start_at, end_at, registration_deadline, eligibility, department_id, min_year, max_year, registration_url, capacity, poster_attachment_id, status | id (UUID) | organizer_id→user, department_id→department (nullable), poster_attachment_id→attachment | — | `(status)`, `(start_at)`, `(department_id)` | department_id null = college-wide |
| `notification` | Standalone broadcast | title, content, category, priority, created_by_id, status, scheduled_at, published_at, expires_at, action_url | id (UUID) | created_by_id→user | — | `(status)`, `(category)`, `(priority)` | action_url nullable |
| `target_rule` | Shared targeting rules | target_type, target_id, audience_type, department_id, branch_id, year, section_id, hosteller_status, hostel_id, hostel_block_id | id | department_id, branch_id, section_id, hostel_id, hostel_block_id (all nullable FKs) | — | `(target_type, target_id)` | most FK columns nullable, only the relevant ones for a given row are set |
| `notification_recipient` | Per-user delivery/read state | notification_id, user_id, state, delivered_at, read_at, acknowledged_at | id (BIGINT, high volume) | notification_id→notification, user_id→user | `(notification_id, user_id)` | `(user_id, state)`, `(user_id, delivered_at)` | acknowledged_at null unless ack-required |
| `query` | Student query | student_id, category, priority, question, status, assigned_to_id, assigned_at, reopen_deadline | id (UUID) | student_id→user, assigned_to_id→user (nullable) | — | `(student_id)`, `(assigned_to_id, status)` | assigned_to_id null while PENDING |
| `query_response` | Threaded responses | query_id, responder_id, content | id | query_id→query, responder_id→user | — | `(query_id)` | — |
| `refresh_token` | Session/refresh state | user_id, token_hash, family_id, expires_at, revoked_at | id | user_id→user | `token_hash` | `(family_id)`, `(user_id)` | revoked_at nullable |
| `password_reset_token` | Reset flow | user_id, token_hash, expires_at, used_at | id | user_id→user | `token_hash` | `(user_id)` | used_at nullable |
| `login_attempt` | Rate-limit support | user_id (nullable), ip_address, succeeded, attempted_at | id | user_id→user (nullable) | — | `(user_id, attempted_at)`, `(ip_address, attempted_at)` | user_id null if email didn't match any account |
| `attachment` | Polymorphic file metadata | owner_type, owner_id, stored_filename (generated, non-guessable), original_filename, mime_type, size_bytes, uploaded_by_id | id | uploaded_by_id→user | — | `(owner_type, owner_id)` | original_filename retained for display only, never used as storage path |
| `notification_preference` | Per-user category settings | user_id, category, muted, channels | id | user_id→user | `(user_id, category)` | `(user_id)` | — |
| `audit_log` | Admin-facing audit trail | actor_id, action, target_type, target_id, metadata_json, occurred_at | id | actor_id→user (nullable if system-triggered) | — | `(actor_id, occurred_at)`, `(target_type, target_id)` | metadata_json never contains secrets/tokens/passwords (§30) |

---

## 27. Relationships

- **One-to-one**: `user` ↔ `student_profile`, `user` ↔ `faculty_profile` (a `user` has exactly one, enforced in Service since MySQL can't cleanly express XOR across two nullable FKs without a check spanning two tables — validated at the application boundary on every profile-creating operation).
- **One-to-many**: `department` → `branch`; `branch` → `section` (also scoped by year); `hostel` → `hostel_block`; `hostel_block` → `room`; `user(author)` → `announcement`/`event`/`notification`; `query` → `query_response`; `user` → `refresh_token`; `user` → `notification_preference` (one row per category, so effectively one-to-many).
- **Many-to-many, resolved via a join concept**: `announcement`/`event`/`notification` ↔ eligible `user`s — **not** a raw many-to-many join table, but resolved in two stages: `target_rule` (the *criteria*, many rows per target) and `notification_recipient` (the *materialized result*, one row per matched user per target) — this two-stage design is precisely what §13's targeting engine section explains, kept consistent here rather than re-described differently.
- `attachment` ↔ its owner (`announcement`/`event`/`query`) is a polymorphic one-to-many (one owner, many attachments) via `(owner_type, owner_id)` rather than three separate FK columns — avoids three nullable FK columns on one table for what's conceptually one relationship.

---

## 28. Index Strategy & Performance

- **Primary indexes**: every table's PK (BIGINT auto-increment for high-volume/internal tables like `notification_recipient`, `login_attempt`, `audit_log`; UUID for externally-referenced content tables per Part 1's non-guessable-route requirement — `announcement`, `event`, `notification`, `query`).
- **Foreign-key indexes**: every FK column indexed (MySQL/InnoDB doesn't always auto-index FK columns depending on how they're declared — made explicit here rather than assumed).
- **Composite indexes**: `(department_id, branch_id, year, section_id)` on `student_profile` for targeting-match queries; `(target_type, target_id)` on `target_rule`; `(user_id, state)` and `(user_id, delivered_at)` on `notification_recipient`.

**Special attention: `notification_recipient`.** This table grows roughly as `(number of notifications) × (average recipients per notification)`, which for an institution-wide platform is the single largest table in the system by a wide margin.
- **Pagination**: cursor-based only (§16) — `OFFSET`-based pagination on a table this size degrades linearly with offset depth and is explicitly avoided.
- **Query optimization**: the unread-count and feed queries are covered entirely by the `(user_id, state)` / `(user_id, delivered_at)` composite indexes — no full-table scans in the hot path.
- **N+1 prevention**: feed queries fetch `NotificationRecipient` joined with `Notification` in a single query (JPA `@EntityGraph` or an explicit `JOIN FETCH`), never lazy-loading `Notification` per recipient row in a loop.
- **Archiving/retention**: once a `Notification` reaches `ARCHIVED` and passes a retention window (System Settings-configured), its `notification_recipient` rows are candidates for moving to a cold-storage/archive table (or, at larger scale, a partitioned-by-month table with old partitions archived out) — this is flagged as a **Future** scaling step (§36), not required at the "thousands of students" scale Part 1 targets, but the schema (BIGINT PK, indexed `delivered_at`) is designed so that partitioning by date range is straightforward to add later without a redesign.

---

## 29. Transactions

| Operation | Boundary | Rollback behavior |
|---|---|---|
| Registration | Invite-redemption + password-set + `user.account_status = ACTIVE` in one transaction | Any failure (constraint violation, hashing error) rolls back the whole thing — no half-activated account. |
| Notification/Announcement/Event creation (DRAFT) | Single-row insert, trivially transactional | Standard rollback on constraint failure. |
| Notification/Announcement/Event **publishing** | Status flip + batched `notification_recipient` insert, all in one transaction | If the batch insert fails partway, the entire transaction rolls back — status never advances to PUBLISHED without recipients fully materialized (§14/§29's explicit "never half-materialized" requirement). |
| Event creation | Single-row insert + optional attachment linkage, one transaction | — |
| Query responses | Response insert + Query status transition, one transaction | If the status transition is invalid (e.g., Query already CLOSED by a race), the whole write rolls back and the client receives a 409. |
| Role changes | `user.role` update + any dependent profile-table creation/removal (e.g., promoting a role — though Part 1 defines no such promotion path in V1; flagged if it emerges, §38), one transaction | — |
| User management (create/deactivate) | `user` + profile-table insert/update, one transaction | Partial creation (User exists, profile doesn't) is never left visible — rollback restores pre-transaction state. |
| Academic structure changes | Structural update alone is transactional; if a Department/Branch/Section is deactivated while active students/content still reference it, the transaction either blocks (referential guard) or cascades to a safe reassignment path — never silently orphans references (§30). |

---

## 30. Data Consistency

- **Duplicate users**: `user.email` unique constraint + a pre-insert existence check in the Service (defense in depth — the DB constraint is the real guarantee, the Service check gives a cleaner error message).
- **Duplicate notifications**: `(notification_id, user_id)` unique constraint on `notification_recipient` (§13/§14/§16) + idempotency keys on publish endpoints (§24).
- **Duplicate event operations**: idempotency keys on publish/cancel/reschedule the same way.
- **Orphan records**: FK constraints with `ON DELETE RESTRICT` (not `CASCADE`) on structural tables referenced by content/profile tables — deleting a Department that still has students/branches fails loudly rather than silently cascading data loss; the product-level answer is deactivation, not deletion (§25/§26).
- **Invalid foreign keys**: enforced at the DB level (InnoDB FK constraints), not application-only.
- **Partial writes**: transaction boundaries above (§29) are the mechanism.
- **Inconsistent states**: e.g., `is_hosteller=false` with a non-null `hostel_id` — prevented by both a DB `CHECK` constraint and Service-layer validation (§5), so a direct migration script or an application bug can't independently produce the inconsistency past one layer without the other catching it.

**Secrets and sensitive-data hygiene:**
- Plaintext passwords, raw JWTs, and raw refresh/reset tokens are **never** written to `audit_log`, application logs, or any table — only BCrypt/SHA-256 hashes (already reflected in the schema, §26).
- `audit_log.metadata_json` is populated by an explicit allow-list of fields per action type (e.g., for a "publish" event: target id, recipient count, category — never the raw request body dumped wholesale, which could otherwise leak a password field from an unrelated concurrent request context if logging were ever done carelessly at a shared layer).
- DB credentials and the JWT signing key: environment variables / secrets manager only, never committed config — this is a hard requirement carried into Part 3/4's deployment design, not something this document can fully enforce on its own but states unambiguously here as a non-negotiable input to that design.

---

## 31. Attachment Architecture

```text
Upload → Validation → Storage → Metadata → Authorization → Download
```

- **Storage location**: **not MySQL BLOBs** — files go to object storage (e.g., a filesystem volume or S3-compatible bucket, finalized in Part 3/4's infra design) outside the web root; MySQL holds only the `attachment` metadata row (§26).
- **Metadata table**: `attachment` (§26) — polymorphic owner reference, generated storage filename, original filename (display-only), MIME type, size, uploader.
- **File limits**: per Part 1 §36's recommendation — 10MB, types confirmed against actual infra budget; enforced both client-side (fast feedback) and server-side (the only limit that actually matters for security).
- **MIME/extension validation — content-based, not trust-based**: the server inspects actual file content (magic-byte sniffing) to determine the real file type, rather than trusting the client-supplied `Content-Type` header or the filename's extension — a `.pdf`-named file containing an executable is rejected based on its real content.
- **Explicit rejection list**: `.exe`, `.sh`, `.php`, `.jsp`, and other executable/script types are rejected outright regardless of claimed extension, on top of the allow-list approach (belt-and-suspenders).
- **Filename strategy**: the stored filename is a generated, non-guessable identifier (e.g., a UUID), completely decoupled from the original filename — prevents path traversal and prevents the file from being directly executable-by-name even if storage were ever misconfigured as web-accessible.
- **Malware scanning**: flagged as a required step in the pipeline (between Validation and Storage, or as an async post-storage quarantine-then-release step) — the specific scanning engine/service is an infra choice for Part 3/4; this document specifies that no attachment is served for download until it has cleared this check.
- **Access control**: downloads go through an **authenticated, authorized endpoint** (`GET /api/v1/attachments/{id}/download`) that re-checks the caller's authorization against the attachment's owner record (is this Query/Announcement/Event visible to this caller, per §21's rules) before streaming the file — never a static, guessable public URL. A signed, time-limited URL is an acceptable alternative implementation of the same principle if object storage supports it natively.
- **Retention/Deletion**: attachments are retained as long as their owning record isn't hard-deleted; since content records are archived rather than hard-deleted (§25/§26), attachments generally persist too — an explicit Admin-triggered deletion path exists for genuine cleanup (e.g., a mistakenly-uploaded file), which removes both the storage object and the metadata row in one transaction.

---

## 32. Background Processing

| Operation | Sync or Async? | Why |
|---|---|---|
| Large notification recipient materialization | **Async**-capable for very large audiences, synchronous within the publish request for typical audience sizes | A department-wide publish (hundreds of rows) is fine synchronously inside the publish transaction (§29); a college-wide publish (thousands of rows) is still done as one batched-insert transaction, but the *response* to the client can return as soon as the transaction commits — no separate job queue needed at this scale. Flagged as a candidate to move fully async (job-queued) only if profiling in Part 3/4 shows the synchronous path causing request-timeout issues at real data volumes. |
| Scheduled publishing (§33) | **Async** (scheduler-triggered, no HTTP request involved) | Inherently a background concern — there's no request to be synchronous *with*. |
| Email delivery | **Async** | Must never block an API response on an external SMTP round-trip; failures are retried/logged, not surfaced as a failure of the triggering action itself. |
| Push delivery (Future) | **Async** | Same reasoning as Email. |
| File processing (malware scan, if not instantaneous) | **Async** (upload accepted as "pending scan," attachment not downloadable until scan clears) | Keeps upload response times reasonable regardless of scan-engine latency. |
| Reports/Analytics aggregation | **Async / scheduled** (e.g., nightly pre-aggregation for heavier analytics views) with light on-demand queries for simpler counts | Avoids expensive aggregation queries running synchronously on every Admin dashboard load. |

**Recommended architecture — simplest that scales**: **Spring's built-in `@Async` + `@Scheduled`** (backed by a bounded thread pool), with a lightweight **outbox-pattern-style table** for anything that must survive an app restart mid-flight (e.g., a `pending_email` row inserted in the same transaction as the triggering event, then drained by a scheduled poller) — this avoids introducing a message broker (RabbitMQ/Kafka) that Part 1's scale doesn't yet justify. A message broker is the correct **Future** answer if/when true multi-instance horizontal scaling (§37) makes a single instance's in-process scheduler insufficient — noted, not built now.

---

## 33. Scheduling

- **Scheduler architecture**: a single `@Scheduled` poller (e.g., every 1 minute) that queries for `Announcement`/`Event`/`Notification` rows where `status = SCHEDULED AND scheduled_at <= now()`, and transitions them to PUBLISHED (running the same publish logic and transaction as the manual publish endpoint — one code path, not two divergent implementations).
- **Time zones**: all `scheduled_at`/`expires_at` values stored in UTC in MySQL; the institution's local timezone is applied only at the presentation layer (Part 1's requirement to show the timezone explicitly in the scheduling UI) — this avoids the classic bug class of comparing mixed-timezone timestamps in the scheduler query.
- **Cancellation**: handled by the same DRAFT-revert endpoint as manual cancellation (§9/§14) — the scheduler simply won't find a row that's no longer `SCHEDULED`.
- **Rescheduling**: updates `scheduled_at`; the next poller run picks up the new value naturally, no special-casing needed.
- **Failure handling**: if publishing a specific scheduled item fails (e.g., its target now resolves to zero recipients because structural data changed after scheduling), the item is flagged (`status` stays `SCHEDULED`, a `last_publish_error` field records why) rather than silently disappearing, and it surfaces on the author's/Admin's list view as needing attention.
- **Retries**: transient failures (e.g., a momentary DB blip) are retried a small bounded number of times within the same poller run's transaction boundary before falling back to the failure-flagging above.
- **Duplicate prevention / idempotency**: the poller's query-then-transition step uses a `SELECT ... FOR UPDATE`-style row lock (or an equivalent optimistic-locking version check) so that if a future multi-instance deployment (§37) ever runs more than one scheduler instance, two instances can't both pick up and publish the same row twice — designed in now even though V1 likely runs a single instance, since retrofitting this safety after going multi-instance is far riskier than including it from the start.

---

## 34. Caching

| Area | Cache? | Invalidation |
|---|---|---|
| Academic structure (Department/Branch/Section lists) | **Yes** — read-heavy, changes rarely | Invalidate on any Admin write to that table (cache-aside with a short TTL, e.g. 10 minutes, plus explicit invalidation on write for immediacy). |
| Hostel structure | **Yes**, same pattern | Same. |
| Notification categories/priorities | **Yes** — these are fixed enums, effectively static | Invalidate only on a deploy (they're not Admin-editable in V1 per Part 1 §10 Future). |
| Public event information (upcoming events list) | **Yes**, short TTL (e.g., 1–2 minutes) | Time-based expiry is sufficient; genuine near-real-time freshness isn't a stated requirement for browsing events. |
| System configuration (retention windows, reopen window, etc.) | **Yes** | Invalidate on Admin Settings save. |
| **Not cached**: unread counts, notification feeds, user profiles, query status | Explicitly **not** cached without justification, per §0's instruction — these are per-user, highly dynamic, and the DB-index-backed queries (§28) are already fast enough that caching would add invalidation complexity for little benefit, plus risk of showing stale unread counts, which is exactly the kind of user-visible correctness bug worth avoiding. |

Implementation: Spring's `@Cacheable`/`@CacheEvict` with an in-process cache (e.g., Caffeine) for V1 — no separate Redis deployment needed at this scale; Redis becomes the right choice only if/when the app runs multiple instances and needs a shared cache (§37), at which point the same `@Cacheable` abstractions swap backing stores without a redesign.

---

## 35. Data Flow

The standard flow applies to every major feature identically:

```text
Browser → Next.js → REST API (/api/v1/...) → Spring Security filter chain → JWT validation
  → Controller → DTO validation (Bean Validation) → Service (business rules, transaction boundary)
  → Repository (Spring Data JPA) → MySQL → mapped back to Response DTO → Next.js → UI state → render
```

**Per-feature specifics** (only the deviations from the generic flow matter, so only those are called out):
- **Announcements/Events/Notifications (create)**: Service step includes the Targeting Engine (§13) for validation/preview; no MySQL write beyond the DRAFT row itself yet.
- **Announcements/Events/Notifications (publish)**: Service step is the transactional publish-and-materialize operation (§29); Response DTO includes `recipientCount` so the frontend can show the confirmation (Part 1 §15/§18).
- **Queries**: Service step includes ownership/scope resolution (§21) before any read/write.
- **Login**: Service step includes the constant-time credential check and lockout logic (§19) before token issuance; Response is cookies, not a JSON token body (§20).
- **Attachments**: an additional Storage step (object storage, §31) sits between Service and the metadata write to MySQL — the file itself never touches MySQL.

---

## 36. Notification Data Flow

```text
Authorized Sender (Faculty/Admin)
 → Create Notification (DRAFT, POST /api/v1/notifications)
 → Validate (category/scope authorization, field validation)
 → Target Rules (POST as targetRules[], stored in target_rule)
 → Targeting Engine resolves eligible users (SELECT DISTINCT user_id ... per §13, run for the live preview, then re-run authoritatively at publish time)
 → Publish (POST .../publish, idempotency-key guarded)
 → Recipient Records materialized (batched INSERT into notification_recipient, one transaction with the status flip to PUBLISHED)
 → MySQL commit
 → Notification API (GET /api/v1/notifications, cursor-paginated, joined with notification_recipient for the calling user)
 → User (Notification Center / Dashboard, Part 1 §16/§26)
 → Read Action (PATCH .../notifications/{id}/read, or a bulk mark-all-read)
 → Recipient State Update (notification_recipient.state = READ, read_at = now(), scoped to that one user's row only — never affects other recipients)
```

**Scheduled notifications**: identical flow, except the transition DRAFT/SCHEDULED → PUBLISHED is triggered by the §33 scheduler poller instead of a direct client request — the publish Service method itself is the same code path either way.
**Failures**: a failed publish attempt (e.g., `EMPTY_TARGET`, or a transient DB error during the batch insert) leaves the Notification in its prior status with no partial recipient rows (transaction rollback, §29) — the sender sees a clear error and can retry, and a retry with the same idempotency key is safe even if the first attempt's failure state is ambiguous to the client.

---

## 37. Scalability

Assumptions: thousands of students, hundreds of faculty, multiple departments/hostels, large notification history, concurrent users — a real but single-institution scale, not an internet-scale multi-tenant system.

- **Connection pooling**: HikariCP (Spring Boot default), sized to the expected concurrent-request volume, not left at framework defaults without review.
- **Database indexes**: per §28, with `notification_recipient` as the specifically engineered table.
- **Pagination**: cursor-based everywhere a list can grow large (§16/§23's hard max-page-size requirement applied uniformly).
- **Background jobs**: `@Async`/`@Scheduled` per §32/§33 — sufficient at this scale, revisited only if profiling says otherwise.
- **Queueing**: not introduced in V1 (§32) — the outbox-table pattern covers the durability need without a broker.
- **Batching**: recipient materialization is batch-inserted (§13/§29), never row-by-row.
- **Caching**: per §34, in-process (Caffeine) for V1.
- **Horizontal scaling**: the application layer is designed to be **stateless** (JWT-based auth, no in-memory session state beyond the short-lived idempotency-key cache which would need to move to a shared store — e.g., a dedicated MySQL table rather than in-process memory — the moment a second instance is introduced, flagged explicitly here as the one piece of this design that isn't yet multi-instance-safe by default and needs that adjustment before scaling out) — so adding a second application instance behind a load balancer is straightforward once that idempotency-key store is externalized; MySQL itself scales vertically first, then via read replicas for read-heavy endpoints (analytics, feed reads) if/when needed.
- **Microservices**: not introduced (§1) — nothing in the assumed scale profile justifies the operational cost.

---

## 38. API Documentation

**OpenAPI/Swagger**, generated from the codebase (e.g., springdoc-openapi) rather than hand-maintained separately, covering:
- Every endpoint in §23, grouped by the module boundaries in §2.
- Every Request/Response DTO, with the allow-list nature of each DTO visible directly in its schema (so "role is not a field on RegisterRequest" is verifiable by anyone reading the generated spec, not just asserted in this document).
- Authentication: documented as cookie-based bearer-equivalent (httpOnly cookie, §20) — Swagger UI's "Authorize" flow configured accordingly for internal testing use.
- Roles required per endpoint, surfaced via the `@PreAuthorize` annotations feeding into the generated docs where the tooling supports it, or documented manually per endpoint otherwise.
- The full error-code table (§24) included as shared reusable response schemas, not redefined per endpoint.
- Pagination/filtering parameters documented once as a shared, reusable parameter set (page cursor, page size with its hard max, sort field, filter fields) rather than repeated inline per endpoint.
- Example request/response payloads for at least one representative endpoint per resource group (§23), not necessarily every single endpoint, to keep the spec maintainable.

---

## 39. Backend Open Questions

**1. Exact access/refresh token lifetimes.**
- Options: (a) preserve whatever the existing codebase already uses (Part 2 §1/§2 says foundations already exist), (b) set new values now (e.g., 15 min / 7 days).
- Advantages: (a) zero migration risk, respects "extend rather than rewrite"; (b) a clean, deliberately-chosen baseline if the existing values were never actually reviewed for security fitness.
- Disadvantages: (a) risks preserving an under-reviewed value; (b) unnecessary churn if the existing values are already fine.
- **Recommended**: (a) — audit the existing values against this document's stated ranges as a Part 3 verification step, changing only if they fall outside a reasonable band, rather than assuming a rewrite is needed.
- Impact: Security (token lifetime is a real exposure-window parameter), Backend (config change only, low code impact either way), Testing (session-expiry test cases depend on the final numbers).

**2. Whether Model A's materialization-at-publish-time semantics (§13) are acceptable for the edge case of a student transferring departments after a notification was published.**
- Options: (a) accept as-is (recipient list reflects targeting at publish time, permanently), (b) add a reconciliation job that removes/adds recipient rows when a student's structural attributes change.
- Advantages: (a) simplest, matches most institutions' actual expectation ("you got the notice because it was relevant to you then"); (b) keeps recipient lists "correct" under a stricter, always-current definition.
- Disadvantages: (a) a transferred student's historical read/unread badge counts could look odd to them in hindsight; (b) meaningfully more complexity for an edge case with no stated product demand.
- **Recommended**: (a), explicitly, per §13's reasoning — revisit only if real user complaints surface.
- Impact: UX (none, if (a); a "why do I have this old CSE notice" support question if it ever comes up), Backend (a reconciliation job if (b)), Database (extra write load if (b)), Testing (transfer-scenario test cases either way).

**3. Whether `TargetRule` should eventually support exclusion ("everyone except X") semantics.**
- Options: (a) never in the current model (as designed, §13), (b) add a `NOT`/exclude flag to `target_rule` rows.
- Advantages: (a) keeps the matching query simple and fast; (b) covers a real-world case (e.g., "all CSE Year 3 except those already excused") if it turns out to matter.
- Disadvantages: (a) that specific case has no current workaround beyond manual list curation outside the system; (b) meaningfully complicates both the SQL (AND/OR/NOT combinations) and the Part 1 targeting UX, which was never designed with exclusion in mind.
- **Recommended**: (a) for V1; treat as a Version 1/Future candidate only if a concrete, recurring need is demonstrated (not speculative).
- Impact: UX (a new UI affordance if ever added), Frontend/Backend (query complexity), Database (schema addition, non-breaking), Testing (a new dimension of targeting test cases).

**4. Single-instance vs. multi-instance deployment target for V1, which determines whether the idempotency-key store and scheduler-locking (§33/§37) need to be externalized immediately or can start in-process.**
- Options: (a) design for single-instance V1, externalize (shared idempotency-key table, row-locking scheduler) only when scaling out, (b) build the shared/external versions from day one.
- Advantages: (a) less upfront complexity, faster to ship; (b) avoids a migration later.
- Disadvantages: (a) a real migration step is needed later if/when scaling out; (b) speculative complexity if single-instance turns out to be sufficient for years.
- **Recommended**: (a), with the specific seam (idempotency-key store, scheduler row-locking) already designed to be swappable (§33/§37 both already specify the DB-backed version, which is trivially shared-safe even from a single instance — so in practice this recommendation costs almost nothing extra now while remaining multi-instance-ready).
- Impact: Backend/Database (minimal either way, since the recommended default is already the shared-safe shape), Testing/DevOps (Part 3/4 owns the actual scale-out decision and testing).

**5. Malware-scanning engine/service choice.**
- Left entirely to Part 3/4 (infra-adjacent decision) — flagged here only to confirm the pipeline step's existence (§31) is a hard requirement regardless of which engine is chosen.
- Impact: Security (the core requirement), Backend (an integration point, engine-agnostic), Testing (scan-pending-state test cases).

---

## 40. Recommended Final Backend Architecture

**Summary of the shape this specification converges on:**

- **One Spring Boot modular monolith**, package-per-bounded-context (§2), no microservices — matches the assumed institutional scale and the "avoid unnecessary microservices" instruction.
- **Strict DTO-per-operation discipline** is the single mechanism that makes every privilege-escalation guardrail in this document (role, account status, ownership) structurally true rather than merely validated — this is the architectural decision every other security requirement in §5/§18/§21 leans on.
- **One shared `TargetRule` + `NotificationRecipient` targeting/delivery core**, reused identically by Announcement, Event, and Notification (§13), instead of three parallel, duplicated targeting implementations — directly resolves the "avoid duplicated logic" instruction from §3 of this prompt.
- **Recipient materialization (Model A)** at publish time, batched and transactional, with mandatory idempotency on every publish endpoint — the single most important correctness property in the whole system, since a duplicated or partially-materialized notification is the most visible possible failure mode to end users.
- **JWT-in-httpOnly-cookie authentication**, rotation-with-reuse-detection refresh tokens, fixed-algorithm verification, and identical-shaped auth failure responses — a deliberately security-hardened default set per §0's instruction that these aren't optional nice-to-haves.
- **Cursor pagination + hard max page sizes everywhere**, with `notification_recipient` engineered from day one (indexes, batching, a designed-in future partitioning seam) as the table most likely to strain the system.
- **No new infrastructure in V1** beyond what the existing stack already provides (MySQL, in-process scheduling/caching/async) — SSE, Redis, message brokers, and object-storage-backed attachments are named as the correct **Future** evolutions, each tied to a specific, named trigger condition rather than adopted speculatively now.

This specification, together with Part 1, is intended to be handed to an engineering team as the authoritative NotifyHub Backend, Database & API baseline for Parts 3–4 (security/testing/reliability, and DevOps/deployment) to build against.
