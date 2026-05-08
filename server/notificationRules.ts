import { db } from "./db";
import { notificationRules } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendPushToUsers, type PushPayload } from "./oneSignal";

export const RULE_KEYS = [
  "paymentReceived",
  "waitlistPromoted",
  "newSessionMatchingLevel",
  "postSessionUnpaidReminder",
] as const;
export type RuleKey = typeof RULE_KEYS[number];

const DEFAULTS: Record<RuleKey, { title: string; message: string }> = {
  paymentReceived: {
    title: "Payment received",
    message: "Your payment for {sessionTitle} is confirmed. Thanks!",
  },
  waitlistPromoted: {
    title: "You're in!",
    message: "A spot opened up for {sessionTitle} on {date}.",
  },
  newSessionMatchingLevel: {
    title: "New session for your level",
    message: "{sessionTitle} on {date} matches your grade. Tap to sign up.",
  },
  postSessionUnpaidReminder: {
    title: "Payment outstanding",
    message: "Your fee for \"{sessionTitle}\" on {date} hasn't been paid yet. Please settle it as soon as possible.",
  },
};

// Idempotent — ensures every required rule row exists with sensible defaults.
// Safe to call on every boot; uses ON CONFLICT DO NOTHING so existing
// admin-customized rows are preserved.
export async function ensureRuleSeeds(): Promise<void> {
  try {
    for (const key of RULE_KEYS) {
      await db
        .insert(notificationRules)
        .values({ ruleKey: key, enabled: true, ...DEFAULTS[key] })
        .onConflictDoNothing();
    }
  } catch (e) {
    console.error("[notificationRules] ensureRuleSeeds failed:", e);
  }
}

const ruleCache = new Map<string, { row: any; at: number }>();
const CACHE_MS = 30_000;

export async function getRule(key: RuleKey) {
  const cached = ruleCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.row;
  const [row] = await db
    .select()
    .from(notificationRules)
    .where(eq(notificationRules.ruleKey, key));
  ruleCache.set(key, { row, at: Date.now() });
  return row;
}

export function invalidateRuleCache(key?: RuleKey) {
  if (key) ruleCache.delete(key);
  else ruleCache.clear();
}

function render(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

// Send a push driven by the admin-configurable notification_rules row.
// If the rule is disabled (or missing), this is a no-op.
export async function sendRulePush(
  ruleKey: RuleKey,
  userIds: number[],
  vars: Record<string, string | number | undefined>,
  opts: { url?: string; data?: Record<string, any>; dedupe?: { refType: string; refId: number } } = {},
): Promise<void> {
  const rule = await getRule(ruleKey);
  if (!rule || rule.enabled === false) return;
  const payload: PushPayload = {
    title: render(rule.title, vars),
    message: render(rule.message, vars),
    url: opts.url,
    data: opts.data,
  };
  await sendPushToUsers(userIds, ruleKey as any, payload, opts.dedupe);
}
