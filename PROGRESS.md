# NotifyHub Progress

- Branch: `feature/qronos-public-redesign`
- Scope: frontend public home/landing page only; no backend, auth, or role-logic changes.
- Qronos redesign: added a lazy client-only Three.js hero vortex with a lightweight parametric hourglass wireframe, ground ripple rings, slow rotation, pointer-events disabled, resize handling, disposal, and reduced-motion support.
- Home layout: retained the existing public shell/navigation and campus content, replaced competing home hero decoration, strengthened the campus-focused hero copy/CTAs, and refined role-based feature cards.
- Styling: added a black Qronos-inspired hero treatment, subtle glass surfaces, responsive vortex sizing, and reduced-motion polish.
- Dependency: added `three@^0.186.0` and updated `package-lock.json`.
- Verification: reviewed the target branch before changes; changes were committed incrementally. GitHub-only validation could not execute the local Next.js build because this environment cannot clone the repository/network-resolve GitHub.
- Backend/auth/role logic: intentionally untouched.


## 2026-09-27 — REKKI public visual pass
- Applied the supplied REKKI-style reference system to the public-facing home, announcements, events, and Ask Campus/query experience.
- Shared visual language: Obsidian/Carbon/Graphite surfaces, single Signal Blue accent, thin inset borders, pill actions, tight display typography, and responsive control-room spacing.
- Preserved the existing Three.js hourglass/vortex hero on the home page and aligned its surrounding UI to the new system.
- Removed duplicated decorative cyclone/orbit markup from announcements, events, and Ask Campus so the shared shell provides a cleaner consistent background treatment.
- No backend, authentication, role, API, or data behavior changes.
- This branch has no separate `frontend/app/query/page.tsx`; `/ask` is the existing campus-query interface and was styled accordingly.
