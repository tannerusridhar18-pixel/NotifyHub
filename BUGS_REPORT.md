# NotifyHub Manual QA

## Summary

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| Unverified | 1 |

## Phase A

No reproducible bugs recorded. Role credentials were not available in the workspace context; the Playwright audience/visibility matrix is unverified until `NOTIFYHUB_QA_USERS_JSON` is supplied. No application source was changed.

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
