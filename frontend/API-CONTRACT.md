# NotifyHub Frontend API Contract

This file records the current legacy MVP routes used by the canonical `frontend/` working tree. The target conventions and final authentication contract are defined in `docs/NotifyHub_API_Contract_Phase0.md`.

Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`).

Current legacy routes:

- Public: `GET /announcements`, `GET /announcements/urgent`, `GET /events`, `GET /events/upcoming`, `POST /queries`
- Admin/JWT: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- Admin/JWT: `POST/PUT/DELETE /announcements`, `POST/PUT/DELETE /events`, `GET /queries`, `POST /queries/{id}/answer`

Known compatibility gaps intentionally left for Phase 1:

- The legacy backend accepts `{ username, password }`; the target contract uses institutional email/ID and cookie-based credentials.
- The legacy frontend stores bearer tokens in localStorage; the target contract uses HttpOnly cookies and CSRF protection.
- The frontend references `/auth/register`, but the legacy backend does not provide it. Registration remains deferred until the approved identity phase.

The client never treats its own validation as a security boundary; authorization remains on the Spring Boot backend.
