# NotifyHub Backend

Production-oriented Smart Campus Announcement API built with Spring Boot 3.5.4, Java 21, MySQL, Flyway, Spring Data JPA, Spring Security, and JWT.

Java 21 is the supported project runtime and the Maven compiler release. A newer local JDK may compile this project, but it is not the project's compatibility target; use JDK 21 for repeatable development and CI.

## Features

- Public announcement feed with pagination, urgent-only filtering, and role/department/branch/section targeting for signed-in users
- Urgent-announcement feed
- Public event feed and upcoming-event filtering
- Public campus-query submission
- Admin login with BCrypt password hashing
- Short-lived JWT access tokens
- Rotating, hashed refresh tokens with logout/revocation
- Admin-only announcement/event management, including deletion of draft/archived-or-cancelled items
- Email notifications sent to an announcement's target audience when it is published (role/department/branch/section-aware)
- Admin-only query listing and responses
- Server-side Bean Validation
- CORS allowlist
- Security headers
- Stateless Spring Security
- API rate limiting
- Flyway-managed MySQL schema
- Generic API error responses without stack traces
- Admin-provisioned invitation completion with single-use hashed tokens
- Database-backed current-user identity and role authorization foundation
- HttpOnly cookie sessions with rotating refresh-token families and CSRF protection

## Requirements

- JDK 21+
- Maven 3.9+
- MySQL 8+

## Local database

Create only the database; do not manually create application tables:

```sql
CREATE DATABASE notifyhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Flyway creates the tables from `src/main/resources/db/migration/V1__init.sql`.

## Configuration

The backend reads environment variables and automatically imports an optional `./application-local.yml` for local development. The local file is ignored by Git. If it is absent, environment variables are used.

Copy `application-local.yml.example` to `application-local.yml` and fill in your local credentials. Then simply run `mvn spring-boot:run`.

### Production Deployment & Profile Activation

In production (e.g. Railway, containerized environments), set:
```bash
SPRING_PROFILES_ACTIVE=prod
```
Setting `SPRING_PROFILES_ACTIVE=prod` activates `application-prod.yml` and the `ProductionSafetyCheck` validator, which halts startup if:
- `JWT_SECRET` is unset, shorter than 32 characters, has low entropy, or matches a known template placeholder.
- `AUTH_COOKIE_SECURE` is false (ensures cookies are only sent over HTTPS).
- `FRONTEND_ORIGIN` is unset, points to localhost, or is not an `https://` URI.
- `DB_PASSWORD` is blank.
- `DB_URL` contains `useSSL=false` (forces TLS encryption to MySQL).

### Production Environment Variables

| Variable | Required? | Purpose | Example Format (Non-Secret) |
| :--- | :---: | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | **Yes** | Activates production profile, connection pooling, and startup safety validation | `prod` |
| `PORT` | **Yes** | Port Tomcat binds to (automatically injected by Railway) | `8080` |
| `DB_URL` | **Yes** | JDBC connection string to managed MySQL database (must not disable SSL) | `jdbc:mysql://mysql.railway.internal:3306/railway?sslMode=REQUIRED` |
| `DB_USERNAME` | **Yes** | Database username | `root` |
| `DB_PASSWORD` | **Yes** | Database user password (must be non-empty) | `[managed_database_password]` |
| `JWT_SECRET` | **Yes** | Cryptographic signing key for HMAC-SHA (minimum 32 characters, 256-bit entropy) | `[random_high_entropy_32+_char_secret]` |
| `FRONTEND_ORIGIN` | **Yes** | Exact public HTTPS origin of the frontend on Vercel (no trailing slash) | `https://vnotify.vercel.app` |
| `AUTH_COOKIE_SECURE` | Optional (default: `true`) | Enforces HTTPS-only delivery of session cookies | `true` |
| `AUTH_COOKIE_SAME_SITE` | Optional (default: `None`) | SameSite cookie policy (`None` required for cross-origin Vercel → Railway over HTTPS; `Lax` for same-domain) | `None` |
| `JWT_ACCESS_MINUTES` | Optional (default: `15`) | Lifetime of short-lived JWT access cookie | `15` |
| `JWT_REFRESH_DAYS` | Optional (default: `7`) | Lifetime of rotating refresh token cookie | `7` |
| `ADMIN_USERNAME` | Optional (default: `admin`) | Super Admin username created by `AdminSeeder` | `admin` |
| `ADMIN_EMAIL` | Optional (default: `admin@notifyhub.local`) | Super Admin notification/login email | `admin@institution.edu` |
| `ADMIN_PASSWORD` | Optional | Initial Super Admin password (if unset, admin seeding is safely skipped) | `[strong_initial_admin_password]` |
| `ADMIN_SYNC_PASSWORD` | Optional (default: `false`) | Force-updates admin password in DB to `ADMIN_PASSWORD` on restart | `false` |
| `MAIL_ENABLED` | Optional (default: `false`) | Enables outbound invitation and announcement emails | `true` |
| `MAIL_HOST` | If mail enabled | Outbound SMTP relay hostname | `smtp.gmail.com` |
| `MAIL_PORT` | If mail enabled | Outbound SMTP relay port | `587` |
| `MAIL_USERNAME` | If mail enabled | SMTP relay username/email | `notifications@institution.edu` |
| `MAIL_PASSWORD` | If mail enabled | SMTP relay password (e.g. Gmail App Password) | `[smtp_relay_password]` |
| `MAIL_FROM` | If mail enabled | Outbound sender address displayed to recipients | `notifications@institution.edu` |

