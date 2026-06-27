---
name: Session Tournament Mode
description: How the optional per-session pre-planning ("Tournament Mode") reuses the matches table and stays isolated from Normal mode.
---

# Session Tournament Mode

Optional per-session mode (`sessions.tournamentMode`) to pre-plan pairs, court groups, and matches before play, then release them into the existing live flow.

- **PLANNED reuses the matches table.** `matchStatusEnum` has `PLANNED`; pre-planned matches are real `matches` rows with `status='PLANNED'`, `groupId`, `plannedOrder`. Two new tables: `session_groups` (one per court) + `session_group_entries` (a single or a pair).
- **Rule: PLANNED must never leak into Normal mode.** Any query feeding the live/queue/completed UI must exclude `PLANNED` (the normal session matches getter does via `ne(status,'PLANNED')`). The planner reads PLANNED through a dedicated endpoint only.
  **Why:** Normal mode had to stay byte-for-byte unchanged; the whole feature is additive.
- **Release = flip PLANNED → QUEUED** ordered by (group displayOrder, plannedOrder), keeping `courtNumber`. From there the normal live system + existing leaderboard (counts COMPLETED only) take over — zero leaderboard code changes.
- **Roster changes must invalidate a group's plan.** Adding/moving/deleting an entry deletes that group's PLANNED matches, otherwise stale plans reference players no longer in the group. Auto-generate also clears the group first then rebuilds the round-robin (C(n,2)).
  **How to apply:** every entry create/move/delete route calls `deletePlannedMatchesForGroup` for affected group(s).
- **Object-scoping:** group/entry/match mutation routes authorize the parent session AND verify the child belongs to that session (avoid cross-session IDOR). Player double-placement is guarded app-level (single-organiser flow; no DB cross-column uniqueness).

## Multi-stage extension (stages = Round Robin → QF → SF → Final)

- **`session_stages` table** + nullable `stageId` on `matches`/`session_groups`/`session_group_entries`. Legacy NULL stageId = "Unassigned"; `ensureDefaultStage` backfills a first stage for tournament sessions only — so **normal/single-stage sessions return `stages=[]`** and all stage UI stays hidden.
- **UI gate is `stages.length > 1`, NOT `tournamentMode`.** Leaderboard stage tabs (Overall + per-stage) and finalised-matches stage headers only appear when 2+ stages exist. This keeps non-tournament and single-stage modes byte-for-byte unchanged without needing the tournamentMode flag in every component.
  **How to apply:** fetch `useSessionStages(sessionId)` once high up (e.g. MatchesView / CompletedSessionView) and pass the array down as a `stages` prop rather than each leaf re-fetching.
- **Stage-filtered leaderboard:** `useSessionLeaderboard(sessionId, stageId?)` appends `?stageId=` only when set; queryKey gains a `stageId ?? "all"` segment. Existing prefix invalidations (`["/api/sessions", id, "leaderboard"]`) still match via TanStack v5 prefix matching — don't "fix" them.
- **Finalised-by-stage grouping** is derived on the frontend (no dedicated endpoint): sort COMPLETED matches by stage `displayOrder` then `completedAt`, emit a header row when `stageId` changes (NULL bucket sorts last at 9999). Both `CompletedMatches` (live) and `CompletedSessionView` (ended) do this.

## Advance-to-next-stage seeding modes

- Four placement modes for advancing teams (server allowlists them; invalid input silently falls back to MANUAL): **RANDOMISE** (shuffle + round-robin deal across `groupCount`), **HIERARCHICAL** (one group per finishing position — all rank-1 teams together, etc.; strong-with-strong), **DESTRUCTION** (snake-seed a global order so strongest meet weakest, e.g. 1v4/2v3), **MANUAL** (tray, `groupId:null`).
- **The advance collector must capture each team's `rank` (and form tiebreakers)**, not just player ids — HIERARCHICAL buckets by `rank` and DESTRUCTION needs a global seed order (rank asc, then matchesWon/setsWon/pointsWon desc). `getStageStandings` already exposes these per standing.
  **Why:** the original advance only read `{player1Id,player2Id}`; the new modes are impossible without rank/form.
- `groupCount` only applies to RANDOMISE + DESTRUCTION (clamped `[1, advancing.length]`); HIERARCHICAL derives group count from distinct ranks; MANUAL ignores it. Frontend mirrors this: `showGroupCount = RANDOMISE||DESTRUCTION` gates the input and the payload field.
- **Advancing is allowed on ANY stage at any time — no completion gate.** The advance endpoint only guards `advancing.length >= 2` (400 otherwise); it no longer 409s on unfinished matches. The planner's "Advance to next stage" button shows on every stage and is always clickable (the old `isLastStage`/`stageReadyToAdvance` UI lockout was removed). `stageReady` is still computed in the tournament-plan endpoint but is no longer used to disable advancing.
  **Why:** organisers explicitly wanted to move to the next stage on demand (e.g. after a round robin) without finishing every match; the hard completion gate blocked legitimate flows and confused users. `getStageStandings` ranks all entries (teams with 0 completed matches still rank by entry order), so advancing mid-stage is safe.
