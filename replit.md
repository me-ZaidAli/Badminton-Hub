# Club Master

Club Master is a comprehensive web application for racket sports clubs, streamlining operations and enhancing player engagement.

## Run & Operate

_Populate as you build_

## Stack

- **Frontend**: React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build Tools**: Vite (frontend), esbuild (backend)
- **Other**: express-session, passport/passport-local, date-fns, recharts, framer-motion

## Where things live

- `client/`: Frontend source code.
  - `client/src/index.css`: Contains base CSS tokens for "Elite Sports" theme.
  - `client/src/hooks/use-theme.ts`: Manages theme application classes.
- `server/`: Backend source code.
- `drizzle/schema.ts`: Database schema definition.

## Architecture decisions

- **Theming**: Advanced Premium Theme System with 64 themes, optimized for various displays including AMOLED, featuring a global Ultra-Premium Transparent Glass UI. Default palette ("Dribbble Blue-Violet") in `client/src/index.css` `:root`/`.dark`: deep blue-violet background (232 40% 10%), lifted blue-violet glass cards (232 32% 16%), violet accent (252 90% 68%), white foreground; body radial wash on `html.theme-default` matches the reference screenshot (brighter violet/blue from top, deepening at bottom).
- **Matchmaking**: Deterministic Smart Match Engine v6 with multi-mode, gender-aware, 9-tier grade-based scoring, complemented by BPG Competitive Balance Engine and Session Fairness Command Center.
- **Freemium Model**: Backend-enforced and frontend-gated 2-plan (Basic FREE, Premium) freemium structure.
- **Multi-Tenancy**: Supports multi-club and multi-sport management with granular, role-based access control.
- **Club Control Center** (`/admin/control-center`): Single consolidated hub (page: `client/src/pages/admin/ClubControlCenter.tsx`) replacing scattered Club Management / Billing / All Clubs tiles. OWNER sees all clubs (via `/api/super-admin/clubs/billing`), ADMIN/club-admin sees their own admin clubs. Per-club feature toggles persisted in `clubs.featureOverrides` (jsonb) and exposed via `GET/PATCH /api/clubs/:id/feature-overrides` (PATCH = OWNER-only).
- **Localization**: All event date/time inputs and displays are anchored to `Europe/London` (BST/GMT auto-aware).
- **Player Rankings UI** (`client/src/pages/PlayerRankings.tsx`): Dribbble-style rebuild — top 3 rendered as `HeroPlayerCard` (image-bleed gender-aware hero photo from `attached_assets/hero_{male,female}_player.png`, violet glow ring on avatar, overlaid 3-up stat strip Win%/W-L/Pts, win-index gradient progress bar, pill action chips, place chip top-left, kebab top-right). Ranks 4+ render as `CompactPlayerCard` (glassy row with rank pill, avatar, heat bar, W/L + Pts strip). Filter bar uses violet `FilterPill` for scope toggle. All surfaces use `hsl(var(--card)/x)` tokens — no hardcoded slate colors.

## Product

- **Club Management**: Multi-club support, membership management, recurring events, session scheduling, and financial intelligence.
- **Player Engagement**: Dynamic player ranking, match organization, individual player profiles, achievement badges, and AI-powered analytics.
- **Admin Tools**: Comprehensive user, club, venue, and administrator management, audit logs, helpdesk ticketing, and an OWNER-only Club Control Center for feature toggling.
- **Advanced Features**: AI-powered reporting, session schedule generation, 3D avatar selection, league management, tournaments, merchandise system, and a community hub.
- **Monetization**: Freemium model, tiered session fees, credit request system, and club-scoped referral programs.

## User preferences

Preferred communication style: Simple, everyday language.

## Gotchas

- Legacy hardcoded color blocks in some UI components (e.g., `Dashboard.tsx`, `Deals.tsx`, `MerchandisePage.tsx`, `not-found.tsx`) may bypass theme tokens and not harmonize with selected themes. These require refactoring to use CSS variables.
- Merchandise Supplier Order Sheet explicitly avoids selecting or displaying any customer contact details (email, phone) for privacy.

## Pointers

- **TanStack React Query**: [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- **Drizzle ORM**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Tailwind CSS**: [https://tailwindcss.com/](https://tailwindcss.com/)
- **shadcn/ui**: [https://ui.shadcn.com/](https://ui.shadcn.com/)
- **framer-motion**: [https://www.framer.com/motion/](https://www.framer.com/motion/)
- **Vite**: [https://vitejs.dev/](https://vitejs.dev/)
- **esbuild**: [https://esbuild.github.io/](https://esbuild.github.io/)
- **OpenStreetMap Nominatim API**: [https://nominatim.org/release-docs/latest/api/Search/](https://nominatim.org/release-docs/latest/api/Search/)
- **Google Calendar API**: [https://developers.google.com/calendar/api](https://developers.google.com/calendar/api)