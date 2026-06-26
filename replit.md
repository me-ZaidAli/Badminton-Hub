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
Esports-style competition module. Backend `server/bsl-routes.ts`; schema = 5 enums + ~14 `bsl_*` tables in `shared/schema.ts`. **Full module guide lives in `docs/bsl.md`** — covers public/admin routes, lifecycle, fixtures, wallet, payments, prizes, multi-division, grading & captains. Two hard rules to remember here: (1) **Wallet enum** = `TOPUP | DEDUCTION` (NEVER `DEBIT`); (2) locked palette = bg `222 50% 6%`, cyan `195 100% 60%`, gold `42 95% 55%`.

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

### Tournaments — per-category capacity enforcement (May 2026)
`tournamentCategories.maxTeams` (nullable int) is now ENFORCED on all three category-join paths in `server/tournamentRoutes.ts`: `POST /api/tournament-categories/:id/join-solo` (inside the existing tx, after the advisory lock — counts every team row in the category and 409s with "category full"), `POST /api/tournaments/:id/pair-requests` (early reject unless inviter or invitee already has a slot here — accepting would collapse not add), and `PATCH /api/tournament-pair-requests/:id` ACCEPT inside the materialise tx (recount + subtract solo rows being collapsed; `projectedTeams = currentTeams - solosBeingCollapsed + 1`). Admin `POST /api/tournament-categories/:id/teams` deliberately uncapped (admin override). `GET /api/tournaments/:id/my-categories` returns `totalTeams`, `maxTeams`, `slotsLeft`, `isFull` per entry — MyCategoriesTab renders a red "FULL · X/Y" pill (+ "Category full — registration closed" panel replacing join buttons) when full, an amber "N slots left" pill at ≤3, and a neutral capacity pill otherwise. Server is source of truth — frontend hint only.

### Tournaments — multi-category discount (May 2026)
First category a player joins = full snapshotted fee. Every additional category (per tournament) is auto-discounted **50%** at join time. Implemented in `server/tournamentRoutes.ts` via `countExistingCategoryEntries(profileId, tournamentId, excludeCategoryId, tx)` + `applyMultiCategoryDiscount(feePence, existingCount)`, called from BOTH `/api/tournament-categories/:id/join-solo` and the pair-accept materialisation block inside `PATCH /api/tournament-pair-requests/:id`. Discount is snapshotted onto `tournament_teams.player1/player2EntryFeePence` so later leaves/joins do NOT retroactively re-price. Leaving a category does NOT refund a previously full-priced category (deliberately simple — admin can manually amend if needed).

### Tournaments — tournament-wide pairs display (June 2026)
Pairs formed without a specific category (pair-requests with `categoryId IS NULL`, both registrations PAIR/partnerId) have no per-category `tournament_teams` row, so they were invisible in PairsTab (which renders confirmed pairs from `teams-by-category`). Fix: PairsTab now derives these from `GET /api/tournaments/:id/pairs` (returns `categoryId` per pair, NULL = tournament-wide), maps them into the same pair-card shape (`player1/player2/profile1/profile2/createdAt/isPaired`), and appends a synthetic "Tournament-wide" category row (`id:-1`, `playersPerSide:2`, `format:"Pairs"`, `genderRestriction:"ALL"`) to `allTeamRows` so they render in the same card UI as per-category pairs. The old admin amber "Legacy tournament-wide pairs" dissolve panel was REMOVED along with its `useAdminDissolvePair` hook and `POST /api/tournaments/:id/admin-dissolve-pair` endpoint — we now just display whatever pairs exist rather than forcing admins to delete them. User-driven `POST /api/tournaments/:id/unpair` (self-unpair) is unchanged. AdminTab Create Pair candidate list still includes EVERY approved player — the server's per-category unique index (409) is the source of truth for who's already paired in a given category.

