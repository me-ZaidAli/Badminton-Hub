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
