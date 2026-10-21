# Progress

## 2026-10-21 - review hardening

- Created `fix/review-hardening` from the current working state, preserving the existing uncommitted changes.
- Restricted announcement and event mutations to the author or a SuperAdmin.
- Set `NH_REFRESH` cookie Path to `/` and clear both the current root-path cookie and the legacy `/api/v1/auth` cookie.
- Added an in-controller admin authorization guard to the global user list endpoint.
- Frontend: `npm test` passed (8 files, 111 tests).
- Backend: `mvn -Dnotifyhub.mail.enabled=false test` passed (189 tests, 0 failures/errors/skips); outbound mail was disabled for the run.
- Email audit was performed read-only; see task summary in the review response.
