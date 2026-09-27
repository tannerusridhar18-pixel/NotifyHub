# NotifyHub Progress

- Branch: `feature/role-fixes`
- Step 0: done; baseline recorded and existing work preserved.
- Task 1: done; shared My Posts route, edit/delete UI, server ownership/scope checks, and 403 evidence added.
- Task 2: done; server target restrictions, 204 own-delete contract, frontend Principal/Dean selectors, and role-flow evidence added.
- Task 3: done; Dept Admin student invites/bulk CSV, scoped student management, overview counts, HOD rosters, existing composer/event surfaces, and scope evidence completed.
- Task 4: done; admin fallback restricted, invitation listings scoped, deactivated-token checks added, mass-assignment covered, CSV safeguards added, and Student/Faculty admin access denied.

## 2026-09-27 — Home design system shared across app
- Extracted the existing home-page visual tokens into `frontend/styles/design-tokens.css` (palette, typography, radii, elevation, shadows, transitions).
- Wired the tokens into Tailwind v4 and shared UI primitives.
- Restyled shared buttons, cards/inputs, badges, loading/empty/error states, public content cards, modals/toasts, authentication screens, and dashboard chrome to consume the home visual system.
- Kept page logic, routing, data/API calls, permissions, and behavior unchanged.
