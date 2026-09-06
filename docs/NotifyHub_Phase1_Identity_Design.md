# NotifyHub Phase 1 Identity Design

Status: Implementation design
Date: 2026-09-06

## Compatibility decision

The existing V1 schema already contains users, refresh_tokens, and foreign keys from announcements/events to users. Phase 1 extends that schema with Flyway V2 instead of dropping or renaming legacy tables. Existing legacy content therefore remains addressable while identity moves to the approved model.

The existing `users.id` remains an internal BIGINT primary key because changing it would require destructive rewrites of legacy foreign keys. A non-guessable `public_id` UUID is added and is the only user identifier used by new APIs. Existing username and active columns remain temporarily for legacy compatibility; new services use email, role, and account status.

## Tables

### users

Existing identity row extended with:

- `public_id` UUID, unique and non-guessable.
- `account_status`: INVITED, ACTIVE, or INACTIVE.
- `failed_login_attempts`, `locked_until`, and `must_change_password`.
- Existing password hash, email, role, timestamps, and legacy username are retained.

Important invariants are enforced by MySQL unique constraints and service validation. Role is never accepted by public registration.

### departments, branches, sections

Normalized academic reference data. Branches belong to departments. Sections belong to a branch and department and carry the academic year. These are minimal structure tables required for identity profiles; management workflows remain limited to the Phase 1 foundation.

### student_profiles

One-to-one with users. Stores institutional student ID, name, department, branch, section, year, semester, batch, hosteller flag, and optional personal contact fields. Profile fields are not accepted by public registration; they are provisioned by an Admin invitation.

### faculty_profiles

One-to-one with users. Stores faculty ID, name, department, phone, and designation. It is also provisioned by an Admin invitation.

### invitations

Admin-created, single-use invitation records. The raw token is returned once to the authenticated Admin for delivery through the institution's chosen channel; only its SHA-256 hash is stored. The token has an expiry and `used_at` replay guard. The invitation owns the pre-created user/profile record, which starts as INVITED.

### refresh_tokens

Existing rows are extended with a token family, replacement hash, and revocation timestamp. Only SHA-256 hashes are stored. Rotation revokes the presented token and creates a replacement. Reuse of a revoked token revokes its complete family.

### password_reset_tokens

Single-use, time-limited SHA-256 token records. Password reset changes the password and invalidates outstanding reset and refresh tokens. Email delivery is intentionally an adapter boundary; no raw token is logged or returned by the API.

## Authentication flow

- Login accepts email and password, checks the database account status, and sets HttpOnly access and refresh cookies.
- The JWT subject is the user's internal username/email identity, but every request re-resolves the user from MySQL and derives the role from the database rather than trusting the role claim.
- Refresh rotates a hashed token family. Logout revokes the presented refresh token and clears cookies.
- State-changing requests use Spring Security's cookie-backed CSRF token. Auth bootstrap endpoints that establish cookies are explicitly excluded from CSRF validation; protected state-changing endpoints are not.
- `GET /api/v1/users/me` derives the user from the authenticated principal and never accepts a caller-supplied user ID.

## Authorization foundation

- `ADMIN`, `FACULTY`, and `STUDENT` are the only roles.
- Admin invitation and account lifecycle endpoints are Admin-only.
- Public registration accepts only an invitation token and password.
- Profile responses are role-aware and omit other users' sensitive fields.
- Future modules can use `Authentication` principal identity, `@PreAuthorize`, and service-level ownership/department checks without depending on frontend state.
