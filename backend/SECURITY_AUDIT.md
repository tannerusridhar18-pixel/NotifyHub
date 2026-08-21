# NotifyHub Backend Security Audit / Remediation

This document describes the security controls implemented in the rebuilt backend.

| Severity | Area | Implemented remediation |
|---|---|---|
| Critical | Authentication | Stateless Spring Security with signed JWT access tokens and ADMIN role enforcement |
| Critical | Credential storage | BCrypt password hashing; database never stores plaintext passwords |
| High | Refresh tokens | Cryptographically random refresh tokens; only SHA-256 hashes are persisted; rotation and revocation are implemented |
| High | Authorization | Public routes are explicitly read-only/submission routes; every other API operation requires ADMIN |
| High | Input validation | Jakarta Bean Validation and service-level business validation on write requests |
| High | Injection | JPA repositories/derived queries; no user input is concatenated into SQL |
| High | Sensitive data | Query listing and admin responses are protected; public query endpoint returns no submitted data |
| High | Brute force/abuse | Per-IP in-memory rate limits for API traffic, authentication, and public query submission |
| Medium | CORS | Allowed origin is configurable and restricted to the configured frontend origin |
| Medium | Browser security | CSP, frame denial, and HSTS headers are configured |
| Medium | Error leakage | Global exception handling returns generic safe messages; stack traces are not exposed |
| Medium | Database integrity | Flyway owns schema creation and JPA uses `ddl-auto=validate` |
| Medium | Secrets | DB/JWT/admin secrets are externalized; local secret configuration is ignored by Git |
| Low | Actuator exposure | Only health/info are exposed, and health details are hidden |

## Important operational requirements

- Production must set `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD`, and `FRONTEND_ORIGIN` through the deployment secret manager/environment configuration.
- `JWT_SECRET` must be at least 32 bytes; a unique random secret should be used per environment.
- The bundled in-memory rate limiter is suitable for a single instance. Multi-instance deployments should use a shared gateway/Redis limiter.
- HTTPS should terminate at the deployment platform or reverse proxy.
- Do not commit `application-local.yml`, `.env`, or any file containing real credentials.
