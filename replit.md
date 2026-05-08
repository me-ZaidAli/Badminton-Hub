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
- **Birmingham Super League (BSL)**: Esports-style competition module at `/bsl`. Locked palette derived from BSL poster (deep navy bg `222 50% 6%`, electric cyan `195 100% 60%`, gold/amber `42 95% 55%`) — no other hues allowed. Public routes: `/bsl` (LeagueMode hub), `/bsl/register-club` (7-step wizard), `/bsl/join` (invite-code flow), `/bsl/wallet`, `/bsl/match/:id`. Admin Control Panel at `/bsl/admin/*` (OWNER/ADMIN, sidebar entry "BSL · Control Panel") with shared `AdminLayout` shell (sticky topbar + animated left nav with framer-motion `layoutId` active bar + pending badge): `/bsl/admin` (Dashboard — 8 stat cards, alert feed, audit log w/ 10s refresh), `/bsl/admin/league` (divisions CRUD, fixture generator, league days), `/bsl/admin/match-day` (drag-drop court grid + rubber status), `/bsl/admin/clubs` (table + flag/suspend/notes editor + invite-code copy), `/bsl/admin/players` (assignment / stats correction / wallet adjust / discipline), `/bsl/admin/payments` (Pending/History tabs + CSV export), `/bsl/admin/media` (upload + tag + MVP/Featured pin), `/bsl/admin/settings` (rules, bank, branding, notifications). Legacy routes `/bsl/admin/verify` and `/bsl/admin/fixtures` alias to the new Payments/Match Day pages. Backend in `server/bsl-routes.ts` with `audit()` helper persisting to `bsl_audit_log`; admin endpoints under `/api/bsl/admin/{dashboard,clubs,players,league-days,transactions,audit,media,pending,payments/export.csv}`. Schema at `shared/schema.ts` (5 enums + 10 tables: bslLeagues/Clubs/Teams/Players/LeagueDays/Fixtures/Rubbers/WalletTransactions/AuditLog/Media; bslLeagues extended with pointsWin/Draw/Loss, matchFormat, courtCount, notificationsEnabled, brandingPrimary/Accent; bslClubs has isFlagged/isSuspended/adminNotes/categories (text[] of MD/WD/XD); bslTeams has category (one team per selected category); bslPlayers has warnings/isSuspended/matchBanCount/disciplineNotes). Payment flow is bank-transfer + uploaded proof to `/uploads/bsl/`, admin-approved. League singleton (`bslLeagues` id=1) seeded with default bank details, £500 club fee, £25 player fee. Components in `client/src/pages/bsl/components/` and admin pages in `client/src/pages/bsl/admin/`. All motion via framer-motion. NOTE: `npm run db:push` may hang on interactive create-vs-rename prompts for new tables — use `psql "$DATABASE_URL"` with `ALTER TABLE … ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` instead.
- **Auto Reminder Rules**: Admin-editable templates + on/off toggle for each automatic push reminder. Table `notification_rules` (id, ruleKey UNIQUE, enabled, title, message, settings jsonb, updatedAt) seeded with `paymentReceived`, `waitlistPromoted`, `newSessionMatchingLevel`, `postSessionUnpaidReminder`. Helper `server/notificationRules.ts` exports `sendRulePush(ruleKey, userIds, vars, opts)` which fetches the rule (30s in-memory cache), short-circuits when `enabled=false`, renders `{var}` placeholders into title/message, then calls `sendPushToUsers`. All four trigger sites (`server/routes.ts` payment-PAID, waitlist-promote, session-create level match; `server/pushScheduler.ts` hourly unpaid cron) now use `sendRulePush` instead of inline strings. Admin endpoints OWNER/ADMIN-only: `GET /api/admin/notification-rules`, `PATCH /api/admin/notification-rules/:key` (cache invalidated on PATCH). UI at `/admin/notification-rules` (`client/src/pages/admin/NotificationRules.tsx`) — one card per rule with Switch (auto-saves on toggle), Title/Message editors, placeholder reference chips, Save button. Sidebar entry "Auto Reminders" sits next to "Push Broadcast" in the admin group.
- **Push Notifications (OneSignal)**: Web Push via OneSignal v16 SDK (script in `client/index.html`, worker at `client/public/OneSignalSDKWorker.js`). Init + external-id login + player-id registration handled by `client/src/components/OneSignalBootstrap.tsx` (mounted in `App.tsx`) using helpers in `client/src/lib/oneSignal.ts`. Backend: `server/oneSignal.ts` (REST helper, `Key` auth on `https://api.onesignal.com/notifications`, `include_aliases.external_id`); `server/notificationRoutes.ts` (POST `/api/notifications/register`, GET/PATCH `/api/notifications/preferences`, OWNER/ADMIN POST `/api/admin/notifications/send` with segments USER/CLUB/TEAM/TOURNAMENT/ALL — ALL is OWNER-only; preference `adminAnnouncement` filters broadcast recipients). Trigger hooks in `server/routes.ts`: payment-override PAID → `paymentReceived`, promote-waiting → `waitlistPromoted`, session create → `newSessionMatchingLevel` for club members whose `playerProfiles.grade` falls within `skillLevelMin/Max` (uses `GRADE_ORDER`). Hourly cron `runPostSessionUnpaidReminder` in `server/pushScheduler.ts` (wired in `server/index.ts`) fires `postSessionUnpaidReminder` once per signup (deduped via `push_send_log`) for finished sessions in the last 7 days where `paymentStatus=UNPAID`. Tables (created via `psql ALTER`, mirrored in `shared/schema.ts`): `user_push_subscriptions`, `user_notification_prefs`, `push_send_log`. Routes: `/settings/notifications` (user prefs + enable push), `/admin/push-broadcast` (admin compose + segment send). Sidebar: "Push Settings" in comms group, "Push Broadcast" in admin group. Secrets: `VITE_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`.
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

- Express JSON body limit is path-aware in `server/index.ts`: default 256kb for the API surface, with `/api/bsl/clubs*` opted into an 8mb cap so the BSL club registration flow can accept the base64 image fallback when the file-upload endpoint is unavailable. Raise the cap on additional routes by extending `jsonLargeRoutes`, never globally.
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