import { db } from "./db";
import { userPushSubscriptions, userNotificationPrefs, pushSendLog } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

const APP_ID = process.env.VITE_ONESIGNAL_APP_ID || "";
const REST_KEY = process.env.ONESIGNAL_REST_API_KEY || "";

type Category =
  | "paymentReceived"
  | "waitlistPromoted"
  | "newSessionMatchingLevel"
  | "postSessionUnpaidReminder"
  | "adminAnnouncement";

export interface PushPayload {
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
}

async function postOneSignal(body: any): Promise<any> {
  if (!APP_ID || !REST_KEY) {
    console.warn("[OneSignal] Missing APP_ID or REST_KEY — skipping send");
    return { skipped: true };
  }
  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${REST_KEY}`,
      },
      body: JSON.stringify({ app_id: APP_ID, ...body }),
    });
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok || json.errors) {
      console.error("[OneSignal] send failed", res.status, json);
    }
    return json;
  } catch (err) {
    console.error("[OneSignal] network error", err);
    return { error: String(err) };
  }
}

async function getOptedInUserIds(userIds: number[], category: Category): Promise<number[]> {
  if (userIds.length === 0) return [];
  const prefs = await db
    .select()
    .from(userNotificationPrefs)
    .where(inArray(userNotificationPrefs.userId, userIds));
  const prefMap = new Map(prefs.map(p => [p.userId, p]));
  return userIds.filter(uid => {
    const p = prefMap.get(uid);
    if (!p) return true; // default opted-in
    return (p as any)[category] !== false;
  });
}

export async function sendPushToUsers(
  userIds: number[],
  category: Category,
  payload: PushPayload,
  dedupe?: { refType: string; refId: number },
): Promise<void> {
  const filtered = await getOptedInUserIds(userIds, category);
  if (filtered.length === 0) return;

  let recipients = filtered;
  if (dedupe) {
    const existing = await db
      .select()
      .from(pushSendLog)
      .where(
        and(
          inArray(pushSendLog.userId, filtered),
          eq(pushSendLog.category, category),
          eq(pushSendLog.refType, dedupe.refType),
          eq(pushSendLog.refId, dedupe.refId),
        ),
      );
    const sent = new Set(existing.map(e => e.userId));
    recipients = filtered.filter(uid => !sent.has(uid));
    if (recipients.length === 0) return;
  }

  const externalIds = recipients.map(String);
  const result = await postOneSignal({
    target_channel: "push",
    include_aliases: { external_id: externalIds },
    headings: { en: payload.title },
    contents: { en: payload.message },
    url: payload.url,
    data: payload.data,
    web_url: payload.url,
  });

  // Only mark as sent (for dedupe) when OneSignal actually accepted the
  // notification. This preserves the ability to retry on transient failures
  // or missing-config skips.
  const accepted = result && !result.skipped && !result.error && !result.errors && result.id;
  if (dedupe && accepted) {
    await db.insert(pushSendLog).values(
      recipients.map(uid => ({
        userId: uid,
        category,
        refType: dedupe.refType,
        refId: dedupe.refId,
      })),
    ).onConflictDoNothing();
  }
}

export async function sendPushBySegment(opts: {
  externalIds: number[];
  title: string;
  message: string;
  url?: string;
}): Promise<any> {
  if (opts.externalIds.length === 0) return { skipped: true, reason: "no recipients" };
  return await postOneSignal({
    target_channel: "push",
    include_aliases: { external_id: opts.externalIds.map(String) },
    headings: { en: opts.title },
    contents: { en: opts.message },
    url: opts.url,
    web_url: opts.url,
  });
}
