---
name: Tournament group/stage pickers must be category-scoped
description: Add-Match (and similar) group/stage dropdowns must filter by the selected category and de-dup display, but resolve picks against the full category list.
---

Group and stage dropdowns in tournament dialogs pull from tournament-wide
hooks (`useTournamentGroups`/`useTournamentStages` return EVERY category's rows).
Always filter to the selected category before rendering, or you get cross-category
leakage (e.g. "MIXED GROUP A" under a Men's category).

Duplicate group ROWS (from repeated copy-structure) also flood these dropdowns.
De-dup the DISPLAY list by name (keep most-pairs / lowest groupOrder).

**Why:** Add Match dialog listed all-category, duplicated groups and confused users.

**How to apply:** Build a deduped category-scoped list for the dropdown OPTIONS,
but resolve the user's pick (`selectedGroup`) against the FULL category list by
groupOrder — a preset launch from a group section, or a kept representative whose
name-twin had a different order, must still resolve or pair options go empty.
