# Club Master

Comprehensive web app for racket-sports clubs (operations + player engagement).

> **Detailed module history lives in `docs/replit-history.md`.** This file is a navigation index — open the archive when you need the long-form rationale.

## Stack

- **Frontend**: React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite (frontend), esbuild (backend)
- **Other**: express-session, passport-local, date-fns, recharts, framer-motion

## Where things live

- `client/` — Frontend (`client/src/index.css` = base CSS tokens; `client/src/hooks/use-theme.ts` = theme classes)
- `server/` — Backend
- `shared/schema.ts` — Drizzle schema (single source of truth)
- `docs/replit-history.md` — Full module-by-module history

## Architecture decisions

- **Theming**: 64-theme Premium system + global Ultra-Premium Glass UI. Default "Dribbble Blue-Violet" (violet accent `252 90% 68%`). Legacy bypass: `Dashboard.tsx`, `Deals.tsx`, `MerchandisePage.tsx`, `not-found.tsx`.
- **Matchmaking**: Simple Match Engine (May 2026) in `server/matchEngine.ts`. ONE algorithm — no modes, no AI brain layer. For each match: (1) filter by gender category, (2) sort by gamesPlayed asc + take top `candidatePoolSize` hungriest, (3) enumerate C(N,4) groups + score (groupRepeat × prior count, partnerRepeat × pairs, opponentRepeat × pairs, gradeSpread × rank gap), (4) pick lowest score, split 1st+4th vs 2nd+3rd by grade. Five knobs in `shared/matchEngineSettings.ts` (`groupRepeatPenalty=10`, `partnerRepeatPenalty=3`, `opponentRepeatPenalty=1`, `gradeSpreadWeight=0.5`, `candidatePoolSize=8`) + 3 presets (casual/balanced/competitive). `server/adaptiveFairnessAI.ts` is now a thin compatibility shim (`applyAIBrainLayer` forwards to `generateSmartMatches`). The `sessions.matchmakingMode` DB column is retained but ignored.
- **Freemium**: 2-plan (Basic FREE / Premium), backend-enforced + frontend-gated.
- **Multi-Tenancy**: Multi-club + multi-sport, role-based.
- **Localization**: Event date/time anchored to `Europe/London`.
- **Multi-role users**: `users.role` (primary, drives badge) + `users.secondaryRoles text[]` (additive). `PATCH /api/admin/users/:id/role` (OWNER-only) accepts both. Coach grant flow upgrades PLAYER→COACH or appends to secondaryRoles preserving OWNER/ADMIN/ORGANISER.

## Module index

Each entry: route + key files. Open `docs/replit-history.md` for full implementation prose.

### Birmingham Super League (BSL) — `/bsl`
Esports-style competition module. Locked palette: bg `222 50% 6%`, cyan `195 100% 60%`, gold `42 95% 55%`. Backend: `server/bsl-routes.ts`. Schema: 5 enums + ~14 `bsl_*` tables in `shared/schema.ts`. **Wallet enum** = `TOPUP | DEDUCTION` (NEVER `DEBIT`).

