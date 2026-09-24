# NotifyHub Manual QA

## Summary

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| Unverified | 1 |

## Phase A

No reproducible bugs recorded. Playwright completed headless Chromium execution with `PASS=0 FAIL=0 UNVERIFIED=12`; role credentials were not available, so the audience/visibility matrix remains unverified. No application source was changed.

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

## Phase B

Unverified: authenticated role button/link sweep, invitation registration, queries, events, My Posts, rosters, promotion, exports, cross-role URL checks, and SuperAdmin session checks. No credentials or fixture API payloads were available in the workspace context.
