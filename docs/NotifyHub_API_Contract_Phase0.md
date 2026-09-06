# NotifyHub API Contract Baseline

Status: Phase 0 contract decision
Date: 2026-09-06
Base path: `/api/v1`

This document freezes conventions for future implementation. It does not implement the final registration flow or redesign the legacy domain entities.

## Request DTOs

Every operation uses an explicit request DTO. Request DTOs are not entity classes and are not reused as response DTOs.

Rules:

- Bind only fields the caller is allowed to provide.
- Never bind role, account status, owner id, actor id, timestamps, lifecycle status, recipient count, or other computed fields from ordinary client requests.
- Use Bean Validation annotations for field constraints.
- Use service-layer validation for authorization, ownership, cross-field rules, lifecycle transitions, and database-backed constraints.
- Use custom validators for rules such as hosteller fields being required only when hosteller status is true.
- Use separate Admin-only DTOs for Admin operations that may set role or account status.
- Controllers validate and delegate; services apply business rules and transactions.

## Success responses

The current legacy API uses this compatibility envelope:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

This envelope remains the temporary compatibility shape for the legacy MVP. New target endpoints should use explicit response DTOs inside the envelope and should not expose JPA entities directly.

Successful status conventions:

- `200 OK`: successful read, update, state transition, or idempotent command.
- `201 Created`: successful resource creation.
- `204 No Content`: reserved for operations where no response body is useful.

## Error responses

All target API errors use one global error shape:

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

Error rules:

- Never return stack traces, SQL, internal class names, secrets, or raw exception text.
- Validation errors include field-level issues where a field can be identified.
- Use `401 UNAUTHENTICATED` for missing, invalid, or expired authentication.
- Use `401 INVALID_CREDENTIALS` for invalid login credentials with a generic message.
- Use `403 ACCOUNT_INACTIVE` for the explicitly approved inactive-account login case.
- Use `403 FORBIDDEN` where resource existence may be disclosed.
- Use `404 NOT_FOUND` for resource existence-hiding cases.
- Use `409 CONFLICT` for duplicate or invalid concurrent state changes.
- Use `422 EMPTY_TARGET` for a publish target resolving to zero recipients.
- Use `422 CANNOT_MUTE_CATEGORY` for forbidden preference changes.
- Use `429 RATE_LIMITED` for login, registration, reset, and other throttling limits.
- Use `500 INTERNAL_ERROR` for unexpected failures.
- Use `503 SERVICE_UNAVAILABLE` for unavailable persistence or downstream infrastructure.

## Authentication contract

### Final target contract

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "institutional.user@example.edu",
  "password": "client-supplied-password"
}
```

Success:

- HTTP `200`.
- Set short-lived access and rotating refresh credentials in `HttpOnly`, `Secure`, `SameSite` cookies.
- Response data contains the server-resolved role and any required first-login flag:

```json
{
  "role": "STUDENT",
  "mustChangePassword": false
}
```

The role is never accepted from the client and is never used as a client-side authorization authority.

`POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` use the authenticated cookie/session contract. Raw refresh tokens are not returned to JavaScript or accepted from ordinary request bodies in the final design.

### Current legacy mismatch

The current backend expects `{ username, password }`, returns access and refresh tokens in the JSON body, and accepts a raw refresh token in request bodies. The active frontend sends `{ email, password }`, expects `expiresInSeconds`, and stores tokens in localStorage. The backend has no registration endpoint although the frontend calls one.

Required later changes:

1. Change backend login input from username-based to the final email/ID contract.
2. Add the final cookie and CSRF strategy.
3. Change the response DTO to the final role-only authentication response.
4. Remove frontend localStorage token ownership.
5. Add refresh/logout behavior based on cookies.
6. Implement invite-token registration only after Phase 1 approval.
7. Add contract tests covering frontend payloads, backend status codes, and auth error shapes.

These changes are intentionally documented only in Phase 0.

## Pagination

- Feed-style user consumption endpoints use cursor pagination.
- Admin comparison and management tables use numbered pagination.
- Feed page size has a hard maximum of 50.
- Structure and audit endpoints have a hard maximum of 100.
- The server validates cursor, page size, sort, and filter parameters.
- Response DTOs include only the pagination metadata appropriate to the chosen convention.

## Resource status conventions

Lifecycle status is server-controlled. Client requests use dedicated commands such as `/publish`, `/assign`, `/reopen`, or `/archive`; clients do not freely set status fields on ordinary update DTOs.