### Tournaments — multi-category partner flow (May 2026)
A player registers ONCE for a tournament (one-click, no partner picker on SignUpTab), then joins individual categories with a different partner per category via the **My Categories** tab. `POST /api/tournaments/:id/register` is now strictly tournament-level — partner/category body fields are ignored and always written as `INDIVIDUAL`/NULL. Schema: `tournament_pair_requests.category_id` (NULL = legacy tournament-wide pair). DB uniqueness on `tournament_teams` enforced via four partial unique indexes declared in `shared/schema.ts` (cross-column guards prevent a player from being player1 in one paired team AND player2 in another paired team in the same category): `unique_player1_per_cat (category_id, player1_id)`, `unique_player2_per_cat (category_id, player2_id) WHERE player2_id IS NOT NULL`, and the LEAST/GREATEST pair `tournament_teams_unique_{min,max}_player_per_cat (category_id, LEAST|GREATEST(player1_id, player2_id)) WHERE player2_id IS NOT NULL` (also pre-applied via psql for live DBs). Endpoints (`server/tournamentRoutes.ts`): `POST /api/tournaments/:id/pair-requests` accepts optional `categoryId`; `PATCH /api/tournament-pair-requests/:id` ACCEPT runs status update + sibling-dissolution + team materialisation inside ONE `db.transaction` that starts with `SELECT … FOR UPDATE` on the pair-request row and re-checks PENDING; unique-index violation on the team insert is re-thrown as 409 ("Already paired in this category"). New: `POST /api/tournament-categories/:id/join-solo` (singles or "looking for partner" placeholder), `POST /api/tournament-categories/:id/leave` (lifecycle-guarded — 409 if any matches exist for the category; otherwise txn-wraps team delete + group-pair cleanup + pair-request dissolution), `GET /api/tournaments/:id/my-categories` (per-category status + pending requests + `occupantUserIds` for partner-picker eligibility filtering). `DELETE /api/tournament-categories/:id` blocks (409) when teams or matches exist; the `?force=true` override is **OWNER-only** (tournament admins get 403). Server also enforces `tournamentCategories.genderRestriction` (modern `ALL`/`FEMALE_ONLY` + legacy `MALE_ONLY`/`FEMALE`/`MALE`) on `POST /api/tournament-categories/:id/join-solo`, `POST /api/tournaments/:id/pair-requests` (both players), and `PATCH /api/tournament-pair-requests/:id` accept (re-check at materialise time). Helper `genderAllowedForCategory()` in `server/tournamentRoutes.ts`. DDL (`tournament_pair_requests.category_id` + 4 unique indexes on `tournament_teams`) applied to live DB via psql; declared in `shared/schema.ts` for fresh provisioning. `GET /api/tournaments/:id/teams-by-category` returns category-grouped confirmed/solo teams sourced from `tournament_teams` for the admin **PairsTab** "Teams by Category" panel (hook `useTournamentTeamsByCategory`). UI: `MyCategoriesTab` partner picker filters out (a) self, (b) any `occupantUserIds`, (c) profiles whose gender doesn't match `genderRestriction` (handles both `FEMALE_ONLY`/`MALE_ONLY` and legacy `FEMALE`/`MALE`). Hooks `useMyTournamentCategories`, `useJoinCategorySolo`, `useLeaveCategory` in `client/src/hooks/use-tournaments.ts`. Legacy single-category registration flow preserved for back-compat — only triggered when pair-request has NULL categoryId.

### Sessions — Tournament Mode (pre-planning, June 2026)
Optional per-session mode (`sessions.tournamentMode`, organiser-only toggle on `SessionDetail.tsx`). Pre-plan pairs, court groups, and matches BEFORE play, then release them into the existing live flow — **Normal mode untouched**. `matchStatusEnum` += `PLANNED`; pre-planned matches are real `matches` rows (`status='PLANNED'` + `matches.groupId` + `matches.plannedOrder`). Two new tables: `session_groups` (one per court: name/courtNumber/displayOrder) + `session_group_entries` (a single or a pair; `groupId` NULL = unassigned tray). **Hard rule: PLANNED must never appear in any Normal-mode query** — `storage.getSessionMatches` excludes it via `ne(status,'PLANNED')`; the planner reads PLANNED only through `GET /api/sessions/:id/tournament-plan`. Backend in `server/routes.ts` (all organiser-guarded via `requireSessionManager`, every group/entry/match mutation re-checks the child belongs to `:id` session): toggle mode; planner state; groups create/rename/court/reorder/delete; entries create/move/delete; `POST …/groups/:groupId/auto-generate-matches` (round-robin C(n,2), clears group first); manual add/remove/reorder planned match; `POST …/start-tournament` flips PLANNED→QUEUED ordered by (group displayOrder, plannedOrder) keeping courtNumber. **Roster changes clear the affected group's planned matches** (add/move/delete entry → `deletePlannedMatchesForGroup`) to avoid stale plans. Results feed the EXISTING session leaderboard (COMPLETED-only) with zero leaderboard changes. Frontend: hooks in `client/src/hooks/use-matches.ts`; full-screen planner `client/src/components/SessionTournamentPlanner.tsx` (player pool + pair/single builder, HTML5 drag-drop teams into court groups, auto round-robin, reorder/remove, Start Tournament). DDL applied to live DB via psql IF NOT EXISTS; declared in `shared/schema.ts`.

### Other modules

- **My Training Profile** (`/my-training-profile`): Novos.gg-style esports skill dashboard + admin/coach "View as player" picker (`isAdminish` → `/api/admin/player-analytics/enrollments`).
- **Dashboard hero** (`client/src/components/dashboard/DashboardHero.tsx`): 13-tile uniform 3-per-row hero — greeting+clock, weather (Open-Meteo), counters, week strip, up-next, training challenges, live courts, today's deal (OpenAI Responses + web_search → `/api/daily-content/deals`), pro tip, hydration, daily quote, daily poll, next event. AI content cached daily in `server/dailyContent.ts`. Deals are biased to sponsor **Central Sports** (`centralsports.co.uk`) — server forces the first 2 entries to `sponsored:true` (auto-prepends if AI omits, then sort-stable) and Deal type carries optional `imageUrl` + `sponsored`. Tile renders a 64px product thumbnail + amber "Sponsor" pill when present.
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
