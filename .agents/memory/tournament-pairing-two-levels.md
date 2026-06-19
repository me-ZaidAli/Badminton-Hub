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
