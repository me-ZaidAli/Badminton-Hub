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
  - `client/src/index.css`: Base CSS tokens for "Elite Sports" theme.
  - `client/src/hooks/use-theme.ts`: Theme application classes.
- `server/`: Backend source code.
- `drizzle/schema.ts`: Database schema definition.

## Architecture decisions

- **Theming**: 64-theme Premium Theme System with global Ultra-Premium Glass UI. Default "Dribbble Blue-Violet" in `client/src/index.css` `:root`/`.dark` (deep blue-violet bg, violet accent `252 90% 68%`). Body radial wash on `html.theme-default`. Some legacy components (`Dashboard.tsx`, `Deals.tsx`, `MerchandisePage.tsx`, `not-found.tsx`) bypass tokens — pending refactor.
- **Matchmaking**: Smart Match Engine v6 (gender-aware, 9-tier grade scoring) + BPG Competitive Balance + Session Fairness Command Center.
- **Freemium**: 2-plan (Basic FREE / Premium), backend-enforced + frontend-gated.
- **Multi-Tenancy**: Multi-club + multi-sport with role-based access.
- **Club Control Center** (`/admin/control-center`, `client/src/pages/admin/ClubControlCenter.tsx`): Consolidated hub. OWNER sees all clubs (`/api/super-admin/clubs/billing`); ADMIN sees own. Per-club feature toggles in `clubs.featureOverrides` jsonb (`GET/PATCH /api/clubs/:id/feature-overrides`, PATCH = OWNER-only).
- **Localization**: All event date/time anchored to `Europe/London`.
- **Player Rankings UI** (`client/src/pages/PlayerRankings.tsx`): Top-3 = `HeroPlayerCard` (gender-aware hero photo, violet glow), ranks 4+ = `CompactPlayerCard`. All surfaces use `hsl(var(--card)/x)` tokens.

### Birmingham Super League (BSL)
Esports-style competition module at `/bsl`. Locked palette: bg `222 50% 6%`, cyan `195 100% 60%`, gold `42 95% 55%` — no other hues.
- **Public routes**: `/bsl` (LeagueMode hub), `/bsl/register-club` (7-step wizard), `/bsl/join` (invite-code), `/bsl/wallet`, `/bsl/match/:id`, `/bsl/profile` (player), `/bsl/my-club` (manager).
- **Admin Control Panel** (`/bsl/admin/*`, OWNER/ADMIN, sidebar "BSL · Control Panel"): Dashboard, league (divisions/fixtures/days), match-day (drag-drop courts), clubs (Mark paid/unpaid via `PATCH /api/bsl/admin/clubs/:id/payment-status` — `PENDING_PAYMENT` hides club from public list), players (assign/stats/wallet/discipline), payments (Pending/History + CSV), media, settings. Audit via `audit()` helper → `bsl_audit_log`.
- **Backend**: `server/bsl-routes.ts`. Schema in `shared/schema.ts` (5 enums + 10 tables: bslLeagues/Clubs/Teams/Players/LeagueDays/Fixtures/Rubbers/WalletTransactions/AuditLog/Media).
- **Club-vs-Club Fixtures + Drag-Drop Pair Assignment**: `bsl_fixtures` has nullable `home_club_id`/`away_club_id` (legacy `home_team_id`/`away_team_id` also nullable). `bsl_rubbers` has nullable `home_team_id`/`away_team_id` per rubber. `POST /api/bsl/admin/club-fixtures` creates fixture + 6 rubbers (default `[MD,MD,WD,WD,XD,XD]`). `PATCH /api/bsl/admin/rubbers/:id/assign` validates club + category match; mirrors pair players into `home/awayPlayer1/2Id` for scoring. Setup UI: `client/src/pages/bsl/admin/FixtureSetup.tsx` (3-column board with HTML5 DnD + select fallback). Audit: `CREATE_CLUB_FIXTURE`, `ASSIGN_RUBBER`.
- **Club Manager Dashboard** (`/bsl/my-club`, `client/src/pages/bsl/ClubManager.tsx`): 6-tile strip (Roster/Pairs/Wins/Win%/Matches/Money in) + Members table (P/W/L/£paid/Edit/Remove). Manager actions via `loadClubForManager()` helper: edit club, withdraw (`bslClubs.withdrawnAt` + admin-only `POST /api/bsl/clubs/:id/reinstate`), confirm join requests, remove players, manage pairs (`bsl_team_members` join table, max 2 per pair, auto-removes from sibling pairs in same category). `PATCH /api/bsl/clubs/:clubId/players/:playerId` edits displayName/bio (audit `MANAGER_UPDATE_PLAYER`). Pair dropdowns dedup placed players via `placedByCat` Set. Top Performers on `/bsl` filters out `matchesPlayed=0` and renders hydrated `displayName`.
- **Player Profile Dashboard** (`/bsl/profile`, `client/src/pages/bsl/PlayerProfile.tsx`): Single round-trip `GET /api/bsl/players/me/dashboard`. Per-fixture home/away perspective derived from actual rubber slot (prevents WIN/LOSS inversion when membership stale). Hero with W/L/Win% strip, per-category pair cards, next-match countdown, last-20 history. Edit displayName/bio via `PATCH /api/bsl/players/me`. Register/unregister categories via `POST/DELETE /api/bsl/players/me/categories` — atomic conditional UPDATE with SQL `CASE` for tier pricing: 1st cat full, 2nd 50% off, 3rd 70% off, keyed off `array_length(categories,1)` so concurrent registrations can't both claim cheaper tier. Charged amount derived from balance delta, recorded as DEBIT `bsl_wallet_transactions`. Per-cat fees in `bslLeagues.categoryFees` jsonb (defaults `{MD:2500,WD:2500,XD:3000}` pence). Toast strips `"402: "` prefix from apiRequest errors.
- **NOTE**: `npm run db:push` may hang on interactive prompts for new tables — use `psql "$DATABASE_URL"` with `ALTER TABLE … ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` instead.

