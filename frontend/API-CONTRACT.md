# NotifyHub Frontend API Contract

Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`). Authentication uses HttpOnly cookies; the frontend never stores access or refresh tokens in localStorage.

## Public feed
- `GET /announcements` — published global announcements for unauthenticated visitors; authenticated users receive their targeted visible feed.
- `GET /announcements/urgent` — published urgent announcements.
- `GET /events` — published global events for unauthenticated visitors; authenticated users receive their targeted visible feed.
- `GET /events/upcoming` — published future events.
- `POST /queries` — public campus query submission.

## Authentication
- `POST /auth/login`
- `POST /auth/register` — completes an admin-issued invitation; the token is supplied in the emailed registration link.
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /users/me` — authenticated current identity.

## Admin
- `GET /announcements/management`
- `POST /announcements`
- `PUT /announcements/{id}`
- `POST /announcements/{id}/publish`
- `POST /announcements/{id}/unpublish`
- `POST /announcements/{id}/archive`
- `GET /events/management`
- `POST /events`
- `PUT /events/{id}`
- `POST /events/{id}/publish`
- `POST /events/{id}/unpublish`
- `POST /events/{id}/cancel`
- `GET /queries` and `POST /queries/{id}/answer`
- Academic/hostel structure management endpoints under `/academic-structure/**` and `/hostels/**`.
- User status/role management under `/admin/users/**`.

The frontend treats the backend as the authority for validation, authorization, persistence, and security.

- `POST /admin/invitations` — admin-only; creates a Student/Faculty account and sends the invitation email through configured SMTP.
