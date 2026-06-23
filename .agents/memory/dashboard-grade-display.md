---
name: Dashboard grade display
description: How the player grade badge must be derived on the dashboard so it matches profile/leaderboard.
---

# Dashboard grade must be BEST grade across all the player's club profiles

A user has one `player_profiles` row PER club, each with its own `grade` (default
`C3`) / `category`. The Profile page badge and the rankings/leaderboard show the
player's **best** grade across all their clubs (highest in
`["C3","C2","C1","B3","B2","B1","A3","A2","A1"]`, using `grade || category`).

The dashboard "Current Ranking" grade MUST use the same best-across-clubs logic —
NOT the selected/primary club's profile. A player can be A1 in one club and the
default C3 in another; picking the selected club (or the non-deterministically
ordered primary `playerProfiles[0]`) makes the dashboard read C3 while their
profile reads A1.

**Why:** repeated user reports that the dashboard grade was "wrong" (showed C3 for
an A1 player). Root cause was per-club grades + selected-club resolution, not a
single global grade.

**How to apply:** in `client/src/pages/Dashboard.tsx`, `grade` is computed by
scanning `user.playerProfiles` for the highest grade. Stats (matchesPlayed/winRate)
stay tied to the selected-club profile; only the grade badge is best-across-clubs.
`getPlayerProfilesByUser` (server/storage.ts) has NO ORDER BY, so `playerProfiles[0]`
is non-deterministic — never rely on it for grade.
