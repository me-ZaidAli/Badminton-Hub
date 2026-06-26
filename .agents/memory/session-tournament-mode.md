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
- **A stage may only advance once ALL its matches are COMPLETED.** The advance endpoint hard-guards (409) if any non-deleted stage match is not COMPLETED (PLANNED/QUEUED/LIVE blocks). The tournament-plan endpoint exposes a per-stage `stageReady` flag (≥1 match AND zero unfinished) so the planner disables the "Advance" button; the 409 stays the source of truth.
  **Why:** advancing mid-stage would seed the next stage off incomplete standings. The planner has no live QUEUED/LIVE match data locally, so readiness must be computed server-side and sent down.