### Universal Notification Engine
Admin-editable templates + on/off toggle for every event-driven push.
- **Phase 1 — Core**: Table `notification_rules` (ruleKey UNIQUE, enabled, category, title, message, settings jsonb). Single source: `RULE_REGISTRY` in `server/notificationRules.ts` (~35 keys grouped: Account/Membership/Payments/Sessions/Rewards/League BSL/Tournaments/Communication/Profile). `ensureRuleSeeds()` upserts only `category` so admin edits survive. Helper `sendRulePush(ruleKey, userIds, vars, opts)` (aka `notifyEvent`) — 30s in-memory cache, short-circuits if disabled, renders `{var}` placeholders. Wired in: `server/auth.ts`, `server/routes.ts`, `server/pushScheduler.ts`, `server/bsl-routes.ts`. Admin UI `/admin/notification-rules` (`client/src/pages/admin/NotificationRules.tsx`) — collapsible category sections, per-rule Switch + Title/Message editors + dynamic placeholder chips.
- **Phase 2 — Smart Targeting**: Weekly cron `runProfileIncompleteReminder` in `server/notificationCrons.ts` scans missing `users.phone` / `playerProfiles.gender`, fires `profileIncomplete` rule deduped via `push_send_log`.
- **Phase 3 — User Preferences**: Per-user category × channel matrix in `user_notification_prefs.categoryPrefs` JSONB. Filter `getOptedInUserIdsByCategory(userIds, category, legacyKey, channel)` in `server/oneSignal.ts` honors matrix + legacy boolean back-compat. UI `/settings/notifications` (`client/src/pages/NotificationSettings.tsx`) — grid with optimistic toggles + "All" master per row.
- **Phase 4 — Scheduled Broadcasts**: Table `notification_schedules`. Cron `runScheduledNotifications` sweeps every 60s, atomically claims `pending → sending`. Endpoints `GET/POST/DELETE /api/admin/notification-schedules` (ALL segment OWNER-only). `/admin/push-broadcast` has datetime-local "Schedule for later" + upcoming list with cancel. Per-rule **Test send to me** (`POST /api/admin/notification-rules/:key/test`) + live Preview card.
- **Phase 5 — Analytics + Email**: Table `notification_send_metrics` appended per-channel inside `sendRulePush`. `GET /api/admin/notification-rules/:key/stats?days=30` aggregates per channel, surfaced in collapsible Stats panel (Push/In-app/Email tiles). Email via `server/emailSender.ts` (Resend REST, secret `RESEND_API_KEY`, `EMAIL_FROM` env). `sendEmailToUsers()` batches max 50/email. `sendRulePush` opt-in via `opts.email: true`.

