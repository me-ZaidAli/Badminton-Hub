---
name: Tournament pairing is two-level
description: Why "is this player paired?" can't be read from tournament registrationType alone
---

# Tournament pairing lives at two levels

A player registers ONCE at the tournament level — that registration is almost
always `registrationType = INDIVIDUAL` (the multi-category partner flow ignores
partner fields at register time). Actual pairing happens PER CATEGORY and is
stored as a `tournament_teams` row (`player1_id`/`player2_id` = club-scoped
`player_profiles.id`, `player2_id` non-null = a real doubles pair).

**Rule:** any surface that answers "is this player paired / who with?" must look
at `tournament_teams` for that player's club-scoped profile, NOT at the
registration's `registrationType`/`partnerId`. Tag the pairing by the category's
`genderRestriction` (MALE_ONLY/MALE→MD, FEMALE_ONLY/FEMALE→XD, else→MX) via
`categoryDoublesTag()` in `server/tournamentRoutes.ts`.

**Why:** the admin Registrations list once showed paired players as
"INDIVIDUAL" because it read only the tournament-level registration. The Pairs
tab looked correct because it derives from `tournament_teams`. Two surfaces, two
data sources, contradicting each other.

**Legacy exception:** tournament-WIDE pairs (pre per-category flow) still live on
the registration row (`registrationType = PAIR` + `partnerId`) with no
`tournament_teams` row, and the `/pairs` endpoint reads those. So a "paired"
check should treat EITHER signal as paired (category team OR legacy PAIR reg).
