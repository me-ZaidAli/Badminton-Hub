---
name: Tournament fee snapshots & repricing
description: Why changing the tournament entry-fee rule does not fix existing finances, and how to backfill safely.
---

# Tournament entry-fee snapshots are authoritative and do NOT self-heal

Per-player category fees are snapshotted in pence onto `tournament_teams.player{1,2}EntryFeePence` at join/accept time. Every finance + "what a player owes" surface reads these snapshots, never recomputes from the live rule. Leaving a category deliberately does NOT re-price.

**Why:** snapshotting keeps a player's owed amount stable even as fees/categories change later. It's an intentional design choice (documented in replit.md).

**How to apply:** when you change a pricing rule (e.g. the multi-category cap: 1st category full, 2nd 50%, 3rd+ free), the new rule only affects NEW joins. Existing rows keep their old snapshot and the displayed finances stay "wrong" until explicitly re-priced.

## Backfilling existing snapshots — the safe pattern
- Do it in an explicit admin-triggered endpoint, NOT inside a GET handler (mutating on read is side-effectful and concurrency-unsafe; reviewers reject it).
- Group slots by USER across all their profile ids (a user can have multiple `player_profiles`), order by team id (= join order), de-dupe per category, then assign the per-position factor.
- NEVER touch collected money: skip `PAID` slots when planning AND guard every UPDATE with `payment_status != 'PAID'`. `player2_payment_status` is nullable, so use `or(isNull(...), ne(..., 'PAID'))` or NULL rows silently won't update.
- Make it idempotent: only write when the computed snapshot differs; return the actual affected row count (`.returning()`), not the planned-updates length.