### Push Notifications (OneSignal)
Web Push via OneSignal v16 SDK (script in `client/index.html`, worker `client/public/OneSignalSDKWorker.js`). Init/external-id/player-id via `client/src/components/OneSignalBootstrap.tsx` + `client/src/lib/oneSignal.ts`. Backend `server/oneSignal.ts` (REST `Key` auth on `https://api.onesignal.com/notifications`, `include_aliases.external_id`). Routes `server/notificationRoutes.ts`: `POST /api/notifications/register`, `GET/PATCH /api/notifications/preferences`, OWNER/ADMIN `POST /api/admin/notifications/send` (segments USER/CLUB/TEAM/TOURNAMENT/ALL — ALL OWNER-only). Hourly cron `runPostSessionUnpaidReminder` in `server/pushScheduler.ts`. Tables: `user_push_subscriptions`, `user_notification_prefs`, `push_send_log`. Secrets: `VITE_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`.

## Product

- **Club Management**: Multi-club, memberships, recurring events, sessions, financial intelligence.
- **Player Engagement**: Rankings, match organization, profiles, badges, AI analytics.
- **Admin Tools**: User/club/venue/admin management, audit logs, helpdesk, OWNER-only Control Center.
- **Advanced**: AI reporting, schedule generation, 3D avatars, league, tournaments, merchandise, community hub.
- **Monetization**: Freemium, tiered fees, credit requests, club-scoped referrals.

## User preferences

Preferred communication style: Simple, everyday language.

- **Training Challenges for All Users** (`/training-challenges`, `client/src/pages/TrainingChallenges.tsx`): Reuses exported `ExerciseChallengePanel` from `client/src/pages/Juniors.tsx`, passes current user as synthetic single-element `juniors` array so completions write against `juniorChallengeCompletions.userId = user.id`. Read-only GETs (`/api/junior-exercises`, `/api/junior-weekly-challenges`, `/api/junior-skill-points/:userId`, `/api/junior-exercise-videos`) opened by removing `requirePremium`; POST/PATCH/DELETE remain premium. **IDOR-safe**: `GET/POST /api/junior-challenge-completions*` and `GET /api/junior-skill-points/:userId` enforce self / parent-of-child (via `users.parentUserId`) / OWNER-ADMIN only. Panel accepts `isSelfView` prop to flip "your child" → "you/your" copy. Sidebar entry "Training Challenges" in Activity group.

- **User-Editable Low-Balance Alert + Premium Membership Payment Method**: Users set wallet alert via `/profile` → Credit Wallet & History modal. Backend `PATCH /api/my-wallets/:walletId/threshold` (wallet-owner-only) writes `wallets.lowBalanceThreshold` — same column the admin UI uses, so views stay in sync. Admin "Mark Paid" on `/admin/membership-board` opens payment-method dialog: **External bank transfer** (just `paymentConfirmed=true`) OR **Member's wallet credit** (atomic deduction from `credit_ledger` + mirrored DEBIT into `wallets.balance`/`wallet_transactions` inside `db.transaction` with `SELECT ... FOR UPDATE` lock — same lockstep as god-mode `set-balance`). Price: `clubMemberships.proratedPrice ?? membershipPlans.annualPrice`. Insufficient credit returns 400 with details. Wallet option auto-disables when price=0. `PATCH /api/club-memberships/:id/payment` accepts optional `paymentMethod: "external" | "wallet"`. Bulk `mark_paid` external-only.

- **Session Financial Snapshot** (`client/src/components/financial/SessionFinancialSnapshot.tsx`): Per-session "View Snapshot" button next to delete on each session card in `/admin/financials` opens mobile-first dialog: header (title, club, venue, coach, date), summary tiles, attendees with color-coded payment-status badges, expenses (informational only), and **Coach Earnings = total collected, NOT collected − expenses** (coach pays expenses upfront). Screenshot mode toggle + PNG export (html2canvas) + multi-page PDF export (jsPDF, slices canvas at A4 page height) + Web Share API with download fallback. Backed by `GET /api/sessions/:id` (returns session + venue + creator, gated via `canPerform("VIEW_CLUB", session.clubId)` — never returns creator email).

- **Admin Wallet Unified View + Manual Amend** (`/super-admin/wallet-management`, `client/src/pages/super-admin/WalletManagement.tsx`): "Log" button opens modal mirroring user view (UNION of `credit_ledger` + `player_reward_ledger`, same as `/api/my-credits*`). Three cards: User sees / Wallet table balance / Drift (with amber warning if non-zero). Per-club balance chips, history (200 rows), "Set exact balance" form → `POST /api/god-mode/wallets/:walletId/set-balance` `{clubId, targetBalance (pence), reason?}`. Endpoint computes `delta = target − currentLedgerSum` and atomically writes corrective row to BOTH `credit_ledger` AND `wallets.balance`/`wallet_transactions`. Read: `GET /api/god-mode/wallets/:walletId/unified-view`. Both OWNER/ADMIN-only with `[AUDIT]` log lines.

