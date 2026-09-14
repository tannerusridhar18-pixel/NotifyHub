# NotifyHub Backend — Fix Pass (2026-09-13)

## Environment note (read this first)

This review environment has no Maven installation and no network access, so
`mvn clean package` / `mvn clean verify` could not be run here — same
limitation the prior `PRODUCTION_REVIEW_2026-09-13.md` pass documented.
Every finding below comes from a full manual read of all 63 Java source
files, all 8 Flyway migrations, `pom.xml`, and `application.yml`, cross-checked
against each other (entity column mappings vs. migration DDL, repository
method names vs. usage, constructor signatures vs. test mocks, security
route ordering vs. controller mappings, etc.).

**Before deploying, run:**
```
mvn clean verify
```
against a real MySQL instance. Nothing in this pass changes public method
signatures, so the existing test suite should compile and run as before,
now with one additional passing assertion (see fix #2).

## Fixed in this pass

### 1. Schema/entity mismatch on `users.username` (would likely break startup)

`V3__widen_identity_username.sql` widens the `username` column to
`VARCHAR(190)`, but `User.java` still mapped it as `@Column(length = 80)`.
With `spring.jpa.hibernate.ddl-auto=validate` (which this project correctly
uses so Flyway stays the only schema owner), Hibernate's schema validator
compares each mapped column's length against the live database DDL at
startup and fails fast on a mismatch — this would very likely have thrown a
`SchemaManagementException` the first time the app started against a
migrated database.

It also mattered functionally, not just at boot: `AdminInvitationService`
sets `username = email` for every invited user, and email addresses can
legitimately exceed 80 characters while staying under the `email` column's
190-character limit — so even if schema validation had been off, long
emails would have been silently truncated or rejected inconsistently
between the two columns.

**Fix:** `User.java` — `username` column length changed from 80 to 190,
matching the actual migrated schema and the `email` column it's often set
equal to.

### 2. Test would NPE: `AnnouncementServiceTest`

`AnnouncementServiceTest` uses `@InjectMocks` to construct
`AnnouncementService`, which takes four constructor dependencies
(`AnnouncementRepository`, `UserRepository`, `TargetingService`,
`ApplicationEventPublisher`). Only three `@Mock` fields were declared —
`ApplicationEventPublisher events` was missing — so Mockito injected `null`
for it. The `draftCanPublishAndThenUnpublish` test calls
`service.publish(1L)`, which calls `events.publishEvent(...)`, which would
throw a `NullPointerException` against a null publisher.

**Fix:** added `@Mock ApplicationEventPublisher events;` to the test class.

### 3. Local dev config hygiene

`application-local.yml` and `application-local.yml.example` (both
git-ignored, not part of the live secret-leak `PRODUCTION_REVIEW` already
fixed in the committed `application.yml`) still contained real-looking
placeholder credentials (`root@123`, `admin@123`) and had mail delivery
enabled by default. Replaced with obviously-inert `REPLACE_WITH_...`
placeholders and set `mail.enabled: false` by default, consistent with
`.env.example`'s convention, so nobody accidentally copies a "looks real"
password into a shared or committed file.

## Full-codebase review — reviewed and found solid

In addition to the three fixes above, the following areas were read in
full and found internally consistent, with no further changes needed:

- **Security stack**: `JwtService` (fail-fast secret validation, HS256
  signing/parsing), `JwtFilter` (cookie-then-header token resolution,
  principal construction, graceful handling of invalid/expired tokens),
  `SecurityConfig` (route-matcher ordering was checked against every
  controller's actual mappings — more specific `permitAll()`/`authenticated()`
  rules correctly precede the broader `hasRole("ADMIN")` catch-alls),
  `RateLimitFilter` (per-IP+path sliding-minute counters with bounded
  memory), `SecureTokenService` (SHA-256 hashing, `SecureRandom` token
  generation), `AuthCookieService`/`AuthController` (HttpOnly cookie
  issuance, CSRF exemptions scoped correctly to the unauthenticated auth
  endpoints only).
- **AuthService**: constant-time dummy-hash comparison on unknown-user
  login (timing-safe against user enumeration), refresh-token rotation
  with family-based revocation on reuse detection, single-use
  pessimistic-locked invitation/password-reset tokens, account
  lockout after 5 failed attempts.
- **Announcement/Event/Query services and controllers**: anonymous vs.
  authenticated feed routing (the `AnonymousAuthenticationToken` fix from
  the prior review pass is in place and correct), status-transition guards
  (draft → published → archived/cancelled), targeting resolution and the
  visibility JPQL queries (cross-checked `TargetingService.scope()` against
  `AnnouncementRepository.visible()`/`EventRepository.visible()`).
- **StructureService**: uniqueness checks, active/inactive cascading
  validation, the `maxYear`-vs-existing-sections guard from the prior
  review pass, hostel/block/room capacity and occupancy validation.
- **Identity/invitation flow**: `AdminInvitationService` profile validation
  for students (department/branch/section/hostel chain consistency) and
  faculty, `IdentityService` role/status transition guards, async
  after-commit email dispatch for both invitations and announcement
  publishing (mail failures are caught and recorded, never block the
  triggering request).
- **All entity ↔ migration column mappings** (types, lengths, nullability,
  unique constraints) were cross-checked line by line for every table:
  `users`, `refresh_tokens`, `invitations`, `password_reset_tokens`,
  `departments`, `branches`, `sections`, `student_profiles`,
  `faculty_profiles`, `hostels`, `hostel_blocks`, `rooms`, `announcements`,
  `events`, `queries` — no further mismatches found beyond fix #1 above.
- **Repository method names** referenced from services (e.g.
  `existsByBranchIdAndAcademicYearGreaterThan`, `findByDepartmentId`,
  `findForUpdateByTokenHash`) were all confirmed to exist with matching
  signatures.
- **`pom.xml`**: dependency set and versions are coherent (Spring Boot
  3.5.4 / Java 21 parent, matching JJWT 0.12.6 API/impl/jackson trio,
  Flyway + `flyway-mysql`, MySQL connector, test starters).

## Recommended before production deployment (unchanged from prior review)

These are product/ops decisions, not bugs, and were already flagged
previously — repeating here so they're not lost:

- The bundled rate limiter is per-instance/in-memory. For a
  multi-instance deployment behind a load balancer, use a shared
  limiter (Redis or gateway-level) and configure trusted
  `X-Forwarded-For` handling if `request.getRemoteAddr()` won't reflect
  the real client IP behind your proxy.
- Set real, unique secrets for `JWT_SECRET`, `DB_PASSWORD`,
  `ADMIN_PASSWORD` via your hosting platform's secret manager —
  never in a committed file.
- If you want announcement search/category filtering as a user-facing
  feature (there's already a `category` column sitting unused in the
  `announcements` table from the original schema), that's a real feature
  to scope, not a bug fix.
