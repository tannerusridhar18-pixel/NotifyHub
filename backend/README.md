# NotifyHub Backend

Production-oriented Smart Campus Announcement API built with Spring Boot 3.5.4, Java 21, MySQL, Flyway, Spring Data JPA, Spring Security, and JWT.

## Features

- Public announcement feed with pagination, search, category and department filtering
- Urgent-announcement feed
- Public event feed and upcoming-event filtering
- Public campus-query submission
- Admin login with BCrypt password hashing
- Short-lived JWT access tokens
- Rotating, hashed refresh tokens with logout/revocation
- Admin-only announcement/event management
- Admin-only query listing and responses
- Server-side Bean Validation
- CORS allowlist
- Security headers
- Stateless Spring Security
- API rate limiting
- Flyway-managed MySQL schema
- Generic API error responses without stack traces

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

For deployment, configure the following variables in the hosting provider instead:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_ACCESS_MINUTES`
- `JWT_REFRESH_DAYS`
- `FRONTEND_ORIGIN`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Never commit `application-local.yml`, `.env`, or real secrets.

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

- Access tokens are signed with an HMAC key requiring at least 32 bytes.
- Refresh tokens are random and only their SHA-256 hashes are stored.
- Public query responses do not expose submitted query data; query listing is admin-only.
- Write operations are protected by the Spring Security admin role.
- CSRF is disabled because the API is stateless and uses bearer tokens rather than browser cookies for authentication.
- CORS is restricted to `FRONTEND_ORIGIN`.
- Security headers include CSP, frame denial, and HSTS for HTTPS requests.
- The included rate limiter is per-instance. For multiple production instances, use a shared gateway/Redis limiter.

## Deployment

Set all secrets in the hosting provider's environment-variable/secret manager. Do not commit production credentials or `application-local.yml`.