Never commit `application-local.yml`, `.env`, or real secrets. The committed configuration has no JWT fallback secret and no default mail/admin/database credentials; every secret must be supplied through environment configuration or the ignored local file.

## Build and run

```powershell
mvn clean package
mvn spring-boot:run
```

Default API base URL:

`http://localhost:8080/api/v1`

## Admin seed

On startup, `AdminSeeder` creates the configured admin if it does not already exist. It does not replace an existing admin password, preventing accidental password resets on every restart.

For production, always set `ADMIN_PASSWORD` and `JWT_SECRET` through the deployment platform's secret/environment configuration.

## API

### Public

- `GET /api/v1/announcements`
- `GET /api/v1/announcements/urgent`
- `GET /api/v1/events`
- `GET /api/v1/events/upcoming`
- `POST /api/v1/queries`

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### Admin

- `POST /api/v1/announcements`
- `PUT /api/v1/announcements/{id}`
- `DELETE /api/v1/announcements/{id}`
- `POST /api/v1/events`
- `PUT /api/v1/events/{id}`
- `DELETE /api/v1/events/{id}`
- `GET /api/v1/queries`
- `POST /api/v1/queries/{id}/answer`

## Security notes

- Access tokens are signed with HMAC-SHA requiring at least 32 bytes (256-bit).
- Refresh tokens are cryptographically random strings; only their SHA-256 hashes are stored in the database.
- Sessions use HttpOnly cookies (`NH_ACCESS`, `NH_REFRESH`). In production, cookies are configured with `Secure` and `SameSite=None` to allow cross-origin API calls between Vercel and Railway over HTTPS.
- CSRF protection is enforced via `CookieCsrfTokenRepository` (`X-XSRF-TOKEN`), with public authentication endpoints (`/login`, `/register`, `/refresh`) exempted.
- CORS is strictly restricted to `FRONTEND_ORIGIN` with credentials allowed, explicit REST verbs, and minimal headers.
- Security headers include Content Security Policy (CSP), frame denial (`X-Frame-Options: DENY`), and HTTP Strict Transport Security (HSTS).
- Database migrations are strictly managed via Flyway (`V1` to `V17`). Raw Flyway JDBC connection string logging is suppressed across all environments.
- API rate limiting is enforced per-instance with distinct tiers for public, auth, and query endpoints.
- Server error responses return generic error structures (`server.error.include-stacktrace: never`); no SQL errors, internal file paths, or stack traces are ever exposed to API clients.

## Deployment Verification (Railway & Vercel)

### Backend (Railway)
1. Set `SPRING_PROFILES_ACTIVE=prod` in Railway Environment Variables.
2. Link the Railway MySQL service or configure `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`. Verify `DB_URL` uses SSL (e.g. `?sslMode=REQUIRED`).
3. Set `JWT_SECRET` to a high-entropy string (≥ 32 chars).
4. Set `FRONTEND_ORIGIN` to the exact Vercel frontend URL (e.g. `https://vnotify.vercel.app`).
5. Verify build logs confirm clean execution and the startup log shows `The following 1 profile is active: "prod"`.
6. **Email Delivery Configuration (Railway)**:
   - Note: Railway blocks outbound SMTP on ports 25, 465, 587, and 2525. Direct Gmail SMTP will fail with connection timeout (`timeout 5000`).
   - For Railway deployments, use an HTTPS API provider (e.g. Resend over port 443):
     - `MAIL_ENABLED=true`
     - `MAIL_PROVIDER=resend`
     - `RESEND_API_KEY=re_...` (obtain a free API key at resend.com: 3,000 free emails/mo)
     - `MAIL_FROM=onboarding@resend.dev` (or your verified domain `noreply@yourdomain.com`)
   - For local or traditional servers with unblocked SMTP, use `MAIL_PROVIDER=smtp` with standard `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`.

### Frontend (Vercel)
1. Set `NOTIFYHUB_BACKEND_ORIGIN` to the public Railway backend URL (e.g. `https://notifyhub-backend.up.railway.app`).
2. Alternatively, set `NEXT_PUBLIC_API_URL` to `https://notifyhub-backend.up.railway.app/api/v1` if calling the backend directly from the client.
3. Verify that requests to `/api/v1/auth/login` succeed and receive `Set-Cookie` with `SameSite=None; Secure; HttpOnly`.
