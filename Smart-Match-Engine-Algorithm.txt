# Smart Match Engine — Complete Algorithm Documentation

## Table of Contents
1. [Overview](#overview)
2. [Data Structures](#data-structures)
3. [Player Grade System](#player-grade-system)
4. [Algorithm Flow (Step by Step)](#algorithm-flow)
5. [Candidate Generation](#candidate-generation)
6. [Scoring System — All Factors & Weights](#scoring-system)
7. [Social Mode — Doubles](#social-mode-doubles)
8. [Social Mode — Singles](#social-mode-singles)
9. [Competitive Mode — Doubles](#competitive-mode-doubles)
10. [Competitive Mode — Singles](#competitive-mode-singles)
11. [Gender-Aware Logic](#gender-aware-logic)
12. [Fixed Pairs System](#fixed-pairs-system)
13. [Fairness Pre-Filter](#fairness-pre-filter)
14. [Deterministic Tiebreaker](#deterministic-tiebreaker)
15. [State Machine & Safety](#state-machine-and-safety)
16. [Player Replacement (Mid-Session)](#player-replacement)
17. [History Tracking](#history-tracking)
18. [Queue & Courts Integration](#queue-and-courts)
19. [Scoring Examples](#scoring-examples)
20. [Mode Comparison Table](#mode-comparison)

---

## 1. Overview

The Smart Match Engine is a **deterministic, score-based** algorithm. It does not use randomness. Given the same inputs, it always produces the same outputs. The engine:

1. Takes a pool of available players, each with an ID, gender, and grade
2. Generates every valid combination of players into candidate matches
3. Scores each candidate using weighted fairness factors
4. Selects the highest-scoring candidate
5. Assigns those players (removing them from the pool)
6. Repeats until the queue target is met or no more valid matches can be made

There are **4 algorithm variants** selected by two parameters:
- **Mode**: SOCIAL or COMPETITIVE
- **Format**: Singles (1v1) or Doubles (2v2)

This gives: Social Doubles, Social Singles, Competitive Doubles, Competitive Singles.

---

## 2. Data Structures

### Player
```
{
  id: number           — Unique player ID
  gender: "MALE" | "FEMALE" | null
  grade: "C3" | "C2" | "C1" | "B3" | "B2" | "B1" | "A3" | "A2" | "A1" | null
  isPaused: boolean    — Whether the player is currently sitting out
  genderOverride: string | null  — Optional override for gender in match logic
}
```

### Match Result
```
{
  teamAPlayer1Id: number
  teamAPlayer2Id: number | null   (null for singles)
  teamBPlayer1Id: number
  teamBPlayer2Id: number | null   (null for singles)
}
```

### Generate Options (Input to the engine)
```
{
  mode: "SOCIAL" | "COMPETITIVE"
  players: Player[]
  playersPerSide: 1 | 2
  genderType: "MIXED" | "FEMALE" | "MALE"
  queueTarget: number               — How many matches to generate
  recentPairings: Map<string, number>   — Partner history (pair key → count)
  recentOpponents: Map<string, number>  — Opponent history (pair key → count)
  playerMatchCounts: Map<number, number> — Games played per player
  priorityPlayerIds: number[]        — Players who should get on court first
  fixedPairs: [number, number][]     — Admin-locked partner pairs
}
```

### Tracking Maps
- **recentPairings**: Key = "smallerId-largerId", Value = number of times those two have been on the same team
- **recentOpponents**: Key = "smallerId-largerId", Value = number of times those two have faced each other
- **playerMatchCounts**: Key = player ID, Value = total matches played in this session

---

## 3. Player Grade System

The engine uses a 9-tier grade system. Each grade maps to a numerical rank:

| Grade | Rank | Description     | Category |
|-------|------|-----------------|----------|
| A1    | 9    | Elite           | A        |
| A2    | 8    | Advanced+       | A        |
| A3    | 7    | Advanced        | A        |
| B1    | 6    | Intermediate+   | B        |
| B2    | 5    | Intermediate    | B        |
| B3    | 4    | Intermediate-   | B        |
| C1    | 3    | Developing+     | C        |
| C2    | 2    | Developing      | C        |
| C3    | 1    | Beginner        | C        |

Legacy single-letter grades are also supported:
- A → rank 8 (equivalent to A2)
- B → rank 5 (equivalent to B2)
- C → rank 2 (equivalent to C2)
- D → rank 1 (equivalent to C3)
- No grade (null) → rank 1

### Classifications used in scoring:
- **Strong Player**: rank ≥ 6 (B1, A3, A2, A1)
- **Weak Player**: rank ≤ 2 (C3, C2)
- **High Grade**: rank ≥ 5 (B2, B1, A3, A2, A1)
- **Low Grade**: rank ≤ 4 (C3, C2, C1, B3)

---

## 4. Algorithm Flow (Step by Step)

This is the core loop that all 4 variants follow:

### Step 1: Pre-Processing
1. **Gender filter**: If genderType is "FEMALE", only keep female players. If "MALE", only keep non-female players. If "MIXED", keep all.
2. **Validation**: Check minimum player count (2 for singles, 4 for doubles). Check for duplicate player IDs. If validation fails, return empty with errors.
3. **Initialise state**: Create a PlayerStateMap — every player starts as "AVAILABLE".
4. **Copy tracking maps**: Make local copies of recentPairings, recentOpponents, playerMatchCounts so modifications during generation don't affect the originals.

### Step 2: Main Loop (repeat for each queue slot)
For each match slot from 0 to queueTarget:

1. **Check availability**: Count AVAILABLE players. If fewer than required (2 for singles, 4 for doubles), stop.
2. **Fairness pre-filter**: Create a reduced candidate pool prioritising under-played players (see Section 13).
3. **Generate candidates**: Create all valid player combinations from the pool (see Section 5).
4. **Score each candidate**: Apply the scoring function to every candidate (see Section 6).
5. **Select the best**: The candidate with the highest score wins. Ties broken deterministically (see Section 14).
6. **Fallback**: If no valid candidate found from the fairness pool, retry with the full player pool. If gender quota prevents a match, skip to the next slot type.
7. **Fixed pair duplicate check** (if applicable): Ensure this match doesn't duplicate an existing team-vs-team matchup. If it does, find an alternative (see Section 12).
8. **Atomic assignment**: Mark all players in the winning match as "ASSIGNED". If any player is already ASSIGNED, skip this candidate entirely (safety guard).
9. **Update tracking**: Add the new pairings, opponents, and match counts to the local tracking maps.
10. **Remove used players**: Remove assigned players from the eligible pool for subsequent rounds.

### Step 3: Post-Validation
After all matches are generated:
1. No player appears in more than one match
2. Every player marked ASSIGNED exists in exactly one match
3. No duplicate player IDs within any single match

If any violations are found, they are returned as validationErrors.

---

## 5. Candidate Generation

### Doubles Candidate Generation
Up to **120 candidates** are generated per round using three strategies:

**Strategy 1 — Fixed Pair Teams**
If there are active fixed pairs where both players are available:
- Each fixed pair becomes a "team unit" (always on the same side)
- Fixed pair units are matched against each other
- Fixed pair units are matched against ad-hoc pairs from the remaining singles pool

**Strategy 2 — Grade-Sorted Pairs**
All non-fixed available players are sorted by grade (highest first, then by ID for ties). Adjacent players in the sorted list are paired as team units:
- Player 1 + Player 2 form a team
- Player 3 + Player 4 form a team
- These team units are matched against each other in all combinations

**Strategy 3 — Exhaustive 4-Player Combinations**
For every group of 4 players from the sorted pool, three different team-split configurations are created:
1. **Strongest + Weakest vs Middle two**: Players [0]+[3] vs [1]+[2]
2. **Strongest + 3rd vs 2nd + Weakest**: Players [0]+[2] vs [1]+[3]
3. **Top pair vs Bottom pair**: Players [0]+[1] vs [2]+[3]

Each candidate is checked against fixed pair constraints — if it violates a fixed pair rule, it's discarded.

The generation stops once 120 candidates are reached (to keep computation bounded).

### Singles Candidate Generation
Much simpler — every pair of available players becomes a candidate:
- For N available players, this creates N×(N-1)/2 candidates
- Players are sorted by grade (highest first, then by ID)

---

## 6. Scoring System — All Factors & Weights

Every candidate match receives a numerical score. **Higher is better.** The engine selects the candidate with the highest score.

### 6.1 Equal Playing Time (STRONGEST FACTOR)

| Factor | Points | Description |
|--------|--------|-------------|
| Match count deficit | **-100** per deficit point, per player | Each player's games played minus the global minimum. A player with 3 games when the minimum is 1 has a deficit of 2, costing -200 points. |
| Total games played | **-20** per game, per player | Penalises players who have already played many games, even without a deficit. |
| In-match spread | **-80** per spread unit | The difference between the most-played and least-played player within this candidate match. |

**Why this is the strongest factor**: A -100 per deficit dwarfs all other factors. A player with 0 games will always be selected before a player with 2 games, regardless of grade match quality or partner variety.

### 6.2 Partner Variety (Doubles only)

| Factor | Points | Description |
|--------|--------|-------------|
| Partner repeat | **-10** per repeat count, per team pair | If players 5 and 8 have already been teammates twice, partnering them again costs -20. |
| Fixed pair exemption | 0 | Fixed pairs are exempt from this penalty — they always play together by design. |

### 6.3 Opponent Variety

| Factor | Points | Description |
|--------|--------|-------------|
| Opponent repeat | **-8** per repeat count, per cross-team pair | If player 5 (Team A) has faced player 12 (Team B) once already, this costs -8. Checked for every Team A vs Team B player pair. |

### 6.4 Grade/Skill Balance

| Factor | Points | Condition |
|--------|--------|-----------|
| Tight grade spread | **+50** | Grade spread across all players in the match ≤ 2 tiers |
| Same grade bonus | **+30** | All players are the exact same grade (spread = 0) |
| Wide grade penalty | **-25** per tier beyond 2 | Grade spread > 2 |
| High-level quality | **+40** | Average grade rank ≥ 6 AND spread ≤ 2 |
| Mid-level quality | **+20** | Average grade rank ≥ 4 (but < 6) AND spread ≤ 2 |

### 6.5 Priority Players

| Factor | Points | Description |
|--------|--------|-------------|
| Priority inclusion | **+200** per priority player | Players who have been waiting the longest get priority status. Each one in the match adds +200. |

### 6.6 Gender-Aware Scoring (Mixed mode, Doubles)

| Factor | Points | Condition |
|--------|--------|-----------|
| Strong male + female pair | **+12** | A male with rank ≥ 6 paired with a female on the same team |
| Weak male + non-weak female | **-8** | A male with rank ≤ 2 paired with a female who is NOT weak (rank > 2) |
| Both teams 2+ females | **+15** | Both Team A and Team B have at least 2 female players |
| Both teams 1+ female | **+5** | Both teams have at least 1 female player |
| Mixed slot preference | **+30** | When filling a mixed-gender slot (not a female-only slot) |
| Male rotation penalty | **-25** per repeat | Penalises reusing the same males in mixed-gender matches |

---

## 7. Social Mode — Doubles

This is the most commonly used mode for club nights.

### Behaviour:
1. Uses the full scoring system from Section 6
2. Maximises partner and opponent variety
3. Grade balance is considered but not as dominant as competitive mode
4. Gender quota system is active when genderType is "MIXED" (see Section 11)

### Gender Quota in Social Doubles:
When there are 4+ available females and 2+ available males:
- Calculate max possible female-only matches: floor(females / 4)
- Allocate up to 80% of the queue target as female-only slots
- Remaining slots are mixed-gender
- Female-only slots are filled first
- If a female-only slot can't be filled, it converts to a mixed slot
- Mixed slots rotate which males participate (penalty for reusing same males)

### Gender Unfairness Block:
In Mixed mode, the engine blocks "gender-unfair" doubles:
- 2 females vs 2 males is rejected
- This ensures mixed matches have gender variety on at least one side

### Scoring Flow per Candidate:
1. Check all 4 players are AVAILABLE
2. Check gender fairness (reject 2F vs 2M)
3. Check gender quota compliance (female-only or mixed depending on current slot)
4. Calculate base score using scorePairing() — this covers equal time, variety, grade, priority, gender scoring
5. Add mixed slot preference (+30) and male rotation penalty (-25) if applicable
6. Compare to current best; replace if higher (or use tiebreaker if equal)

---

## 8. Social Mode — Singles

Simplified scoring focused on variety and equal play time.

### Scoring Factors:
| Factor | Points |
|--------|--------|
| Opponent repeat | **-10** per repeat count |
| Match deficit from global min | **-100** per deficit, per player |
| Total games played | **-20** per game, per player |
| Priority player | **+200** per priority player |

### Behaviour:
- No grade restrictions — any skill level can play any other
- No partner tracking (singles has no partners)
- Focuses entirely on: getting under-played players on court, and varying opponents

---

## 9. Competitive Mode — Doubles

All Social Doubles scoring factors PLUS additional competitive-specific factors:

### Additional Competitive Scoring:
| Factor | Points | Condition |
|--------|--------|-----------|
| Team grade balance penalty | **-15** per grade difference | Difference between Team A average grade and Team B average grade |
| All same category | **+35** | All 4 players are from the same category (all A, all B, or all C) |
| Teams same category | **+15** | Team A is one category and Team B is another, but each team is internally consistent |
| All high-ranked | **+30** | All 4 players have rank ≥ 6 (B1 or above) |
| Mostly high-ranked | **+8** | 3 of 4 players have rank ≥ 6 |

### Key Difference from Social:
The team balance penalty (-15 per grade diff) strongly pushes toward balanced teams. A match where Team A averages rank 8 and Team B averages rank 4 would get -60 penalty, making it very unlikely to be selected.

### Gender Handling:
Same as Social Doubles — gender quota system is active in Mixed mode.

---

## 10. Competitive Mode — Singles

The most restrictive mode, focused on close skill matches.

### Hard Filter:
**Players more than 4 grade tiers apart are never matched.**
If player A is A1 (rank 9) and player B is B3 (rank 4), that's a difference of 5, so they are rejected entirely — they will never play each other in competitive singles.

### Scoring Factors:
| Factor | Points | Condition |
|--------|--------|-----------|
| Tight grade match | **+50** | Grade difference ≤ 2 tiers |
| Same grade bonus | **+30** | Grade difference = 0 |
| Wide grade penalty | **-25** per tier beyond 2 | Grade difference > 2 (but ≤ 4, since >4 is hard-filtered) |
| Grade balance penalty | **-15** per tier of difference | Applied to all candidates |
| Same category | **+25** | Both players from same category (A, B, or C) |
| High-level quality | **+40** | Both players rank ≥ 6 AND difference ≤ 2 |
| Mid-level quality | **+20** | Both players rank ≥ 4 AND difference ≤ 2 |
| Opponent repeat | **-10** per repeat count | Avoid rematches |
| Match deficit | **-100** per deficit, per player | Equal playing time |
| Total games | **-20** per game, per player | Penalise over-played |
| Priority player | **+200** per priority player | Queue priority |

### Result:
Competitive singles produces the tightest skill matches. A B2 vs B1 match (diff 1) scores +50+20+25-15 = +80 bonus. A C2 vs A3 match (diff 5) is completely blocked.

---

## 11. Gender-Aware Logic

### Effective Gender
Each player has a gender ("MALE" or "FEMALE") which can be overridden by a genderOverride field. The effective gender is:
- genderOverride if set, otherwise
- gender if set, otherwise
- "MALE" (default)

### Gender Filter (Pre-Processing)
- **MIXED**: All players included
- **FEMALE**: Only players with effective gender "FEMALE"
- **MALE**: Only players with effective gender NOT "FEMALE"

### Female Quota System (Doubles, Mixed mode)
Triggered when: 4+ available females AND 2+ available males

Calculation:
```
maxFemaleMatches = floor(availableFemales / 4)
femaleOnlySlots = min(maxFemaleMatches, ceil(queueTarget × 0.8))
mixedSlots = queueTarget - femaleOnlySlots
```

Slot filling order:
1. Female-only slots first (all 4 players must be female)
2. Then mixed slots (must include at least 1 male and 1 female)
3. If a female-only slot can't be filled, skip to mixed

Male rotation in mixed slots:
- Track how many times each male has been used in mixed matches
- Penalty: -25 per repeated usage of the same male
- This ensures different males get to play in mixed matches

### Gender Unfairness Block (Doubles, Mixed)
The following team configurations are blocked:
- Team A: 2 females, Team B: 2 males → BLOCKED
- Team A: 2 males, Team B: 2 females → BLOCKED

This prevents all-female vs all-male matchups in mixed mode.

### Gender + Grade Interaction Scoring
In doubles:
- Strong male (rank ≥ 6) partnered with a female: **+12** bonus
  - Rationale: Creates balanced mixed pairings where the stronger male complements the female player
- Weak male (rank ≤ 2) partnered with a non-weak female: **-8** penalty
  - Rationale: Avoids pairings where the male is significantly weaker, which can feel unbalanced

---

## 12. Fixed Pairs System

Admins can lock two players as a "fixed pair". When active, the engine guarantees they are always placed on the same team.

### Rules:
1. **Same team enforcement**: Both players of a fixed pair must always be on the same team. A candidate that puts them on opposite teams is rejected.
2. **Both-or-neither**: If one player of a fixed pair is in a match, the other must also be in that match. A candidate containing only one of the pair is rejected.
3. **Partner repeat exemption**: Fixed pairs are exempt from the -10 partner repeat penalty (they always play together by design, so repeating is expected).

### Duplicate Matchup Prevention:
With fixed pairs, the same team-vs-team combination can easily recur. The engine prevents this:
1. After selecting the best match, check if this exact team-vs-team matchup already exists in the current batch
2. Check is order-independent: Team A vs Team B = Team B vs Team A
3. If duplicate found, search for an alternative candidate that:
   - Has all players AVAILABLE
   - Does NOT duplicate any existing matchup
   - Has the highest score among alternatives
4. If no alternative exists, return a "pair constraint blocked" message — the engine stops generating rather than creating a duplicate

### Constraint Blocked State:
When the engine cannot generate more matches without duplicating team-vs-team matchups, it returns:
```
pairConstraintBlocked: true
pairConstraintMessage: "Not enough available players to create a different opponent pairing. 
  Waiting for a current match to finish to allow new combinations."
```
This is not an error — it's the engine correctly refusing to create repetitive matches.

---

## 13. Fairness Pre-Filter

Before generating candidates, the engine applies a fairness pre-filter to the available player pool.

### How it works:
1. Get all players with state "AVAILABLE"
2. If the available count is ≤ the match size (2 or 4), use all of them (no filtering possible)
3. Sort players by their match count (ascending — least-played first)
4. Find the minimum and maximum match counts
5. If min = max (everyone has played the same amount), no filtering needed
6. Select all players whose match count is below the maximum
7. If this filtered set has enough players (≥ 2 or ≥ 4), use it as the candidate pool
8. Otherwise, fall back to the full available pool

### Effect:
Players who have played the most games are temporarily excluded from the candidate pool. This gives under-played players a better chance of being selected. Combined with the -100 deficit penalty in scoring, this creates a strong push toward equal playing time.

### Fallback:
If the fairness-filtered pool doesn't yield a valid match (e.g., due to gender constraints or fixed pair requirements), the engine automatically retries with the full, unfiltered player pool.

---

## 14. Deterministic Tiebreaker

When two candidates have exactly the same score, the tiebreaker selects based on player IDs:

1. Sum all player IDs in each candidate
2. The candidate with the **lower sum** wins
3. If sums are equal, the candidate with the **lower minimum player ID** wins

This ensures:
- Identical inputs always produce identical outputs
- No randomness — fully reproducible results
- Lower-ID players get a slight edge in ties (consistent, predictable behaviour)

---

## 15. State Machine & Safety

### Player States
Each player has exactly one state:
- **AVAILABLE**: Can be selected for a match
- **ASSIGNED**: Already in a match this round

### Atomic Assignment
When a match is selected:
1. Check ALL players in the match are AVAILABLE
2. If ANY player is already ASSIGNED, the entire assignment fails — no partial assignments
3. If all are AVAILABLE, mark them all as ASSIGNED in one atomic operation

This prevents race conditions or inconsistent states.

### Post-Validation Checks
After all matches are generated:
1. **No duplicate cross-match**: No player ID appears in more than one match
2. **State consistency**: Every ASSIGNED player exists in exactly one match
3. **No duplicate within-match**: No player ID appears twice in the same match

Any violations are returned as validationErrors. In practice, these should never occur due to the atomic assignment guard, but they serve as a safety net.

---

## 16. Player Replacement (Mid-Session)

When a player is paused during a session, the engine can replace them in queued (not yet started) matches:

### Process:
1. Identify all queued matches containing the paused player
2. If the paused player is part of a fixed pair, the fixed partner is also replaced
3. For each position to replace:
   a. Get the set of player IDs already in that match (to avoid putting someone in twice)
   b. Sort available replacement candidates by grade (highest first, then by ID)
   c. Select the first valid replacement: not paused, not the paused player, not the fixed partner, not already in this match, not already used as a replacement in another match
4. Return a list of replacements: {matchId, position, newPlayerId}

### Constraints:
- Each replacement player can only be used once across all replacements
- Replacements maintain grade-based priority (strongest available player fills in)
- If no valid replacement exists for a position, that position goes unfilled

---

## 17. History Tracking

The engine builds tracking maps from all existing session matches. These maps are used in scoring to encourage variety.

### Building History (from existing matches):
For each completed/active match in the session:
1. **Partner pairings**: For each team with 2 players, create key "smallerId-largerId" and increment count
2. **Opponent pairings**: For every cross-team player pair, create key "smallerId-largerId" and increment count  
3. **Match counts**: For every player in the match, increment their count by 1

### Updating History (during generation):
After each match is selected within a generation batch:
1. Add team A pair to recentPairings
2. Add team B pair to recentPairings
3. Add all cross-team pairs to recentOpponents
4. Increment match count for all players involved

This means match #3 in a batch is aware of the pairings from matches #1 and #2.

---

## 18. Queue & Courts Integration

The match engine generates matches into a **queue** based on the queue target. The queue-to-court flow works as follows:

1. Admin sets a queue target (e.g., 3 matches)
2. Engine generates up to 3 matches and places them in the queue
3. When a court becomes free, the next queued match (where all players are AVAILABLE and not paused) moves onto that court
4. When auto-generate is active, the engine continuously fills the queue as matches complete
5. Each new generation batch uses updated history tracking from all previous matches, ensuring continued variety

---

## 19. Scoring Examples

### Example 1: Social Doubles — First Match of Session
**Players**: Alice(B1), Bob(B2), Carol(C1), Dave(B3) — all 0 games played
**Candidate**: Alice+Dave vs Bob+Carol

```
Equal time deficit (all 0, min 0):  0
Total games (0+0+0+0)×20:          0
Spread (0-0)×80:                    0
No partner repeats:                 0
No opponent repeats:                0
Grade spread (6,4,3,5 → max-min=3): -(3-2)×25 = -25
No priority players:                0
Gender scoring (if mixed):          depends on genders
                                    ────────
Total:                              -25
```

**Alternative candidate**: Alice+Bob vs Carol+Dave
```
Grade spread (6,5,3,4 → max-min=3): -25
                                    ────────
Total:                              -25 (tied)
```
Tiebreak: Alice+Dave vs Bob+Carol has sum = IDs, whichever sum is lower wins.

### Example 2: Social Doubles — After Several Matches
**Players**: Alice(B1, 3 games), Bob(B2, 1 game), Carol(C1, 1 game), Dave(B3, 2 games)
**Global minimum: 1 game**
**Candidate**: Alice+Dave vs Bob+Carol

```
Alice deficit (3-1)=2: -200
Dave deficit (2-1)=1:  -100
Bob deficit (1-1)=0:    0
Carol deficit (1-1)=0:  0
Total games (3+2+1+1)×20: -140
Spread (3-1)=2: -160
Grade spread: -25
                          ────────
Total:                    -625
```

**Better candidate**: Bob+Carol vs Dave+[someone with 1 game]
This would score much higher because Bob and Carol have lower deficits.

### Example 3: Competitive Singles
**Players**: Alice(A2, rank 8), Bob(B3, rank 4)
**Grade diff: 4** (exactly at the hard limit)

```
Grade match: diff=4, so -(4-2)×25 = -50 (wide gap)
Grade balance: -4×15 = -60
No same category bonus (A vs B)
No quality bonus (spread too wide)
                          ────────
Grade-related total:      -110
```

**Better candidate**: Alice(A2) vs Carol(A3)
```
Grade diff: 1
Tight grade match: +50
Same grade bonus: 0 (not identical)
Grade balance: -1×15 = -15
Same category (A vs A): +25
High-level quality (both rank ≥6, diff ≤2): +40
                          ────────
Grade-related total:      +100
```

This shows how the competitive engine strongly prefers close-skill matches.

---

## 20. Mode Comparison Table

| Factor | Social Doubles | Social Singles | Competitive Doubles | Competitive Singles |
|--------|---------------|----------------|--------------------|--------------------|
| Equal playing time | -100 deficit, -20 per game, -80 spread | -100 deficit, -20 per game | -100 deficit, -20 per game, -80 spread | -100 deficit, -20 per game |
| Partner variety | -10 per repeat | N/A | -10 per repeat | N/A |
| Opponent variety | -8 per repeat | -10 per repeat | -8 per repeat | -10 per repeat |
| Grade spread bonus | +50 (≤2), +30 (same) | — | +50 (≤2), +30 (same) | +50 (≤2), +30 (same) |
| Grade spread penalty | -25 per tier >2 | — | -25 per tier >2 | -25 per tier >2 |
| Team balance penalty | — | — | -15 per diff | -15 per diff |
| Category matching | — | — | +35 all same, +15 teams same | +25 same |
| Grade hard filter | — | — | — | Max 4 tier diff |
| High-level quality | +40 | — | +40 | +40 |
| Mid-level quality | +20 | — | +20 | +20 |
| All high-ranked | — | — | +30 (all 4), +8 (3 of 4) | — |
| Priority players | +200 each | +200 each | +200 each | +200 each |
| Gender scoring | +12/-8/+15/+5 | — | +12/-8/+15/+5 | — |
| Gender quota | Yes (80% female slots) | — | Yes (80% female slots) | — |
| Gender unfairness block | Yes (no 2F vs 2M) | — | Yes (no 2F vs 2M) | — |
| Mixed slot preference | +30 | — | +30 | — |
| Male rotation penalty | -25 per repeat | — | -25 per repeat | — |
| Fixed pairs | Supported | N/A | Supported | N/A |
| Duplicate matchup check | Yes (with fixed pairs) | — | Yes (with fixed pairs) | — |
| Max candidates/round | 120 | N×(N-1)/2 | 120 | N×(N-1)/2 |

---

## Summary

The Smart Match Engine achieves fair, balanced matches through:

1. **Determinism**: Same inputs → same outputs, always
2. **Exhaustive evaluation**: Every valid combination is considered
3. **Weighted multi-factor scoring**: Equal time is king (-100 per deficit), followed by variety (-10/-8 per repeat), grade balance (+50/-25), and priority (+200)
4. **Safety guarantees**: Atomic assignments, state tracking, post-validation
5. **Gender fairness**: Quota system, unfairness blocks, gender+grade interaction scoring
6. **Flexibility**: 4 algorithm variants (Social/Competitive × Singles/Doubles), fixed pairs, priority players, gender overrides

The engine runs entirely server-side and is invoked each time matches need to be generated for a session queue.
