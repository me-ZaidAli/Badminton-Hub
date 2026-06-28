---
name: Session delete cascade
description: deleting a session must clean up EVERY table that FK-references sessions, or the delete 500s on an FK violation.
---

Deleting a session (`storage.deleteSession` / `deleteSessions`) must clear every table
that has a foreign key to `sessions`, or Postgres throws an FK-violation 500. This bites
repeatedly because new session-referencing tables get added over time and the delete
helpers don't get updated in lockstep.

**Why:** bulk delete in `/admin/financials` was silently 500ing because the tournament-mode
tables and a few nullable refs were never cleaned up.

**How to apply:** when you add ANY new table with a `session_id` / `linked_session_id` /
`assigned_session_id` FK, also update both delete helpers. Grep `shared/schema.ts` for
references to `sessions.id` to get the full list. Rules:
- NOT NULL FK children (e.g. tournament tables `session_group_entries`, `session_groups`,
  `session_stages`) → DELETE. Order matters: delete `matches` and `session_group_entries`
  (they reference `groupId`) before `session_groups`; stages last.
- Nullable refs (e.g. `expenses.session_id`, `tickets.linked_session_id`,
  `wallet_transactions.linked_session_id`, `inventory_movements`, `credit_ledger`,
  `incident_reports`, `trial_players`) → SET NULL to preserve the money/audit record.
- Some of these tables aren't imported as Drizzle objects in storage.ts — use raw
  `db.execute(sql\`... = ANY(${ids})\`)`. The `ANY(${array})` form binds a JS array as one
  param and is already used safely across the codebase.
