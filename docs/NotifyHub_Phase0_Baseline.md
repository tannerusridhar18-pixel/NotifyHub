# NotifyHub Phase 0 Baseline

Status: Approved baseline for implementation restart
Date: 2026-09-06

## Source documents

The authoritative product and backend requirements are:

- `NotifyHub_Product_UX_Spec_Part1.md`
- `NotifyHub_Backend_API_Spec_Part2.md`

The documents were reread in full before this baseline was prepared. Older references to PostgreSQL or Neon are obsolete. NotifyHub uses MySQL only.

## Frozen architecture

- Backend: Java 21, Spring Boot 3.5.x, modular monolith.
- Persistence: MySQL only, Spring Data JPA/Hibernate, Flyway migrations.
- Frontend: Next.js App Router with TypeScript and React.
- Integration: REST under `/api/v1/`.
- Modules: explicit package-per-bounded-context; controllers remain thin, services own rules and transactions, repositories own persistence access.
- Delivery baseline: MySQL-backed in-app notifications; no PostgreSQL, Neon, microservice split, broker, or Redis is introduced in Phase 0.

Java 21 is the compatibility target because it is already specified by the project documentation and Maven configuration. The local machine currently runs JDK 25.0.4, which can compile the current project, but JDK 21 should be used in CI and supported development environments. `backend/pom.xml` now declares both `java.version` and `maven.compiler.release` as 21.

## Frontend source decision

`HEAD` tracks `notifyhub-frontend`. The current worktree reports that directory as deleted and contains an untracked `frontend` directory. There is no rename commit or additional frontend history; the repository has one relevant commit. A file-by-file comparison found that the two trees have identical source files and manifests, except for the generated `next-env.d.ts` file. The file-name sets also match.

Decision: `frontend` is the canonical working source for this restart because it is the existing active tree used by the current build and contains the same application source. The deleted `notifyhub-frontend` path is preserved as-is. No move, delete, overwrite, or restoration was performed. The path should be staged/renamed deliberately in a later repository-maintenance change after review, not implicitly during feature work.

## Security configuration decision

- `backend/src/main/resources/application-local.yml` remains ignored and is the local-only source for development credentials.
- `backend/application-local.yml.example` contains placeholders only.
- The committed `application.yml` no longer contains a JWT fallback secret.
- `JWT_SECRET`, database credentials, and admin credentials must come from environment configuration or the ignored local file.
- Existing local credentials are not treated as production credentials and must not be committed.

## Current implementation boundary

Phase 0 does not implement:

- Student or Faculty identity/profile entities.
- New roles or authorization rules.
- New announcement, event, or query entities.
- New migrations for the target domain model.
- Registration, targeting, notifications, attachments, audit, or analytics.

The legacy MVP remains intact for the next approved phase.
