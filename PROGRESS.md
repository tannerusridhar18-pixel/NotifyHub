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


## 2026-09-27 — REKKI tokenized public styling
- Added `frontend/styles/design-tokens.css` with the supplied REKKI color, typography, spacing, radius, surface, and inset-elevation tokens, exposed through Tailwind v4 `@theme`.
- Imported the token sheet from `frontend/app/globals.css` and scoped the visual treatment to Home, Announcements, Events, and Ask Campus.
- Applied Obsidian/Carbon/Graphite/Iron/Steel surfaces, Signal Blue as the only chromatic accent, pill actions, 16px card elevation, 8px inputs, Inter typography, tight tracking, and reduced-motion-safe transitions.
- Neutralized legacy multi-color public utility classes only inside the selected public-page scopes; admin/dashboard pages are not targeted.
- Restyled the shared public shell only when one of the selected pages is active, without changing routes, API calls, or component behavior.
- No data, authentication, backend, or role logic changes.


## 2026-09-27 — Qronos vortex density and flow refinement
- Scoped to `frontend/components/ui/HeroVortex.tsx` only for the visual implementation.
- Increased funnel radial/vertical subdivisions and streamline sampling to remove faceted/angular appearance.
- Added continuous shader-driven surface flow toward the neck while retaining only subtle overall rotation.
- Increased ground contour density with tighter center spacing and shader-based outward opacity fade.
- Preserved existing colors, layout, pointer-events behavior, 60fps requestAnimationFrame loop, scroll response, and prefers-reduced-motion handling.
- No backend, data, auth, role, route, or content changes.
