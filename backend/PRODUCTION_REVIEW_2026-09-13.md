# NotifyHub Backend — Production Review (2026-09-13)

Scope note: this environment has no Maven/JDK-dependency network access, so I
could not run `mvn clean package`/`mvn test` here. Everything below comes
from a full manual, file-by-file read of all 79 source files, the Flyway
migrations, and the configuration. Please run the existing test suite
(`mvn clean verify`) before deploying — it should still pass, since none of
the fixes change public method signatures used by the tests.

## Critical — fixed

1. **Leaked live credentials committed in `application.yml`.**
   The file hardcoded a real Gmail address and what is almost certainly its
   App Password as *default* values for `MAIL_USERNAME`/`MAIL_PASSWORD`,
   plus default fallback passwords for the datasource (`root@123`) and the
   seeded admin account (`admin@123`), with `admin-sync-password` and
   `mail.enabled` both defaulting to `true`. Concretely: deploying this file
   as-is, with no environment variables set, would have silently sent mail
   through that real Gmail account and created an admin login of
   `admin / admin@123`.
   **Action needed on your end: rotate/revoke that Gmail App Password now**
   — treat it as compromised.
   **Fix:** removed all hardcoded secret defaults from `application.yml`.
   `MAIL_USERNAME`, `MAIL_PASSWORD`, `DB_PASSWORD`, and `ADMIN_PASSWORD` now
   default to empty, `ADMIN_SYNC_PASSWORD` and `MAIL_ENABLED` now default to
   `false`. Nothing sensitive works until you explicitly configure it via
   environment variables, matching what `SECURITY_AUDIT.md` already claimed.

2. **The public announcement/event feeds actually returned 401 for real
   anonymous visitors.**
   `AnnouncementController`/`EventController` checked `Authentication a ==
   null` to decide whether to serve the public feed. Spring Security's
   default anonymous-authentication filter always populates `Authentication`
   for unauthenticated requests (as an `AnonymousAuthenticationToken` named
   `"anonymousUser"`) — it's never actually `null` in a normal request.
   So the code always took the "authenticated" branch, tried to look up a
   user named `anonymousUser`, failed, and threw `401 Unauthorized` — on
   endpoints explicitly configured as `permitAll()`. This broke the core
   "browse announcements/events without logging in" feature.
   No existing test caught this because `SecurityIntegrationTest` never
   exercises `GET /api/v1/announcements` or `/api/v1/events` anonymously.
   **Fix:** both controllers now check for a real authenticated, non-anonymous
   principal (`a != null && a.isAuthenticated() && !(a instanceof
   AnonymousAuthenticationToken)`) before routing to the scoped feed.

## Medium — fixed

3. **`StructureService.updateBranch` allowed lowering `maxYear` below
   sections that already exist**, silently producing inconsistent data (a
   "Year 3" section under a branch capped at 2 years). Added a check
   (`SectionRepository.existsByBranchIdAndAcademicYearGreaterThan`) that
   now rejects the update with `409 Conflict` in that case.

4. **Unique-constraint races returned raw 500s.** Department/branch/section/
   hostel/block/room creation does a check-then-insert on uniqueness; a race
   between two concurrent requests can still hit the DB's unique constraint.
   That threw an unhandled `DataIntegrityViolationException`, caught only by
   the generic `Exception` handler as an opaque `500`. Added a dedicated
   handler that returns a clean `409 Conflict` instead.

5. **CORS only supported a single frontend origin.** Real deployments
   commonly need more than one (apex + `www`, or a staging environment).
   `notifyhub.frontend-origin` now accepts a comma-separated list.

## Documentation corrected (no behavior change)

6. `README.md` claimed the public announcement feed supports "search" and
   "category" filtering. Neither exists anywhere in the code (there isn't
   even a category column on `Announcement`) — the actual capabilities are
   pagination, urgent-only filtering, and target-based visibility. Corrected
   the wording so the frontend/API consumers aren't led to expect endpoints
   that don't exist.

7. `BACKEND_FINAL_NOTES.md` claimed `JwtService` has "a long development
   fallback" for a missing `JWT_SECRET`. The actual code (correctly) has no
   fallback and fails fast at startup if the secret is missing or under 32
   bytes. Updated the note to describe the real (and better) behavior.

## Reviewed and found solid

The rest of the codebase is in good shape: BCrypt(12) password hashing with
a constant-time dummy-hash comparison on login to avoid user-enumeration
timing leaks, SHA-256-hashed rotating refresh tokens with family-based
revocation on reuse, single-use hashed invitation/reset tokens with
pessimistic row locks, stateless JWT auth, a sensible CSRF setup for a
cookie-based SPA, security headers (CSP/HSTS/frame-deny), generic error
responses with no stack traces, and consistent server-side authorization
checks (verified the `SecurityConfig` `authorizeHttpRequests` ordering
against every controller's actual routes and methods).

## Worth considering next (not changed — needs a product decision, not just a bug fix)

- The in-memory rate limiter and its per-IP keying (`request.getRemoteAddr()`)
  won't work correctly behind a reverse proxy/load balancer without also
  trusting `X-Forwarded-For` from a known proxy — and multi-instance
  deployments need a shared limiter (Redis, gateway-level, etc.), as
  `SECURITY_AUDIT.md` already flags.
- If you actually want search/category filtering on announcements (per the
  original README wording), that needs a real feature decision: a schema
  migration for a `category` column, a search query (fulltext vs `LIKE`),
  and new frontend UI — happy to build it, just flag it as a feature request
  rather than a bug fix.

## Follow-up pass — delete endpoints + notification feature

- **Added `DELETE /api/v1/announcements/{id}` and `DELETE /api/v1/events/{id}`.**
  These were listed in the README's own API reference but never implemented
  — a real gap, not just a doc error. Deletion is blocked while an item is
  `PUBLISHED` (must be unpublished/archived or cancelled first) so a live
  announcement/event can't disappear without a trace.
- **New feature: email notification on announcement publish.** Nothing
  previously notified anyone when an announcement went live — for an app
  named NotifyHub, that's the most important missing capability, and it
  reuses infrastructure (SMTP config, async executor, after-commit event
  dispatch) already built for invitation emails. `AnnouncementService.publish()`
  now fires an `AnnouncementPublishedEvent`; `AnnouncementNotificationDispatcher`
  resolves the right audience for the announcement's target (all active
  users, a role, or students/faculty in a department/branch/section) and
  emails each of them individually (not BCC, so recipients' addresses stay
  private from each other). Controlled by the same `MAIL_ENABLED` flag as
  invitations, so it's off until SMTP is actually configured. New env var:
  `ANNOUNCEMENT_PATH` (default `/announcements`) for the link in the email.
