# NotifyHub Frontend API Contract

This frontend is wired to the Spring Boot backend currently used by NotifyHub.

Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`).

Public:
- GET `/announcements`
- GET `/announcements/urgent`
- GET `/events`
- GET `/events/upcoming`
- POST `/queries`

Admin/JWT:
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- POST/PUT/DELETE `/announcements`
- POST/PUT/DELETE `/events`
- GET `/queries`
- POST `/queries/{id}/answer`

The client never treats its own validation as a security boundary; authorization remains on the Spring Boot backend.