- **Public**: `/bsl` (LeagueMode), `/bsl/register-club`, `/bsl/join`, `/bsl/wallet`, `/bsl/match/:id`, `/bsl/profile`, `/bsl/my-club`, `/bsl/prizes`, `/bsl/results` (archive: leaderboard from `/api/bsl/standings` + match days grouped from `/api/bsl/fixtures` + public `GET /api/bsl/league-days` read-only).
- **Quick Results entry** (`/bsl/admin/quick-results`): bulk-edit form — picks a fixture, lists all rubbers with home/away score inputs, single "Save all" PATCHes `/api/bsl/rubbers/:id` for every changed row.
- **Admin** (`/bsl/admin/*`, OWNER/ADMIN, sidebar "BSL · Control Panel"): dashboard, league control, match-day live + match-days hub, clubs, players, payments, media, settings, prizes, competition rules. Audit via `audit()` → `bsl_audit_log`.
- **Share invite**: `client/src/pages/bsl/components/ShareInviteDialog.tsx` (Copy QR PNG via `ClipboardItem`, Save PNG, Web Share). `PrivateRoute` bounces logged-out users to `/login?next=…` (`safeNext()` allows internal `/`-prefix only).
- **Club-vs-Club fixtures + DnD pair assignment**: `bsl_fixtures.home/away_club_id`. `POST /api/bsl/admin/club-fixtures`, `PATCH /api/bsl/admin/rubbers/:id/assign`. UI `bsl/admin/FixtureSetup.tsx`. All endpoints lifecycle-guarded via `assertFixtureMutable`.
- **Category Competition Settings + snapshot-on-generate** (`/bsl/admin/competition`): tables `bsl_category_settings`, `bsl_fixture_versions`. Lifecycle cols on `bsl_league_days.state` (DRAFT|PUBLISHED|LIVE|CLOSED), `bsl_fixtures.category/version/rulesSnapshot/walkoverWinner/liveStartedAt/livePausedAt`, `bsl_rubbers.setScores/walkoverWinner`. Endpoints: `GET/PUT/DELETE /api/bsl/admin/category-settings[/:cat]`, `POST /api/bsl/admin/fixtures/regenerate` (archives SCHEDULED/WARMUP only, version+1, LIVE/FINISHED preserved), `PATCH .../league-days/:id/state`, `POST .../fixtures/:id/live`, `POST .../rubbers/:id/walkover`. Standings read pointsWin/Draw/Loss from snapshot first.
- **Wallet top-up — category packages + multi-select discounts** (`/bsl/wallet`): `bsl_leagues.topup_packages jsonb` + `topup_discount_pcts jsonb` (default `[0,50,70]` = 1st full, 2nd 50% off, 3rd 70% off). Engine `shared/topupPricing.ts` (`computeTopup`). Server (`POST /api/bsl/wallet/topup`) **always recomputes** — never trusts client total.
- **Club lifecycle — Sleep / Wipe** (OWNER-only): `bsl_clubs.sleeping_at`. `PATCH /api/bsl/admin/clubs/:id/sleep`, `DELETE .../wipe {confirmName}` (txn: fixtures+rubbers cascade, club row deleted, players SET NULL, wallet history preserved). Confirm phrase MUST equal exact club name.
- **Super-admin club/player controls** (~bsl-routes.ts:806-1060): create clubs/players outside public wizard, force-activate, atomic wallet adjust, categories override (no fee), `GET /api/bsl/admin/clubs/:id/manager-view`.
- **Club Manager Dashboard** (`/bsl/my-club`): 6-tile strip + Members table. `loadClubForManager()`. Pairs in `bsl_team_members` (max 2, auto-removes from sibling).
- **Player Profile** (`/bsl/profile`): single round-trip `GET /api/bsl/players/me/dashboard`. Per-fixture home/away derived from rubber slot. Categories register/unregister: atomic conditional UPDATE with SQL `CASE` for tier pricing keyed off `array_length(categories,1)`.
- **Year-End Prize Vault** (`/bsl/prizes` + `/bsl/admin/prizes`): tier cards (DIAMOND/PLATINUM/GOLD/SILVER/BRONZE/MYTHIC/EPIC). Table `bsl_prizes`. `POST /api/bsl/admin/prizes/seed {replace?}`.
- **Match Days hub** (`/bsl/admin/match-days`): `MatchDayEditor` modal + `GET /api/bsl/admin/league-days/:id/details`. Cols `bsl_league_days.venue/notes` (240/2000 caps). `PATCH /api/bsl/fixtures/:id` extended for `homeClubId/awayClubId/bslLeagueDayId`.
- **Multi-division clubs** — `bsl_clubs.additionalDivisions text[]`. Each club counts once per division it participates in (primary ∪ additional). `POST/PATCH /api/bsl/admin/clubs` accept `additionalDivisions`.
- **Pay-per-division joining** — `bsl_leagues.division_join_fee_pence` (default 2500). `POST /api/bsl/clubs/:id/join-division {division}` atomic txn with `SELECT … FOR UPDATE` on `bsl_players`, deducts fee, appends to `additionalDivisions`. Pair-create `POST /api/bsl/clubs/:id/teams` accepts `{category, division?}`. **Sibling-pair scope is per (division, category)** at `~bsl-routes.ts:2582`.
- **Permissions, Grading & Captains** — `bsl_leagues.player_grades jsonb` catalogue + `divisionGrades jsonb` (per-div allowed-codes). `bsl_players.grade text`. `bsl_clubs.adminUserIds int[]`. `bsl_teams.captainPlayerId`. Endpoints: `POST /api/bsl/admin/divisions/rename`, `PATCH /api/bsl/players/:id/grade`, `POST /api/bsl/admin/players/:id/transfer` (locked when matchesPlayed>0), `PATCH /api/bsl/clubs/:id/admins`, `PATCH /api/bsl/admin/clubs/:id/owner` (OWNER-only), `PATCH /api/bsl/teams/:id/captain`.
- **Admin user search** — `/api/bsl/admin/users/search` uses SQL `ILIKE` (`fullName | email`) ordered by `fullName ASC LIMIT 50`.

