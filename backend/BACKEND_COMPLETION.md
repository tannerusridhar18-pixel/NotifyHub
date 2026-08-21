# Backend Completion

The NotifyHub backend is implemented as a Spring Boot 3.5.4 / Java 21 / MySQL application.

## Verified design

- MySQL-only persistence with Flyway migration
- JWT authentication with role claims
- Refresh-token rotation and hashed token storage
- BCrypt password hashing
- Admin-only write/query-management operations
- Public read-only announcements/events and public query submission
- Bean Validation on request DTOs
- CORS allowlist and security headers
- Stateless Spring Security
- API rate limiting
- Generic error handling without stack traces
- Secrets externalized through environment variables/local ignored configuration

Before production deployment, run the final integration/security test suite against the deployed database and configure production secrets, HTTPS, and a distributed rate limiter.
