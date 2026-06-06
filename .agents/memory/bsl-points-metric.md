---
name: BSL points-as-metric
description: BSL leaderboards, stats popups, and per-match win/loss are driven by rally POINTS, not sets/rubbers.
---

# BSL uses rally POINTS as the single headline metric

Across the BSL module the "gold" metric shown to players is **rally points** =
sum of every set's score for a side (see `rubberRallyPoints()` in
`server/bsl-routes.ts`, which mirrors the admin "Points 349 vs 355" panel).
Sets-won and rubbers-won are domain facts but are NOT the headline anywhere
player-facing.

**Rule:** Win/loss is decided by total rally points (`rp.home > rp.away`), NOT by
sets won. This applies to `computePlayerLeaderboard` (player won/lost/winRate)
and `/api/bsl/entity-matches` (`result` field). The leaderboard sorts by points.

**Why:** Players were confused/frustrated by seeing sets/rubbers as the ranking
metric. Everything now communicates in points; if a match row shows a points
score (e.g. 47–59) the WIN/LOSS badge MUST agree with it, otherwise a player who
"won on points" sees a contradictory badge. Keeping W/L on sets while showing
points produced exactly that contradiction.

**How to apply:** Any new BSL surface (dashboard tile, stats popup, match list)
should show points as the dominant number and derive any win/loss from points.
Fixture-level surfaces may show "X–Y rubbers" as the secondary tie scoreline
(a BSL tie is literally 6 rubbers) but points stay the headline. The admin
score-entry tool (`QuickResults.tsx`) legitimately still works in sets/rubbers —
that's data entry, not a player-facing metric.
