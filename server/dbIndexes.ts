import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Idempotent hot-path indexes. Safe to call on every startup.
 * Adds indexes that benefit the busiest queries (badge counts, admin merchandise,
 * notifications, club membership lookups, matches).
 */
export async function ensureHotIndexes(): Promise<void> {
  const statements: string[] = [
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read_at)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_merch_orders_club_viewed ON merchandise_order_items (club_id, viewed_by_admin_at)`,
    `CREATE INDEX IF NOT EXISTS idx_merch_orders_user_created ON merchandise_order_items (user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_merch_orders_product ON merchandise_order_items (product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_player_profiles_club_status ON player_profiles (club_id, membership_status)`,
    `CREATE INDEX IF NOT EXISTS idx_player_profiles_user ON player_profiles (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_player_profiles_club_role ON player_profiles (club_id, club_role)`,
  ];

  let added = 0;
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      added += 1;
    } catch (err: any) {
      // Don't crash startup; just log
      console.warn(`[ensureHotIndexes] Skipped: ${err?.message || err}`);
    }
  }
  console.log(`[ensureHotIndexes] Verified ${added}/${statements.length} indexes`);
}
