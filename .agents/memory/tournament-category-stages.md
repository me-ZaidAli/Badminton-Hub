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

## Stage displayOrder is 1-based and positive-only
`PATCH /api/tournament-stages/:stageId` rejects `displayOrder <= 0` ("must be a
positive integer"). When normalising/reordering a whole stage list, write 1-based
sequential values (1,2,3…), never 0-based. **Why:** a 0-based reorder 400s on the
first stage, so the reorder silently fails. **How to apply:** GroupsTab reorders
(drag-drop + Manage Stages arrows) normalise the full list each time (avoids
stale/colliding orders that make a pure swap look like a no-op) — keep them 1-based.

## Copy-structure must stay idempotent
Copying a category's groups with `replaceExisting=false` APPENDS — running it
twice piles up duplicate groups (same name under the same stage). The endpoint
now skips source groups whose `(stageName, groupName)` already exists in the
target, and only clones stages actually used by inserted groups. Duplicate
cleanup lives at `POST /api/tournaments/:id/groups/dedupe` (key = category +
stageId + lower(name); keep the copy with most team-pairs, tie-break lowest id).
**Why:** real tournaments accumulated 4-9 copies of each group from repeated
copies before the guard existed; the 5 stages that appear under every category
are legacy NULL-category shared stages, NOT duplicates — don't "clean" those.

## Editing a legacy shared stage must isolate to one category — server-side
A NULL-category ("shared") stage is visible in every category, so a naive
rename/delete/reorder of that row leaks across ALL categories. The rule: never
mutate a shared stage row in place when categories exist. Instead, on ANY edit of
a `categoryId IS NULL` stage, first materialise per-category copies (clone the
shared stage into every category, repoint each category's groups+matches to its
own copy, drop the shared row if nothing uncategorised still references it), then
apply the edit to the *resolved target* for the caller's context.
**Why:** isolation must be a server guarantee, not a frontend-timing accident —
the client can edit before any cleanup migration has run, and two clients race.
**How to apply:** the edit's category context travels in the request (PATCH body /
DELETE query `categoryId`; absent/0 = uncategorised). Resolve the target inside
ONE transaction holding `pg_advisory_xact_lock(tournamentId, <constant>)`. Resolve
the per-category copy by the SOURCE stage id (a sourceId→categoryId→cloneId map),
never by name — two stages can share a name. Dedupe clones only against rows that
existed before this run so distinct same-name shared stages are never merged.
