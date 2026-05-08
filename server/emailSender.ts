import { db } from "./db";
import { users } from "@shared/schema";
import { inArray } from "drizzle-orm";
import { getOptedInUserIdsByCategory } from "./oneSignal";

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "Club Master <notifications@clubmaster.app>";

interface EmailPayload {
  subject: string;
  html: string;
  text?: string;
}

// Send an email to opted-in users (filtered by category × email pref).
// Returns the number of recipients actually contacted.
export async function sendEmailToUsers(
  userIds: number[],
  payload: EmailPayload,
  ruleCategory?: string,
): Promise<number> {
  if (userIds.length === 0) return 0;
  if (!RESEND_KEY) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return 0;
  }
  const filtered = await getOptedInUserIdsByCategory(userIds, ruleCategory, undefined, "email");
  if (filtered.length === 0) return 0;

  const rows = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(inArray(users.id, filtered));
  const recipients = rows.map(r => r.email).filter(Boolean);
  if (recipients.length === 0) return 0;

  // Per-recipient sends (privacy: never expose addresses to each other via shared `to`).
  // Cap at 50 per call site; larger blasts should be queued + chunked upstream.
  const slice = recipients.slice(0, 50);
  let ok = 0;
  for (const addr of slice) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from: FROM,
          to: [addr], // strictly one recipient per send
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[email] resend failed for one recipient", res.status, txt);
        continue;
      }
      ok++;
    } catch (e) {
      console.error("[email] network error", e);
    }
  }
  return ok;
}

// Tiny default HTML wrap so plain message strings render acceptably.
export function wrapEmailHtml(title: string, message: string, url?: string): string {
  const link = url
    ? `<p style="margin:24px 0"><a href="${url}" style="background:#7c3aed;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-family:system-ui,sans-serif">Open</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
    <h2 style="margin:0 0 8px">${title}</h2>
    <p style="margin:0;font-size:15px;line-height:1.5;white-space:pre-wrap">${message}</p>
    ${link}
  </div>`;
}
