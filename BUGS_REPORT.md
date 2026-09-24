# NotifyHub Manual QA

## QA Re-run Preflight

Stopped before tests. Missing exactly: `QA_BASE_URL`, `QA_API_URL`, `QA_ADMIN_EMAIL`, `QA_ADMIN_PASS`, `QA_USER_PASS`. Frontend/backend probes and all planned tests: NOT RUN. `e2e/node_modules` is ignored and untracked.

Latest headed-auth attempt: stopped before browser launch because `QA_BASE_URL` is unset. No session, credentials, fixtures, or tests were run.

## Summary

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| Unverified | 1 |

## Phase A

No bug result reported for this rerun because preflight failed before tests. Previous unauthenticated Playwright result remains unverified.

## Coverage

| Role | Area | Status |
|---|---|---|
| Student | Login, visibility, events, queries, My Posts | unverified |
| Faculty | Composer, targeting, attachments, My Posts, queries | unverified |
| HOD | Composer, targeting, roster, My Posts | unverified |
| Dean | Composer, targeting, My Posts | unverified |
| Principal | Composer, targeting, My Posts | unverified |
| Dept Admin | Invitations, roster, management, promotion, queries, overview | unverified |
| SuperAdmin | Admin shell, reload, idle refresh | unverified |
| Cross-role | Direct dashboard URLs and forbidden audiences | unverified |

Everything requiring authenticated dev fixtures is unverified. Phase B is pending Phase A credentials and fixture execution.

## Re-run Test Totals

Tests run: 0 / planned: NOT RUN (preflight failed).

## Phase B

Unverified: authenticated role button/link sweep, invitation registration, queries, events, My Posts, rosters, promotion, exports, cross-role URL checks, and SuperAdmin session checks. No credentials or fixture API payloads were available in the workspace context.
