# NotifyHub Frontend

A production-oriented Next.js frontend for the NotifyHub Smart Campus Announcement Platform.

## Stack

- Next.js 16.3
- React 19.2
- TypeScript
- Tailwind CSS v4 (utility-first design system, see `app/globals.css` and `components/ui/`)
- Real Spring Boot REST API; no mocked data

Next.js 16 is an Active LTS release, and React 19.2 is the current React major documented by React. See the official release/support pages for current security updates.

## Authentication

The frontend now provides separate Student/Faculty registration and login screens. The admin screen accepts the backend-configured admin email and password; no admin credentials are hardcoded in the frontend.

## Backend contract

Default API:

`http://localhost:8080/api/v1`

The UI is wired to these backend endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /announcements`
- `GET /announcements/urgent`
- `POST /announcements`
- `PUT /announcements/{id}`
- `DELETE /announcements/{id}`
- `GET /events`
- `GET /events/upcoming`
- `POST /events`
- `PUT /events/{id}`
- `DELETE /events/{id}`
- `POST /queries`
- `GET /queries`
- `POST /queries/{id}/answer`

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_URL` if your backend is not on port 8080.
3. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The backend CORS configuration should allow `http://localhost:3000`.

## Security notes

- No backend secrets are included in this project.
- Access/refresh tokens are kept in browser local storage for this standalone frontend. For a higher-assurance production deployment, prefer an HttpOnly Secure SameSite refresh cookie and a short-lived access token.
- Client-side validation is convenience only; the Spring Boot backend remains authoritative.
- Admin routes are protected by the backend JWT and role checks.
