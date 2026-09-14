# Frontend ↔ Backend Alignment Review (2026-09-13)

## Environment note

Same limitation as the backend review: this sandbox has no network access, so
`npm install` cannot reach the registry (`403 Forbidden` on every package),
which means `npm run lint`, `npm test`, and `npm run build` could not be run
here. Everything below comes from a full manual read of every file under
`app/`, `components/`, `lib/`, and `types/`, cross-checked line-by-line
against the actual backend controllers, DTOs, and enums (`AnnouncementController`,
`EventController`, `QueryController`, `AdminInvitationController`,
`AuthController`, `StructureController`s, the `Role`/`TargetType`/
`AnnouncementStatus`/`EventStatus`/`InvitationStatus`/`InvitationEmailStatus`/
`QueryStatus` enums, and the Flyway-migrated column set).

I also ran a relaxed TypeScript compile pass using a globally-available `tsc`
(without the project's real `node_modules`, since those can't be installed
here). Nearly every error it reported was `Cannot find module 'react'` /
`'next'` — expected noise from missing dependencies, not real bugs. A handful
of `Property 'key' does not exist` errors on mapped components (`app/page.tsx`,
`RoleDashboard.tsx`, `app/events/page.tsx`, etc.) are also **not** real bugs —
this is a well-known TypeScript false positive that only appears when the real
`@types/react` package (with its special JSX `key`/`ref` handling) isn't
installed. Spreading `key` on a custom component inside `.map()` is standard,
correct React and will type-check fine once `npm install` actually runs.

**Please run this locally before deploying, and send me the output if
anything comes back red:**
```
npm install
npm run lint
npm test
npm run build
```

## Fixed in this pass

### Admin event form: Start/End date fields looked broken (added after user report)

Root cause: this entire UI is deliberately dark-themed (`app/globals.css` even
says so: "Dark-mode-first base"). Every input, select, and checkbox is
custom-styled with Tailwind — **except** the two `type="datetime-local"`
inputs on the event form (`Starts` / `Ends`), which are the only native
browser-drawn form controls anywhere in the app. Without a `color-scheme`
declaration, browsers render that native chrome (the calendar icon, the
up/down time steppers, and the picker popup itself) in **light mode by
default** — a barely-visible dark icon sitting in a dark box, and a
stark white calendar/time popup clashing against the surrounding dark UI.
That's what read as "not correctly aligned."

**Fix:**
- `app/globals.css` — added `color-scheme: dark;` to the base `html` rule, so
  all native browser-drawn controls (the datetime picker, and as a bonus the
  up/down spinner arrows on every `type="number"` field in the Structure
  Manager) render in dark mode consistent with the rest of the UI.
- `app/admin/dashboard/DashboardClient.tsx` — also pinned both datetime-local
  inputs to an explicit `h-[46px]` (matching every other input's computed
  height) as a defensive measure, since native date/time widgets can render
  at a very slightly different intrinsic height than a plain text input in
  some browsers, which would otherwise make Starts/Ends look uneven next to
  each other even after the color fix.

