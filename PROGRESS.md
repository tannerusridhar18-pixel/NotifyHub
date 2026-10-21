# Progress

## 2026-10-21 - review hardening

- Created `fix/review-hardening` from the current working state, preserving the existing uncommitted changes.
- Restricted announcement and event mutations to the author or a SuperAdmin.
- Set `NH_REFRESH` cookie Path to `/` and clear both the current root-path cookie and the legacy `/api/v1/auth` cookie.
- Added an in-controller admin authorization guard to the global user list endpoint.
- Frontend: `npm test` passed (8 files, 111 tests).
- Backend: `mvn -Dnotifyhub.mail.enabled=false test` passed (189 tests, 0 failures/errors/skips); outbound mail was disabled for the run.
- Email audit was performed read-only; see task summary in the review response.

## 2026-10-21 - invitation workflow CI test

- Created `fix/ci-invitation-test` from the local `main` ref without checking out or modifying `main`.
- The test hardcoded a raw token by directly replacing the persisted invitation hash after resend, while an asynchronous email dispatch was still running. This made the test sensitive to mail timing and did not verify the actual invite token.
- `SecureTokenService` hashes raw tokens with SHA-256 and has no pepper; registration uses the same service. The integration test mocks `JavaMailSender`, so no real email is sent.
- The test now captures the actual token from the mocked resend email, matches it to the persisted hash, and forces mail enabled for this test so suite-level mail flags do not change its behavior.
- Rebased onto latest `origin/main` (merge base `f23a5ba`); branch was 13 commits behind. The latest CI workflow supplies `JWT_SECRET`, but the older branch workflow did not.
- Reproduced the old CI-like failure in a detached worktree: first cause was `IllegalStateException: JWT secret is missing. Configure JWT_SECRET.` in `JwtService`; the 82 ApplicationContext errors were cascades.
- No production change was needed. With the rebased workflow's environment (including test `JWT_SECRET`), no mail variables, MySQL 8, and a clean build, `mvn clean test -B` passed: 189 tests, 0 failures/errors/skips.