## Sidebar layout

- `client/src/components/layout/Sidebar.tsx` `collapseToHubs()` collapses `activity`, `club+design`, `comms+info` into single hub links pointing at `/hub/*`. Pinned passthrough hrefs (`pinnedActivityHrefs = ["/sessions"]`) stay visible at the top of their hub group in the sidebar AND continue to render as tiles inside the hub page (`Hub.tsx` still iterates the original `activity` group).
- Admin sidebar (`useNavGroups`) intentionally short: **Admin Panel**, **Financials**, **Admin Inbox** only. Club Control, Push Broadcast, Auto Reminders are surfaced as tiles inside `/admin` via `adminToolsSections` / `clubSettingsSections` in `client/src/pages/admin/AdminDashboard.tsx`. The `adminInbox` badge piggy-backs on the **Admin Inbox** entry.

- **Team Members on Sessions** (`/admin/clubs` → Members tab; Sessions create/edit; Timeline + Calendar views on `/sessions`): `playerProfiles.teamRoles text[]` stores per-club role tags. Canonical values: `COACH`, `ORGANISER`, `COORDINATOR`, or `CUSTOM:<Display Name>` (label 1-56 chars). Edit via `TeamRolesEditor` in `client/src/pages/admin/ClubManagement.tsx` (Popover with Checkbox list + custom input chip; PATCH `/api/clubs/:id/members/:profileId` `{teamRoles}`, server-validated against the canonical set). Sessions get three optional user-id columns (`coachUserId`, `organiserUserId`, `coordinatorUserId` → `users.id`) editable in CreateSessionDialog + EditSessionDialog via `MemberSelector` (`client/src/components/session/MemberSelector.tsx` — `Command` + `Popover`, fetches `/api/clubs/:id/members`, sorts members tagged with the preferred role to top). `GET /api/clubs/:clubId/members` is sanitized to least-privilege fields (id, userId, clubId, clubRole, membershipStatus, grade, gender, eloRating, rankingPoints, teamRoles, joinedAt, plus `user: {id, fullName, email, phone, avatarUrl, role}`) — never password / reset tokens. Server `PATCH /api/sessions/:id` validates each user is an APPROVED member of the **effective** target club (uses incoming `clubId` if reassigning) via `storage.getPlayerProfile`. `storage.getSessions` + `getSession` hydrate `coachUser`, `organiserUser`, `coordinatorUser` (`{id, fullName}`) via single batched `users` lookup (no N+1). Session badges rendered by `SessionTeamBadges` (`client/src/components/session/SessionTeamBadges.tsx`) inside `TimelineSessionCard` (`client/src/components/SessionViews.tsx`) — Coordinator (gold/Crown) > Organiser (blue/ShieldCheck) > Coach (violet/GraduationCap) — order is fixed in props so coordinator visually outranks organiser. Schema picks new columns up automatically via `createInsertSchema` so `POST /api/sessions` accepts them with no server change.

- **Sessions page views**: `/sessions` (`client/src/pages/Sessions.tsx`) only exposes **Timeline** + **Calendar** view modes. The legacy "Cards" and "Grouped" views were removed for both regular and juniors scopes. `viewMode` localStorage key `sessionsViewMode` is migration-safe (falls back to `timeline` if it finds an old `cards`/`grouped` value). All session metadata that previously lived in the Cards view (team badges, banners, allowed grades, etc.) is rendered in the Timeline card via `TimelineSessionCard`.

## Gotchas

- Express JSON body limit is path-aware in `server/index.ts`: default 256kb, with `/api/bsl/clubs*` opted into 8mb for base64 image fallback. Extend `jsonLargeRoutes` to raise per-route — never globally.
- Merchandise Supplier Order Sheet excludes customer contact details (email, phone) for privacy.

## Pointers

- **TanStack React Query**: https://tanstack.com/query/latest
- **Drizzle ORM**: https://orm.drizzle.team/
- **Tailwind CSS**: https://tailwindcss.com/
- **shadcn/ui**: https://ui.shadcn.com/
- **framer-motion**: https://www.framer.com/motion/
- **Vite**: https://vitejs.dev/
- **esbuild**: https://esbuild.github.io/
- **OpenStreetMap Nominatim**: https://nominatim.org/release-docs/latest/api/Search/
- **Google Calendar API**: https://developers.google.com/calendar/api
