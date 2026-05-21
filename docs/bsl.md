# Birmingham Super League (BSL)

Esports-style competition module mounted at `/bsl`.

- **Locked palette**: bg `222 50% 6%`, cyan `195 100% 60%`, gold `42 95% 55%`.
- **Backend**: `server/bsl-routes.ts`.
- **Schema**: 5 enums + ~14 `bsl_*` tables in `shared/schema.ts`.
- **Wallet enum** = `TOPUP | DEDUCTION` (NEVER `DEBIT`).

## Routes

### Public
`/bsl` (LeagueMode), `/bsl/register-club`, `/bsl/join`, `/bsl/wallet`, `/bsl/match/:id`, `/bsl/profile`, `/bsl/my-club`, `/bsl/prizes`, `/bsl/results` (archive: leaderboard from `/api/bsl/standings` + match days grouped from `/api/bsl/fixtures` + public `GET /api/bsl/league-days` read-only).

### Admin (`/bsl/admin/*`, OWNER/ADMIN, sidebar "BSL · Control Panel")
Dashboard, league control, match-day live + match-days hub, clubs, players, payments, media, settings, prizes, competition rules. Audit via `audit()` → `bsl_audit_log`.

### Quick Results entry (`/bsl/admin/quick-results`)
Bulk-edit form — picks a fixture, lists all rubbers with home/away score inputs, single "Save all" PATCHes `/api/bsl/rubbers/:id` for every changed row.

## Modules

### Share invite
`client/src/pages/bsl/components/ShareInviteDialog.tsx` (Copy QR PNG via `ClipboardItem`, Save PNG, Web Share). `PrivateRoute` bounces logged-out users to `/login?next=…` (`safeNext()` allows internal `/`-prefix only).

### Club-vs-Club fixtures + DnD pair assignment
`bsl_fixtures.home/away_club_id`. `POST /api/bsl/admin/club-fixtures`, `PATCH /api/bsl/admin/rubbers/:id/assign`. UI `bsl/admin/FixtureSetup.tsx`. All endpoints lifecycle-guarded via `assertFixtureMutable`.

### Category Competition Settings + snapshot-on-generate (`/bsl/admin/competition`)
Tables `bsl_category_settings`, `bsl_fixture_versions`. Lifecycle cols on `bsl_league_days.state` (DRAFT|PUBLISHED|LIVE|CLOSED), `bsl_fixtures.category/version/rulesSnapshot/walkoverWinner/liveStartedAt/livePausedAt`, `bsl_rubbers.setScores/walkoverWinner`. Endpoints: `GET/PUT/DELETE /api/bsl/admin/category-settings[/:cat]`, `POST /api/bsl/admin/fixtures/regenerate` (archives SCHEDULED/WARMUP only, version+1, LIVE/FINISHED preserved), `PATCH .../league-days/:id/state`, `POST .../fixtures/:id/live`, `POST .../rubbers/:id/walkover`. Standings read pointsWin/Draw/Loss from snapshot first.

### Wallet top-up — category packages + multi-select discounts (`/bsl/wallet`)
`bsl_leagues.topup_packages jsonb` + `topup_discount_pcts jsonb` (default `[0,50,70]` = 1st full, 2nd 50% off, 3rd 70% off). Engine `shared/topupPricing.ts` (`computeTopup`). Server (`POST /api/bsl/wallet/topup`) **always recomputes** — never trusts client total.

### Payment flow — self-declared bank-transfer details (no image upload)
All 3 BSL payment endpoints (`POST /api/bsl/clubs/:id/payment-proof`, `POST /api/bsl/players/:id/payment-proof`, `POST /api/bsl/wallet/topup`) accept JSON `{paymentAmountPence, paymentDate (YYYY-MM-DD), payerAccountName (≤120 chars)}` and write to `bsl_clubs.payment{AmountPence,Date}/payerAccountName` / `bsl_players.payment{AmountPence,Date}/payerAccountName` / `bsl_wallet_transactions.payment{Date}/payerAccountName`. Multer/Object-Storage upload removed from these routes (admin media route `POST /api/bsl/admin/media` still uses upload). Legacy `paymentProofUrl`/`proofUrl` columns retained for old rows but never written. Admin queues (`/bsl/admin/verify`, `/bsl/admin/payments`) render an inline `PayDetails`/`Row pay` pill (`amount · date / payer name`) — admin cross-checks against the bank statement before clicking Approve.