I verified this against the code (this is a well-documented, common issue for
dark-themed sites that don't set `color-scheme`) but could not visually
confirm the before/after in this sandbox (no way to render the live app
here). If it still looks off after `npm run dev`, please send a screenshot —
there's a very small chance the real symptom is something more specific I
couldn't infer from source alone.

### Campus query status: frontend used `"PENDING"`, backend only ever returns `"OPEN"`

The backend's `QueryStatus` enum (`query/QueryStatus.java`) has exactly two
values: `OPEN` and `ANSWERED`. The frontend was written against a `"PENDING"`
value that the backend never sends. This wasn't a cosmetic mismatch — it broke
a real admin capability:

- In the admin dashboard's Questions inbox, the reply textarea and "Send
  response" button were gated on `q.status === "PENDING"`. Since the backend
  never returns that value, **this condition was always false — admins had no
  way to reply to a campus query through the UI**, even though the backend
  endpoint (`POST /queries/{id}/answer`) works correctly.
- The "pending" count in the dashboard's stat strip was likewise always 0.
- `adminQueries()`'s optional `status` filter parameter was typed to accept
  `"PENDING"`, which — if ever passed — would fail Spring's enum conversion
  server-side and return an error instead of filtering results.

**Files changed:**
- `types/index.ts` — `CampusQuery.status` narrowed to `"OPEN" | "ANSWERED"`.
- `lib/api.ts` — `adminQueries()`'s `status` parameter narrowed to match.
- `components/ui/classes.ts` — `statusClasses()` now recognizes `"OPEN"` for
  the warning-color badge (kept the existing `"PENDING"` check too, since
  that one is correct and still used for invitation status).
- `app/admin/dashboard/DashboardClient.tsx` — the pending-count calculation
  and the reply-form visibility condition both changed from `"PENDING"` to
  `"OPEN"`.

`InvitationView.status` (`"PENDING" | "USED" | "EXPIRED"`) was **not**
touched — that one is correct as-is; it matches the backend's
`InvitationStatus` enum exactly. Only the campus-query status was wrong.

## Everything else — reviewed and found already well-aligned

This frontend was clearly already built against this exact backend contract
(the `API-CONTRACT.md` file matches the backend's actual routes closely). The
following was checked in full and required no changes:

- **`lib/api.ts`**: every endpoint path, HTTP method, and request/response
  shape checked against the corresponding backend controller — `/auth/*`,
  `/users/me`, `/admin/invitations`, `/announcements*`, `/events*`,
  `/queries*`, `/academic-structure/*`, `/hostels/*` all match exactly,
  including field names in `InvitationRequest` against the backend's
  `ProfileRequest` record.
- **Cookie-based auth + CSRF**: `credentials: "include"` on every request,
  `XSRF-TOKEN` cookie read and sent back as `X-XSRF-TOKEN` on every mutating
  request, single-flight `/auth/refresh` retry on a 401 — all consistent with
  `AuthCookieService`/`JwtFilter`/`SecurityConfig`'s CSRF exemption list.
- **`next.config.ts` / `proxy.ts`**: the `/api/v1/*` rewrite to
  `NOTIFYHUB_BACKEND_ORIGIN` (default `http://localhost:8080`) avoids the
  cross-origin cookie problems that would otherwise show up between
  `localhost:3000` and `localhost:8080`. The route-guard proxy correctly
  checks for the `NH_ACCESS` cookie the backend actually issues.
- **`types/index.ts`** (aside from the one fix above): `TargetType`, `Role`,
  `Announcement.status`, `EventItem.status` all match the backend's enums
  exactly.
- **Admin invitation form** (`DashboardClient.tsx`): every field sent in
  `sendInvite()` maps 1:1 to the backend's `ProfileRequest` fields, with
  correct `Number(...)` coercion for numeric fields and correct
  role-conditional inclusion (student-only fields only sent for `STUDENT`,
  faculty-only fields only sent for `FACULTY`).
- **`app/auth/register/page.tsx`**: reads the `?token=` query param exactly as
  the backend's invitation email link (`notifyhub.mail.invitation-path`)
  constructs it, and sends `{ invitationToken, password, confirmPassword }`
  matching `RegistrationRequest` exactly.
- **`app/ask/page.tsx`**: `submitQuery()` payload (`name`, `email`,
  `department`, `subject`, `message`) matches the backend's `QueryRequest`
  record exactly — `department` is a free-text field on both sides, not a
  structured department ID, which is correct.
- **Structure manager** (`app/admin/structure/page.tsx` + the
  `structure*`/`createStructure*`/`updateStructure*`/`deleteStructure*`
  functions in `lib/api.ts`): all CRUD payloads for departments, branches,
  sections, hostels, blocks, and rooms match the backend's request DTOs,
  including the "deactivate via PATCH with `active: false`" pattern the
  backend actually implements (there's no DELETE endpoint for most of these).

## Self-audit of previous edits in this pass

Re-checked all edits made earlier in this same review (the `OPEN`/`PENDING`
query-status fix) by grepping every touched file again: `types/index.ts`,
`lib/api.ts`, `components/ui/classes.ts`, and
`app/admin/dashboard/DashboardClient.tsx` all consistently use `"OPEN"` for
campus queries now, while `InvitationView.status`/`emailStatus` (a genuinely
different, unrelated `"PENDING"` value for invitations) was correctly left
untouched. Also re-ran the relaxed `tsc` check described above against every
file touched in this pass (including the new `datetime-local`/`globals.css`
changes) — no new errors beyond the same expected "missing `node_modules`"
noise, and `app/globals.css`'s braces remain balanced after the edit.
