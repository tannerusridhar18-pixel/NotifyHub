# NotifyHub Testing Strategy

Status: Phase 0 testing foundation
Date: 2026-09-06

## Backend test layers

### Unit tests

Location: `backend/src/test/java/com/notifyhub/<module>`

Unit tests isolate services and business rules with repository collaborators mocked. They cover validation decisions, lifecycle transitions, ownership, department scope, and error mapping without requiring a running database.

### Spring integration tests

Location: `backend/src/test/java/com/notifyhub/integration`

Use `@SpringBootTest` with MockMvc for controller, validation, serialization, exception, and security-filter tests. These tests verify the HTTP contract and server-side authorization independently from the frontend.

### MySQL integration tests

The production database remains MySQL. Database-backed tests must use a disposable MySQL 8 instance, preferably Testcontainers, rather than H2 or an alternate SQL dialect. Flyway runs on startup and Hibernate remains configured with `ddl-auto=validate`.

MySQL integration coverage will verify:

- Flyway migrations apply cleanly to an empty database.
- Hibernate mappings validate against the migrated schema.
- Foreign keys, unique keys, check constraints, and indexes exist as intended.
- Transaction rollback prevents partial writes.
- Actual create/read/update behavior persists after a new transaction.
- Pagination and targeting queries use MySQL-compatible behavior.

Local smoke checks may use the configured development MySQL instance, but automated tests must isolate their database and data.

### Security tests

Security tests belong under `backend/src/test/java/com/notifyhub/security` and the integration package. They cover:

- Unauthenticated requests.
- Role boundaries for ADMIN, FACULTY, and STUDENT.
- Ownership and department-scope checks.
- Mass-assignment attempts.
- Generic invalid-credential responses.
- Inactive-account behavior.
- Refresh rotation and reuse detection.
- CSRF behavior once cookie authentication is implemented.
- Rate-limit responses.

## Frontend test layer

The canonical working source is `frontend/`. Frontend tests should live beside or beneath `frontend/__tests__` according to the feature under test.

The test foundation will cover:

- API client request/response contract handling.
- Loading, empty, error, success, and session-expired states.
- Role-specific route and navigation rendering.
- Form validation and accessible error association.
- Emergency notification behavior.
- Responsive list/table state transitions.

Browser-level workflow tests will be added after the Phase 1 authentication contract exists. They must exercise the real backend API in a controlled MySQL-backed environment where persistence matters.

## Current baseline

The Maven test dependencies already include Spring Boot Test and Spring Security Test, but there are currently no backend test sources. The frontend currently has no test runner or test sources. Phase 0 records the structure and strategy; feature-specific test tooling and fixtures will be added with the first approved implementation slice so they are tied to real contracts rather than speculative identity models.

Current verification commands:

```powershell
Push-Location backend; mvn test; Pop-Location
Push-Location frontend; npm run lint; npm run build; Pop-Location
```

The frontend production build currently passes. ESLint currently reports existing errors and warnings and must be cleaned before frontend feature work is considered complete.
