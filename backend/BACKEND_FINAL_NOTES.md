# NotifyHub Backend Final Notes

This package is the cleaned backend package intended to be used before the frontend work.

## Fixes included from the development session

- Fixed `JwtFilter` / `JwtService` API mismatch by providing a safe `parse(String)` method.
- `JwtService` fails fast at startup if `JWT_SECRET` is missing or shorter than 32 bytes; there is intentionally no fallback secret, so a missing variable is caught immediately instead of silently signing tokens with a weak or default key.
- MySQL refresh-token schema uses `VARCHAR(64)` consistently with the JPA entity.
- Local secrets can be kept in ignored `application-local.yml`; `application.yml` automatically imports it when present.
- Database password is not stored in `application.yml`.
- Admin password is not stored in the committed configuration; admin seeding is skipped when no password is configured.
- Improved authentication/authorization responses.
- Improved malformed-request and parameter error handling.
- Improved rate-limit response and old-window cleanup.
- Kept Flyway as the only schema owner.

## Local setup

1. Create the `notifyhub` MySQL database only.
2. Copy `application-local.yml.example` to `application-local.yml`.
3. Fill in the local MySQL password, JWT secret, and admin password.
4. Run `mvn clean package`.
5. Run `mvn spring-boot:run`.
6. Verify the backend starts on port 8080 before pushing.

Do not commit `application-local.yml`.