### Persistent file storage (Object Storage)
All uploads → Replit Object Storage via `server/uploadStorage.ts` (`saveBufferToBucket() → /files/<key>`). Multer = `memoryStorage` everywhere. `registerFileServeRoute(app)` adds `GET /files/*` (Express-5 regex). Legacy `/uploads/...` static fallback still mounted (vanishes on autoscale deploy). Validators accept both prefixes. Bucket id = `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.

### Universal Notification Engine
Source of truth: `RULE_REGISTRY` in `server/notificationRules.ts` (~35 keys, 9 categories). Helper `sendRulePush(ruleKey, userIds, vars, opts)` — 30s cache, short-circuits if disabled, renders `{var}`. Tables: `notification_rules`, `notification_schedules`, `notification_send_metrics`, `user_notification_prefs` (categoryPrefs + `muted_rule_keys`), `push_send_log`. Admin UI `/admin/notification-rules`. User UI `/settings/notifications`. Per-rule mute via `POST /api/notifications/mute-rule`. Crons: weekly profile-incomplete (deduped), 60s scheduled-broadcast sweep, hourly post-session-unpaid. Email via `server/emailSender.ts` (Resend, `RESEND_API_KEY`, `EMAIL_FROM`).

### Push Notifications (OneSignal)
v16 SDK in `client/index.html` + `client/public/OneSignalSDKWorker.js`. Init `client/src/components/OneSignalBootstrap.tsx` + `client/src/lib/oneSignal.ts`. Backend `server/oneSignal.ts` (REST `Key` auth, `include_aliases.external_id`). Routes `server/notificationRoutes.ts`: register, preferences, `POST /api/admin/notifications/send` (segments USER/CLUB/TEAM/TOURNAMENT/ALL — ALL OWNER-only). Secrets: `VITE_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`.

### Find a Coach v2 (Booksy-style booking)
Tables: `coach_availability_rules`, `coach_availability_overrides`, `coach_booking_settings` (UNIQUE coachId + `price_tiers jsonb`), `coach_gallery_images`. `lesson_request_status` includes `NO_SHOW`. Backend `server/coachBookingRoutes.ts`. Public bulk: `GET /api/coaches/availability-month?month=YYYY-MM` (year clamped 2000-2100; `overrides.note` stripped). Coach extras on `coaches`: `services_description`, `video_links text[]`, `website_links text[]`, `preferred_venue_ids int[]`, `preferred_areas text[]`. `PATCH /api/coaches/me` allowlist sanitises (https only, ≤12 entries). `GET /api/venues/all` = single venue picker source. Lesson packages: `coach_booking_settings.price_tiers jsonb` (max 24, server-clamped). `GET /api/coach-bookings/payout-info` returns `{platformFeePct:3, payoutSlaHours:48, clubBanks[]}`. Bank details OWNER-only via `PATCH /api/clubs/:id` allowlist. Notification rules (Coaching): `coachRoleGranted`, `coachLessonRequested|Approved|Rejected|Completed|NoShow|Reminder`. Frontend: `/coaching` (`Coaching.tsx`) consolidates Find/Lessons/Training Profile/Coach Dashboard behind one sidebar entry (URL `?tab=`). `CoachDetailDialog` Player Feedback fully anonymised (`Player A/B/…`). Map: Leaflet OSM; with `VITE_MAPBOX_TOKEN` → Mapbox dark + clustering.

### Super-Admin Club Finance Calculator
OWNER-only at `/super-admin/club-finance-calculator` (tile in `/super-admin/god-mode`). Singleton `club_finance_calculator_settings` id=1, all money in pence. Inputs incl. `shuttlecock_tube_price_pence` × `shuttlecock_tubes_per_session` (legacy `shuttlecocks_cost_per_session_pence` kept unused). `GET/PUT /api/super-admin/club-finance-calculator` in `server/routes.ts` (~line 719) OWNER-gated, `intField` clamps (memberPct 0-100 / sess/wk 0-14 / wks/yr 0-53 / tubes 0-200). Tabs: Calculator / Player Benefits / Old vs New. Persists `Math.round(£×100)`.

### Other modules

- **My Training Profile** (`/my-training-profile`): Novos.gg-style esports skill dashboard + admin/coach "View as player" picker (`isAdminish` → `/api/admin/player-analytics/enrollments`).
- **Dashboard hero** (`client/src/components/dashboard/DashboardHero.tsx`): 13-tile uniform 3-per-row hero — greeting+clock, weather (Open-Meteo), counters, week strip, up-next, training challenges, live courts, today's deal (OpenAI Responses + web_search → `/api/daily-content/deals`), pro tip, hydration, daily quote, daily poll, next event. AI content cached daily in `server/dailyContent.ts`.
- **Dashboard banner + Custom Polls** (`DashboardBanner.tsx` + `CustomPollTile.tsx`): 8-bg cycler. Tables `custom_polls` (audience `ALL|SELECTED`, `targetClubIds`, `target_user_ids`, `send_as_message`) + `custom_poll_responses`. Endpoints in `server/customPolls.ts`. Re-broadcast `POST /api/admin/custom-polls/:id/send-message` writes to `notifications` (linkUrl `/?poll=<id>&t=<ts>` — fresh row per send).
- **Premium tile** (`.premium-tile` in `client/src/index.css`): theme-token-aware glassy gradient default for every shadcn `<Card>`. Opt-out: `<Card className="premium-tile-flat">`.
- **Sidebar layout** (`client/src/components/layout/Sidebar.tsx`): `collapseToHubs()` collapses activity/club+design/comms+info into hubs. Pinned passthroughs (`pinnedActivityHrefs = ["/sessions"]`). Admin sidebar intentionally short (OWNER: Admin Panel / Financials / Admin Inbox / God Mode). **Coach Control, Finance Calculator, BSL Control Panel** = tiles in `/super-admin/god-mode`. **Club Polls / Push Broadcast / Auto Reminders** = tiles in `/admin`.
- **Team Members on Sessions — multi-assignment**: `playerProfiles.teamRoles text[]`. Sessions: `coachUserIds`/`organiserUserIds`/`coordinatorUserIds`/`supportCoachUserIds` (all `int[]`). Legacy single-id cols mirrored to first array element. `MemberSelector` multi-select chip. `getSessions/getSession` hydrate via batched `users` lookup.
- **Sessions page views** (`/sessions`): only **Timeline** + **Calendar**. localStorage `sessionsViewMode` migration-safe.
- **Training Challenges for All Users** (`/training-challenges`): reuses `ExerciseChallengePanel` from `Juniors.tsx`. Read GETs opened (POST/PATCH/DELETE remain premium). IDOR-safe (self / parent-of-child via `users.parentUserId` / OWNER-ADMIN).
- **Club Control Center** (`/admin/control-center`): OWNER sees all clubs (`/api/super-admin/clubs/billing`); ADMIN sees own. Per-club feature toggles in `clubs.featureOverrides jsonb` (`GET/PATCH /api/clubs/:id/feature-overrides`, PATCH OWNER-only).
- **Player Rankings UI** (`PlayerRankings.tsx`): Top-3 = `HeroPlayerCard`, ranks 4+ = `CompactPlayerCard`. All surfaces use `hsl(var(--card)/x)` tokens.
- **User-editable low-balance alert + Premium membership payment**: `PATCH /api/my-wallets/:walletId/threshold` (wallet-owner-only). Admin Mark Paid: External bank OR Member's wallet credit (atomic `credit_ledger` deduction + mirrored DEBIT into `wallets.balance`/`wallet_transactions` inside txn with `SELECT … FOR UPDATE`).
- **Session Financial Snapshot** (`SessionFinancialSnapshot.tsx`): `/admin/financials` per-session "View Snapshot". **Coach Earnings = full session fee** (not collected, not minus expenses). PNG via html2canvas, multi-page PDF via jsPDF.
- **Admin Wallet Unified View + Manual Amend** (`/super-admin/wallet-management`): UNION `credit_ledger` + `player_reward_ledger`. "Set exact balance" → `POST /api/god-mode/wallets/:walletId/set-balance` computes delta + atomic corrective row to BOTH ledger AND `wallets`/`wallet_transactions`. OWNER/ADMIN-only.

## Product

- **Club Management**: Multi-club, memberships, recurring events, sessions, financial intelligence.
- **Player Engagement**: Rankings, match organization, profiles, badges, AI analytics.
- **Admin Tools**: User/club/venue/admin management, audit logs, helpdesk, OWNER-only Control Center.
- **Advanced**: AI reporting, schedule generation, 3D avatars, league, tournaments, merchandise, community hub.
- **Monetization**: Freemium, tiered fees, credit requests, club-scoped referrals.

## User preferences

Preferred communication style: Simple, everyday language.

## Gotchas

- Express JSON body limit is path-aware in `server/index.ts`: default 256kb, `/api/bsl/clubs*` opts into 8mb. Extend `jsonLargeRoutes` to raise per-route — never globally.
- BSL wallet enum `bslWalletTxTypeEnum` = `TOPUP | DEDUCTION` (NEVER `DEBIT`).
- `npm run db:push` may hang on new tables — use `psql "$DATABASE_URL"` with `IF NOT EXISTS` DDL instead.
- All client date keys use a local-time `fmtDate()` (NOT `toISOString().slice(0,10)`) to avoid UTC drift around midnight/DST.
- Merchandise Supplier Order Sheet excludes customer contact details (email, phone) for privacy.
- Object Storage URLs: validators accept both `/uploads/` and `/files/` prefixes.

## Pointers

- TanStack React Query: https://tanstack.com/query/latest
- Drizzle ORM: https://orm.drizzle.team/
- Tailwind CSS: https://tailwindcss.com/
- shadcn/ui: https://ui.shadcn.com/
- framer-motion: https://www.framer.com/motion/
- Vite: https://vitejs.dev/
- esbuild: https://esbuild.github.io/
- OpenStreetMap Nominatim: https://nominatim.org/release-docs/latest/api/Search/
- Google Calendar API: https://developers.google.com/calendar/api