### Delete fixture (admin)
`DELETE /api/bsl/admin/fixtures/:id` (`server/bsl-routes.ts` ~line 1137). Lifecycle-guarded via `assertFixtureMutable` (CLOSED & LIVE league-days blocked). Without `?force=true`, returns 400 if fixture is FINISHED or has rubber scores. Cascades rubbers in txn with `SELECT … FOR UPDATE`; if the deleted fixture was FINISHED, calls `recomputeStandings()`. UI buttons on `MatchDaysAdmin.FixtureRow` (next to Pairs link) and on each `MatchDayControl.MatchTile` (next to Unassign), both lifecycle-disabled + confirm dialog with warning when destructive.

### Club lifecycle — Sleep / Wipe (OWNER-only)
`bsl_clubs.sleeping_at`. `PATCH /api/bsl/admin/clubs/:id/sleep`, `DELETE .../wipe {confirmName}` (txn: fixtures+rubbers cascade, club row deleted, players SET NULL, wallet history preserved). Confirm phrase MUST equal exact club name.

### Super-admin club/player controls
`~bsl-routes.ts:806-1060` — create clubs/players outside public wizard, force-activate, atomic wallet adjust, categories override (no fee), `GET /api/bsl/admin/clubs/:id/manager-view`.

### Club Manager Dashboard (`/bsl/my-club`)
6-tile strip + Members table. `loadClubForManager()`. Pairs in `bsl_team_members` (max 2, auto-removes from sibling).

### Player Profile (`/bsl/profile`)
Single round-trip `GET /api/bsl/players/me/dashboard`. Per-fixture home/away derived from rubber slot. Categories register/unregister: atomic conditional UPDATE with SQL `CASE` for tier pricing keyed off `array_length(categories,1)`.

### Year-End Prize Vault (`/bsl/prizes` + `/bsl/admin/prizes`)
Tier cards (DIAMOND/PLATINUM/GOLD/SILVER/BRONZE/MYTHIC/EPIC). Table `bsl_prizes`. `POST /api/bsl/admin/prizes/seed {replace?}`.

### Match Days hub (`/bsl/admin/match-days`)
`MatchDayEditor` modal + `GET /api/bsl/admin/league-days/:id/details`. Cols `bsl_league_days.venue/notes` (240/2000 caps). `PATCH /api/bsl/fixtures/:id` extended for `homeClubId/awayClubId/bslLeagueDayId`.

### Multi-division clubs
`bsl_clubs.additionalDivisions text[]`. Each club counts once per division it participates in (primary ∪ additional). `POST/PATCH /api/bsl/admin/clubs` accept `additionalDivisions`.

### Pay-per-division joining
`bsl_leagues.division_join_fee_pence` (default 2500). `POST /api/bsl/clubs/:id/join-division {division}` atomic txn with `SELECT … FOR UPDATE` on `bsl_players`, deducts fee, appends to `additionalDivisions`. Pair-create `POST /api/bsl/clubs/:id/teams` accepts `{category, division?}`. **Sibling-pair scope is per (division, category)** at `~bsl-routes.ts:2582`.

### Permissions, Grading & Captains
`bsl_leagues.player_grades jsonb` catalogue + `divisionGrades jsonb` (per-div allowed-codes). `bsl_players.grade text`. `bsl_clubs.adminUserIds int[]`. `bsl_teams.captainPlayerId`. Endpoints: `POST /api/bsl/admin/divisions/rename`, `PATCH /api/bsl/players/:id/grade`, `POST /api/bsl/admin/players/:id/transfer` (locked when matchesPlayed>0), `PATCH /api/bsl/clubs/:id/admins`, `PATCH /api/bsl/admin/clubs/:id/owner` (OWNER-only), `PATCH /api/bsl/teams/:id/captain`.

### Admin user search
`/api/bsl/admin/users/search` uses SQL `ILIKE` (`fullName | email`) ordered by `fullName ASC LIMIT 50`.
