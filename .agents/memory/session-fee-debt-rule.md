---
name: Session fee / debt rule (single source of truth)
description: The canonical rule for when a session fee counts as owed vs collected, and which surfaces must mirror it.
---

# When a session fee counts

Canonical rule lives server-side in `server/debtRoutes.ts` `getSessionCharges`. Every
money/debt surface (client and server) MUST mirror it, or players see phantom debts.

- **Paid money always counts** as collected revenue: `paymentStatus === "PAID"` &&
  `fee > 0` — regardless of status/attendance/date (the cash is in the bank).
- **Otherwise (unpaid/pending) a fee is only OWED when**:
  `signupStatus === "CONFIRMED"` && session date `<= now` (it has actually happened)
  && attendance NOT IN (`NO_SHOW`, `JUSTIFIED_CANCELLATION`, `SICKNESS`, `EMERGENCY`)
  && `fee > 0`.
- **Never** count INVITED / WAITING signups, future sessions, or excused absences as
  owed or as collectible revenue.

**Why:** Non-technical admins panicked over a "£29k outstanding / 412 players" dashboard
that was billing people for sessions they were only invited to or that hadn't happened yet.

**How to apply:**
- Server endpoints that list outstanding money use `date <= NOW()` (NOT `date > NOW()`).
- In `client/src/pages/admin/Financials.tsx` the single predicate `countsAsFee` →
  `chargeableData` feeds ALL money KPIs, KPI detail dialogs, top-card sublabels,
  outstanding-by-player, and the analytics sub-views. Use timestamp comparison
  (`new Date(sessionDate) <= new Date()`), NOT `startOfDay`/`< today` — the latter
  wrongly drops sessions that already happened earlier today.
- The per-session RSVP roster (sessionGroups + upcoming/outstanding/past split) is the
  ONE place that intentionally stays on raw `filteredData` — it's an attendance list,
  not a money figure, so it must still show invited/waiting/future players.
- Mark-as-paid mutations must invalidate `/api/my-outstanding-payments`,
  `/api/admin/financial*`, and `/api/debts*` so debt panels refresh immediately.