- **Normal/auto match generation is suppressed when `sessions.tournamentMode` is on.** `POST …/matches/smart-generate` returns early (status `"tournament"`, empty matches) and the queued-match delete handler skips its auto-replacement. Tournament matches are created ONLY via the planner endpoints.
  **Why:** the client auto-fill kept calling smart-generate to top up the queue and delete triggered regenerate, so non-tournament matches kept appearing alongside planner-owned ones ("matches disappear / system keeps generating more"). Tournament mode owns its own match lifecycle.

## Pairing preservation + restart-stage

- **Pairs stay fixed across the whole tournament.** Match generation always builds teams from the fixed `session_group_entries` pair rows (`player1Id`+`player2Id`), and advance carries each team's `{player1Id, player2Id}` into the next stage's entries for ALL modes — partners are never remixed. The only thing that ever broke this was normal/auto match generation sneaking in extra matches; suppressing smart-generate in tournament mode is what guarantees it.
- **"Restart whole stage"** = wipe + replay a stage from scratch while keeping the same pairs: delete EVERY match for `(sessionId, stageId)` (any status incl COMPLETED — safe, no FK children reference `matches.id`; only `league_matches` has child FKs), keep groups+entries, rebuild round-robin PLANNED per group (same C(n,2) loop as auto-generate), reset stage status to `PLANNING`. Endpoint is manager-gated + verifies `stage.sessionId === sessionId`.
  **Why:** organisers needed a one-click reset after a bad/test run without losing the carefully-built pairs.

## Planner match visibility (never silently drop PLANNED)

- **Display planned matches by GROUP membership, not by the match's own `stageId`.** A PLANNED match shows wherever its group shows; groups are reliably stage-scoped (createGroup always stamps `stageId`), but a match row's `stageId` can drift (legacy/pre-multi-stage rows, backfill gaps), and filtering matches directly on `stageId === selectedStage` then hides DB-safe rows — the user perceives this as "matches disappeared on navigation" even though nothing deleted them.
  **Why:** hard product rule — planned round-robin matches must NEVER vanish unless the user explicitly deletes them; navigation/queue paths never delete PLANNED server-side, so any disappearance is a view-filter bug.
  **How to apply:** key the planner's planned-match list off the visible group ids; also keep a small "recovered/orphan" fallback list for matches whose group no longer exists (or group-less rows whose `stageId` maps to no stage) so they stay visible and deliberately deletable.
- **The planner must also surface RELEASED matches read-only, or users think "Start Tournament ate my matches".** Once PLANNED→QUEUED (start) or →LIVE/COMPLETED, a match leaves the PLANNED-only planner view and looks deleted even though nothing was lost. The tournament-plan endpoint returns a second `releasedMatches` list (non-PLANNED, `groupId IS NOT NULL`) and the planner renders them per-group read-only with a status badge + completed score.
  **Why:** the most common "matches are gone" report is actually this view gap, not data loss; showing released fixtures in place closes it without touching the live queue or normal-mode queries.

## Tournament mode = organiser drives the court, no auto-jump

- **In tournament mode, completing a match must NOT auto-promote the next queued fixture to LIVE.** Both completion paths (`end-set` and `complete`) normally pick the next non-conflicting QUEUED match and send it to the freed court; this is suppressed when `session.tournamentMode` is on so the organiser manually assigns each fixture to a court (the queue cards' existing "Assign to Court" buttons). Normal mode still auto-promotes.
  **Why:** organisers run tournaments off a fixed, ordered schedule and want to choose what goes on next, not have the system fire the next match automatically.
- **Queue reorder = full-permutation renumber, not a swap.** `POST /api/sessions/:id/queued-matches/reorder` takes `orderedIds[]` and rewrites `queuePosition` 1..n, but only after validating the payload is a deduped full permutation of the session's current QUEUED ids (else 400) so positions never gap/duplicate. The up/down buttons in the queue swap adjacent ids and send the whole list; a stale client list just gets a harmless 400 and retries after refresh.

## Starting a match must NOT prune the queue in tournament mode

- `POST /api/matches/:id/start` (sending a match to court) normally deletes every other QUEUED match that shares a player with the now-LIVE match (social play = no double-booking). This MUST be skipped when `session.tournamentMode` is on — the queued fixtures are the fixed round-robin schedule and must stay, simply waiting their turn while a player is on court.
  **Why:** organisers reported "queued matches disappear when a pair is sent to court" / "not all matches show in the queue"; the queue UI already renders every `status==='QUEUED'` row (busyPlayerIds only marks busy visually, never hides), so the only thing dropping them was this server-side prune.
  **How to apply:** the prune loop is wrapped in `if (!session.tournamentMode)`. The complete/end-set auto-promote paths never delete; they are additionally suppressed in tournament mode (see "organiser drives the court" above).

## Live-leaderboard stage tabs: per-group pair view

- On the live leaderboard, the **Overall tab stays a flat individual leaderboard**; **stage tabs render one sub-leaderboard per court group, showing PAIRS** (teams), with rank pill, W/L, points, "Top N advance", advancing rows highlighted.
- Data comes from a NEW public route `GET /api/sessions/:id/stages/:stageId/group-standings` (hook `useStageGroupStandings`). It wraps `getStageStandings` (which has no names) and resolves blur-aware display names server-side, mirroring the public `/api/sessions/:id/leaderboard` auth + `showPublicName`/`nickname` blur semantics — do NOT reuse the manager-only `/standings` route for player-facing views.
  **Why:** `getStageStandings` returns only profile ids; the planner supplies its own names via attendees, but the player leaderboard has no such source, so names must be resolved in the new route.
