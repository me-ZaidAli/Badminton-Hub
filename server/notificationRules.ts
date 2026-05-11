import { db } from "./db";
import { notificationRules, notifications, notificationSendMetrics } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { sendPushToUsers, getOptedInUserIdsByCategory, type PushPayload } from "./oneSignal";
import { sendEmailToUsers, wrapEmailHtml } from "./emailSender";

async function logMetric(ruleKey: string | null, channel: "push" | "inapp" | "email", count: number) {
  if (count <= 0) return;
  try {
    await db.insert(notificationSendMetrics).values({ ruleKey, channel, recipientsCount: count });
  } catch (e) {
    console.error("[metric] log failed", e);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Universal Notification Event Registry
// Each rule key represents a single user-visible event the app can fire. They
// are admin-editable from /admin/notification-rules and persisted in the
// notification_rules table. To add a new event:
//   1. Add an entry to RULE_REGISTRY below (key, category, title, message).
//   2. At the trigger site, call sendRulePush(key, userIds, vars, opts).
// The seed runs idempotently on every server boot via ensureRuleSeeds().
// ───────────────────────────────────────────────────────────────────────────────

type RuleSeed = {
  key: string;
  category: string;
  title: string;
  message: string;
  description?: string;
  placeholders?: string[];
};

export const RULE_REGISTRY: RuleSeed[] = [
  // Account
  { key: "accountCreated", category: "Account", title: "Welcome to {clubName}!",
    message: "Hi {fullName}, your account is ready. Tap to complete your profile.",
    placeholders: ["{fullName}", "{clubName}"] },
  { key: "accountPasswordChanged", category: "Account", title: "Password updated",
    message: "Your password was changed. If this wasn't you, contact support immediately.",
    placeholders: [] },
  { key: "accountRoleChanged", category: "Account", title: "Your role changed",
    message: "You're now a {newRole}. Tap to see what's new.",
    placeholders: ["{newRole}"] },

  // Membership
  { key: "membershipApproved", category: "Membership", title: "Membership approved",
    message: "Welcome to {clubName} — you're now a member.",
    placeholders: ["{clubName}"] },
  { key: "membershipRejected", category: "Membership", title: "Membership update",
    message: "Your membership request for {clubName} wasn't approved. Tap for details.",
    placeholders: ["{clubName}"] },
  { key: "membershipExpiring", category: "Membership", title: "Membership expiring soon",
    message: "Your {clubName} membership expires on {date}. Renew to keep playing.",
    placeholders: ["{clubName}", "{date}"] },
  { key: "membershipLeft", category: "Membership", title: "Member left club",
    message: "{fullName} has left {clubName}.",
    placeholders: ["{fullName}", "{clubName}"] },

  // Payments  (paymentReceived already exists & is wired)
  { key: "paymentReceived", category: "Payments", title: "Payment received",
    message: "Your payment for {sessionTitle} is confirmed. Thanks!",
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "paymentRequested", category: "Payments", title: "Payment requested",
    message: "Payment of {amount} is due for {sessionTitle}. Tap to pay.",
    placeholders: ["{amount}", "{sessionTitle}"] },
  { key: "paymentReminder", category: "Payments", title: "Payment reminder",
    message: "Your payment of {amount} for {sessionTitle} on {date} is outstanding.",
    placeholders: ["{amount}", "{sessionTitle}", "{date}"] },
  { key: "paymentFailed", category: "Payments", title: "Payment failed",
    message: "We couldn't process your payment for {sessionTitle}. Please try again.",
    placeholders: ["{sessionTitle}"] },
  { key: "paymentRefunded", category: "Payments", title: "Refund issued",
    message: "{amount} has been refunded for {sessionTitle}.",
    placeholders: ["{amount}", "{sessionTitle}"] },
  { key: "creditAdded", category: "Payments", title: "Credit added",
    message: "{amount} credit has been added to your account.",
    placeholders: ["{amount}"] },
  { key: "debtChargeAdded", category: "Payments", title: "New charge added",
    message: "A {amount} charge ({reason}) has been added to your account.",
    placeholders: ["{amount}", "{reason}"] },

  // Sessions  (waitlistPromoted, newSessionMatchingLevel, postSessionUnpaidReminder already wired)
  { key: "sessionInvited", category: "Sessions", title: "You're invited",
    message: 'You\'ve been invited to "{sessionTitle}" on {date}. Tap to confirm.',
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "sessionBooked", category: "Sessions", title: "Booking confirmed",
    message: 'You\'re signed up for "{sessionTitle}" on {date}.',
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "sessionCancelled", category: "Sessions", title: "Session cancelled",
    message: '"{sessionTitle}" on {date} has been cancelled.',
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "sessionReactivated", category: "Sessions", title: "Session is back on",
    message: 'Good news — "{sessionTitle}" on {date} is back on. Your signup is still confirmed.',
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "sessionReminder", category: "Sessions", title: "Session reminder",
    message: '"{sessionTitle}" starts {date}. See you there!',
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "waitlistPromoted", category: "Sessions", title: "You're in!",
    message: "A spot opened up for {sessionTitle} on {date}.",
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "newSessionMatchingLevel", category: "Sessions", title: "New session for your level",
    message: "{sessionTitle} on {date} matches your grade. Tap to sign up.",
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "postSessionUnpaidReminder", category: "Sessions", title: "Payment outstanding",
    message: "Your fee for \"{sessionTitle}\" on {date} hasn't been paid yet. Please settle it as soon as possible.",
    placeholders: ["{sessionTitle}", "{date}"] },
  { key: "attendanceMarked", category: "Sessions", title: "Thanks for attending",
    message: 'You earned {points} points for attending "{sessionTitle}".',
    placeholders: ["{sessionTitle}", "{points}"] },

  // Rewards
  { key: "rewardsPointsAdded", category: "Rewards", title: "Points added",
    message: "You earned {points} points — {reason}.",
    placeholders: ["{points}", "{reason}"] },
  { key: "rewardsBadgeEarned", category: "Rewards", title: "New badge unlocked!",
    message: 'Congrats! You\'ve earned the "{badgeName}" badge.',
    placeholders: ["{badgeName}"] },
  { key: "rewardsRedeemed", category: "Rewards", title: "Reward redeemed",
    message: "You redeemed {points} points for {reward}.",
    placeholders: ["{points}", "{reward}"] },
  { key: "rewardsExpiring", category: "Rewards", title: "Points expiring soon",
    message: "{points} of your points expire on {date}. Spend them before they go.",
    placeholders: ["{points}", "{date}"] },

  // League / BSL
  { key: "bslClubApproved", category: "League (BSL)", title: "BSL club approved",
    message: "Your BSL club registration is approved. Invite code: {inviteCode}",
    placeholders: ["{inviteCode}"] },
  { key: "bslFixturePublished", category: "League (BSL)", title: "New fixture",
    message: "{homeTeam} vs {awayTeam} on {date}.",
    placeholders: ["{homeTeam}", "{awayTeam}", "{date}"] },
  { key: "bslMatchReminder", category: "League (BSL)", title: "Match reminder",
    message: "Your match {homeTeam} vs {awayTeam} starts {date}.",
    placeholders: ["{homeTeam}", "{awayTeam}", "{date}"] },
  { key: "bslResultsSubmitted", category: "League (BSL)", title: "Results submitted",
    message: "Final score for {homeTeam} vs {awayTeam}: {homeScore}-{awayScore}.",
    placeholders: ["{homeTeam}", "{awayTeam}", "{homeScore}", "{awayScore}"] },
  { key: "bslWalletApproved", category: "League (BSL)", title: "Wallet top-up approved",
    message: "Your top-up of {amount} has been credited to your BSL wallet.",
    placeholders: ["{amount}"] },

  // Tournaments
  { key: "tournamentPublished", category: "Tournaments", title: "New tournament",
    message: "Registration is open for {tournamentName}. Closes {date}.",
    placeholders: ["{tournamentName}", "{date}"] },
  { key: "tournamentMatchScored", category: "Tournaments", title: "Match result updated",
    message: "Your {tournamentName} match has been scored. Tap to view standings.",
    placeholders: ["{tournamentName}"] },

  // Communication
  { key: "announcementPosted", category: "Communication", title: "{clubName} announcement",
    message: "{summary}",
    placeholders: ["{clubName}", "{summary}"] },

  // Profile completion
  { key: "profileIncomplete", category: "Profile", title: "Complete your profile",
    message: "Your {field} is missing. Tap to update.",
    placeholders: ["{field}"] },

  // Coaching (Find a Coach v2)
  { key: "coachRoleGranted", category: "Coaching", title: "You're now a coach",
    message: "Hi {name}, your COACH role is active. Set your availability and start taking bookings.",
    placeholders: ["{name}"] },
  { key: "coachLessonRequested", category: "Coaching", title: "New booking request",
    message: "{playerName} requested a lesson on {date}. Tap to respond.",
    placeholders: ["{playerName}", "{date}"] },
  { key: "coachLessonApproved", category: "Coaching", title: "Booking approved",
    message: "{coachName} approved your booking on {date} at {time}.",
    placeholders: ["{coachName}", "{date}", "{time}"] },
  { key: "coachLessonRejected", category: "Coaching", title: "Booking declined",
    message: "{coachName} couldn't take your booking on {date} at {time}.",
    placeholders: ["{coachName}", "{date}", "{time}"] },
  { key: "coachLessonCompleted", category: "Coaching", title: "Lesson completed",
    message: "Your lesson with {coachName} on {date} is marked complete. Leave a review!",
    placeholders: ["{coachName}", "{date}"] },
  { key: "coachLessonNoShow", category: "Coaching", title: "Marked as no-show",
    message: "{coachName} marked your {date} {time} booking as a no-show.",
    placeholders: ["{coachName}", "{date}", "{time}"] },
  { key: "coachLessonReminder", category: "Coaching", title: "Lesson reminder",
    message: "Your lesson with {coachName} starts {date} at {time}.",
    placeholders: ["{coachName}", "{date}", "{time}"] },
];

export const RULE_KEYS = RULE_REGISTRY.map(r => r.key) as readonly string[];
export type RuleKey = string;

const REGISTRY_BY_KEY = new Map(RULE_REGISTRY.map(r => [r.key, r]));

// Idempotent — ensures every required rule row exists and the static metadata
// (category) stays in sync. Existing admin-customized title/message/enabled are
// preserved. Safe to call on every boot.
export async function ensureRuleSeeds(): Promise<void> {
  try {
    for (const r of RULE_REGISTRY) {
      await db
        .insert(notificationRules)
        .values({ ruleKey: r.key, enabled: true, category: r.category, title: r.title, message: r.message })
        .onConflictDoUpdate({
          target: notificationRules.ruleKey,
          // Only refresh category from code on conflict — title/message/enabled are admin-owned.
          set: { category: r.category },
        });
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

// Send a notification driven by the admin-configurable notification_rules row.
// Routes to push (always when channel-allowed) and optionally writes an in-app
// notification row when opts.inApp === true. If the rule is disabled or every
// recipient has opted out of every channel, this is a no-op.
export async function sendRulePush(
  ruleKey: RuleKey,
  userIds: number[],
  vars: Record<string, string | number | undefined>,
  opts: {
    url?: string;
    data?: Record<string, any>;
    dedupe?: { refType: string; refId: number };
    inApp?: boolean;        // when true, also writes a row to `notifications` for opted-in users
    inAppType?: string;     // notifications.type — defaults to ruleKey
    email?: boolean;        // when true, also sends an email via Resend (channel-pref filtered)
  } = {},
): Promise<void> {
  if (!userIds || userIds.length === 0) return;
  const rule = await getRule(ruleKey);
  if (!rule || rule.enabled === false) return;
  const renderedTitle = render(rule.title, vars);
  const renderedMessage = render(rule.message, vars);
  const payload: PushPayload = {
    title: renderedTitle,
    message: renderedMessage,
    url: opts.url,
    data: opts.data,
  };
  // Push channel — filtered by category × push pref
  const pushRecipients = await getOptedInUserIdsByCategory(userIds, rule.category, ruleKey, "push");
  if (pushRecipients.length > 0) {
    await sendPushToUsers(pushRecipients, ruleKey as any, payload, opts.dedupe);
    logMetric(ruleKey, "push", pushRecipients.length);
  }

  // In-app channel — opt-in via opts.inApp; filtered by category × inapp pref
  if (opts.inApp) {
    const inappRecipients = await getOptedInUserIdsByCategory(userIds, rule.category, undefined, "inapp");
    if (inappRecipients.length > 0) {
      try {
        await db.insert(notifications).values(
          inappRecipients.map(uid => ({
            userId: uid,
            type: opts.inAppType || ruleKey,
            title: renderedTitle,
            message: renderedMessage,
            linkUrl: opts.url || null,
          })),
        );
        logMetric(ruleKey, "inapp", inappRecipients.length);
      } catch (e) {
        console.error("[sendRulePush in-app insert]", e);
      }
    }
  }

  // Email channel — opt-in via opts.email; filtered by category × email pref
  if (opts.email) {
    try {
      const sent = await sendEmailToUsers(
        userIds,
        { subject: renderedTitle, html: wrapEmailHtml(renderedTitle, renderedMessage, opts.url) },
        rule.category,
      );
      logMetric(ruleKey, "email", sent);
    } catch (e) {
      console.error("[sendRulePush email]", e);
    }
  }
}

// Convenience alias — preferred name going forward.
export const notifyEvent = sendRulePush;

export function getRegistryMeta(key: string): RuleSeed | undefined {
  return REGISTRY_BY_KEY.get(key);
}
