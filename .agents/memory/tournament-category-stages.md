---
name: Tournament stages are category-scoped
description: Why tournament_stages carries categoryId and the group/match↔stage scoping invariant that must hold everywhere.
---

# Tournament stages are category-scoped

`tournament_stages.categoryId` (nullable FK → tournament_categories, ON DELETE
CASCADE) scopes a stage to one category. `categoryId IS NULL` = legacy
tournament-wide stage that shows in EVERY category (back-compat for stages
created before scoping existed).

## The invariant
A group or match may only link to a stage that is either NULL (shared) or in its
OWN category. Enforced server-side in `validateStageBelongsToTournament(stageId,
tournamentId, groupCategoryId?)` — called from group create, group update, and
match create. Without this guard, a group in Category B could be pointed at
Category A's stage, re-sharing stages across categories.

**Why:** the whole point of category-scoped stages is that editing/deleting a
stage in one category must NOT affect another. Copy group structure used to reuse
the same stageId across categories, so a stage edit/delete leaked everywhere and
the Groups tab mixed all categories.

**How to apply:** any new code path that sets a group/match `stageId` must run it
through `validateStageBelongsToTournament` with the row's category. Copy-structure
must CLONE source stages into each target category as new rows and remap the
cloned groups' stageId (never reuse the source stageId).

## UI
GroupsTab derives `visibleStages`/`visibleGroups` = (NULL-category items) + (items
for the selected category). Everything in the tab (buckets, Manage Stages dialog,
badges, bulk time ops, create-stage categoryId) must use the scoped lists, not the
raw `stages`/`groups`. The group form clears its stage selection when its category
changes, so a stale out-of-scope stageId can't be submitted.
