import { storage } from "./storage";
import { sendEmail } from "./email";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const HIGH_PRIORITY_TYPES = new Set([
  "MERCHANDISE_ORDER",
  "JOIN_REQUEST",
  "TICKET_NEW",
  "TICKET_REPLY",
  "PAYMENT_REQUEST",
  "CREDIT_REQUEST",
  "TRIAL_DECISION",
  "MEMBERSHIP_APPROVED",
  "TOURNAMENT_REGISTRATION",
]);

function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEPLOYMENT_URL) return `https://${process.env.REPLIT_DEPLOYMENT_URL}`;
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const prodDomain = domains.split(",").find((d) => d.includes(".replit.app")) || domains.split(",")[0];
    if (prodDomain) return `https://${prodDomain.trim()}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "";
}

function buildEmailHtml(opts: { title: string; message: string; linkUrl?: string | null }): string {
  const base = getAppBaseUrl();
  const fullLink = opts.linkUrl ? (opts.linkUrl.startsWith("http") ? opts.linkUrl : `${base}${opts.linkUrl}`) : null;
  const messageHtml = (opts.message || "").replace(/\n/g, "<br/>");
  const cta = fullLink
    ? `<div style="text-align:center;margin:30px 0;">
         <a href="${fullLink}" style="background-color:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Open in Club Master</a>
       </div>`
    : "";
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#222;margin:0 0 8px;">${opts.title}</h2>
      <p style="color:#444;font-size:15px;line-height:1.5;">${messageHtml}</p>
      ${cta}
      <p style="color:#999;font-size:12px;margin-top:30px;">
        You're receiving this because of your Club Master notification preferences.
      </p>
    </div>`;
}

export interface NotifyOptions {
  userId: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  email?: boolean; // force on/off; otherwise auto-decide from type
}

export async function notifyUser(opts: NotifyOptions): Promise<void> {
  // Always create the in-app notification first
  try {
    await storage.createNotification({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      linkUrl: opts.linkUrl || null,
    } as any);
  } catch (err: any) {
    console.error("[notifyUser] in-app create failed:", err?.message || err);
    return;
  }

  const wantsEmail = opts.email ?? HIGH_PRIORITY_TYPES.has(opts.type);
  if (!wantsEmail) return;

  try {
    const [u] = await db.select({ email: users.email, fullName: users.fullName }).from(users).where(eq(users.id, opts.userId));
    if (!u || !u.email) return;
    const html = buildEmailHtml({ title: opts.title, message: opts.message, linkUrl: opts.linkUrl || null });
    await sendEmail(u.email, opts.title, html);
  } catch (err: any) {
    console.error("[notifyUser] email send failed:", err?.message || err);
  }
}

export async function notifyUsers(userIds: Iterable<number>, payload: Omit<NotifyOptions, "userId">): Promise<void> {
  const seen = new Set<number>();
  for (const userId of userIds) {
    if (seen.has(userId)) continue;
    seen.add(userId);
    await notifyUser({ ...payload, userId });
  }
}
