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
at `tournament_teams` for that player, NOT at the registration's
`registrationType`/`partnerId`.
**Why:** the admin Registrations list once showed paired players as "INDIVIDUAL"
because it read only the tournament-level registration; the Pairs tab looked
correct because it derives from `tournament_teams`. Two surfaces, two data
sources, contradicting each other.

**Match ALL of the user's profile ids, not one.** A multi-club user has multiple
`player_profiles` rows, and the two pair-creation routes store the team against
DIFFERENT profiles (admin-create-pair uses the first profile by userId; other
paths use the club-scoped one). So a single-profile lookup silently misses real
pairs and shows the player as unpartnered. Gather every profile id for the user
and match `tournament_teams` against all of them; the partner is the team side
whose profile id is NOT in that set. Route-agnostic — both paths materialise
`tournament_teams`.
**Why:** paired multi-club players still showed as INDIVIDUAL even after
switching from "any profile" to a single club-scoped profile, because the team
referenced yet another profile of the same user.

**Tag by gender restriction, then fall back to the category NAME.** Clubs often
leave EVERY category as `MIXED`/`ALL` and encode the real type only in the name
("Men's doubles", "Females doubles", "Mixed doubles"), so a gender-only tag makes
everything MX. `categoryDoublesTag()` checks restriction first (MALE→MD,
FEMALE→XD) then parses the name. Check women/female BEFORE men/male — "women"
contains "men" and "female" contains "male" — and treat "mixed" explicitly.

**Legacy exception:** tournament-WIDE pairs (pre per-category flow) still live on
the registration row (`registrationType = PAIR` + `partnerId`) with no
`tournament_teams` row, and the `/pairs` endpoint reads those. So a "paired"
check should treat EITHER signal as paired (category team OR legacy PAIR reg).

**Picking pairs to place into a category group must come from
`tournament_teams` for that category (the `/teams-by-category` confirmedPairs),
NOT from the tournament-wide `/pairs` endpoint.** The Groups-tab Add-Pair
dropdown once listed `/pairs` (legacy PAIR regs, no category filter) so a Men's
group showed Mixed pairs and no Men's pairs at all. Source candidates per
`group.categoryId`, submit via `teamId` (server validates teamId against
`group.categoryId`), and only fall back to category-filtered `/pairs` when a
category has no `tournament_teams` yet.
**Why:** modern per-category pairs never appear in `/pairs` (registrationType
stays INDIVIDUAL), so the legacy source is both wrong-category AND missing the
real pairs.

**Server-side team builders must filter accepted pair-requests by `categoryId`,
not just `tournamentId`.** The endpoints that materialise teams before generating
fixtures (`auto-populate-teams`, and the initial-build branch of
`reset-and-rebuild`) selected ACCEPTED `tournament_pair_requests` tournament-wide
and dumped them into the current category — Mixed pairs surfaced in Men's
fixtures. Add `eq(tournamentPairRequests.categoryId, catId)`.
**Why:** the "Regenerate Fixtures" button calls auto-populate before generate, so
any unscoped builder re-introduces the leak. Bonus bug: `reset-and-rebuild`'s
"player already in an ACCEPTED pair" dedup, when unscoped, DISSOLVES a player's
pair in this category just because they're paired in a DIFFERENT category.
Round-robin `generateRoundRobinSchedule` is correct all-vs-all already — mixed
rounds were always an input-contamination symptom, not a scheduler bug.
