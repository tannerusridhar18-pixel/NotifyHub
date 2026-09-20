# NotifyHub Frontend API Contract

## Base URL

The browser-facing API base is `/api/v1` by default. In local and production deployments, Next.js rewrites this path to `NOTIFYHUB_BACKEND_ORIGIN`.

Authentication uses HttpOnly cookies; the frontend does not store access or refresh tokens in localStorage.

## Public feed

- `GET /announcements`
- `GET /announcements/urgent`
- `GET /events`
- `GET /events/upcoming`
- `POST /queries` — public campus query submission.

## Authentication

- `POST /auth/login`
- `POST /auth/register` — completes an admin-issued invitation.
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /users/me`

## Announcements

- `GET /announcements/management`
- `POST /announcements`
- `PUT /announcements/{id}`
- `POST /announcements/{id}/publish`
- `POST /announcements/{id}/unpublish`
- `POST /announcements/{id}/archive`
- `DELETE /announcements/{id}`

## Events

- `GET /events/management`
- `POST /events`
- `PUT /events/{id}`
- `POST /events/{id}/publish`
- `POST /events/{id}/unpublish`
- `POST /events/{id}/cancel`
- `DELETE /events/{id}`

## Queries

- `POST /queries`
- `GET /queries`
- `POST /queries/{id}/answer`
- `PATCH /queries/{id}/answer`
- `DELETE /queries/{id}`
- Role-specific query inbox/list endpoints are also used by the dashboards.

## Invitations

- `POST /admin/invitations`
- `GET /admin/invitations`

Invitation delivery status is backend-owned. The frontend only displays the invitation result/status returned by the API; it does not assume that successful persistence means email delivery succeeded.

## Structure and administration

- Academic structure endpoints under `/academic-structure/**`
- Hostel endpoints under `/hostels/**`
- User management under `/admin/users/**`
- Role management under `/admin/roles` and `/roles/**`

The frontend treats the backend as the authority for validation, authorization, persistence, and security.
