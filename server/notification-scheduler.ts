import { db } from "./db";
import {
  users, sessions, sessionSignups, clubs, playerProfiles,
  clubMemberships, membershipPlans, referrals,
  notifications, internalMessages, notificationLogs,
  notificationScheduleSettings, creditLedger,
} from "@shared/schema";
import { eq, and, lt, gt, gte, lte, inArray, isNull, sql, ne } from "drizzle-orm";
import { sendEmail } from "./email";

const SYSTEM_SENDER_ID = 1;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(2)}`;
}

function getBankDetailsString(club: any): string {
  const parts: string[] = [];
  if (club.bankName) parts.push(club.bankName);
  if (club.bankAccountName) parts.push(`Account: ${club.bankAccountName}`);
  if (club.bankSortCode) parts.push(`Sort Code: ${club.bankSortCode}`);
  if (club.bankAccountNumber) parts.push(`Account No: ${club.bankAccountNumber}`);
  if (club.bankReference) parts.push(`Reference: ${club.bankReference}`);
  return parts.length > 0 ? parts.join(", ") : "the club's bank account (contact admin for details)";
}

async function getClubSettings(clubId: number) {
  const [settings] = await db.select().from(notificationScheduleSettings).where(eq(notificationScheduleSettings.clubId, clubId));
  return settings || {
    paymentRemindersEnabled: true,
    paymentReminderDaysBefore: 2,
    paymentReminderDailyAfter: true,
    membershipRemindersEnabled: true,
    referralRemindersEnabled: true,
    ticketNotificationsEnabled: true,
    messageNotificationsEnabled: true,
    emailNotificationsEnabled: true,
  };
}

async function hasBeenSent(recipientUserId: number, entityType: string, entityId: number, scheduleKey: string, channel: string): Promise<boolean> {
  const [existing] = await db.select({ id: notificationLogs.id })
    .from(notificationLogs)
    .where(and(
      eq(notificationLogs.recipientUserId, recipientUserId),
      eq(notificationLogs.entityType, entityType),
      eq(notificationLogs.entityId, entityId),
      eq(notificationLogs.scheduleKey, scheduleKey),
      eq(notificationLogs.channel, channel as any),
      eq(notificationLogs.status, "SENT"),
    ))
    .limit(1);
  return !!existing;
}

async function logNotification(
  recipientUserId: number,
  clubId: number | null,
  entityType: string,
  entityId: number,
  scheduleKey: string,
  channel: "IN_APP" | "CHAT" | "EMAIL",
  templateName: string,
  messageContent: string,
  status: "SENT" | "FAILED" | "SKIPPED" = "SENT",
  errorMessage?: string
) {
  await db.insert(notificationLogs).values({
    recipientUserId,
    clubId,
    entityType,
    entityId,
    scheduleKey,
    channel,
    status,
    templateName,
    messageContent,
    errorMessage,
  });
}

async function sendMultiChannel(
  recipientUserId: number,
  recipientEmail: string | null,
  recipientFirstName: string,
  clubId: number | null,
  entityType: string,
  entityId: number,
  scheduleKey: string,
  templateName: string,
  title: string,
  message: string,
  linkUrl: string,
  emailEnabled: boolean,
  notificationType: string,
) {
  const alreadySentInApp = await hasBeenSent(recipientUserId, entityType, entityId, scheduleKey, "IN_APP");
  if (!alreadySentInApp) {
    try {
      await db.insert(notifications).values({
        userId: recipientUserId,
        type: notificationType,
        title,
        message,
        linkUrl,
      });
      await logNotification(recipientUserId, clubId, entityType, entityId, scheduleKey, "IN_APP", templateName, message);
    } catch (err: any) {
      await logNotification(recipientUserId, clubId, entityType, entityId, scheduleKey, "IN_APP", templateName, message, "FAILED", err.message);
    }
  }

  const alreadySentChat = await hasBeenSent(recipientUserId, entityType, entityId, scheduleKey, "CHAT");
  if (!alreadySentChat) {
    try {
      const systemUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "OWNER")).limit(1);
      const senderId = systemUsers.length > 0 ? systemUsers[0].id : SYSTEM_SENDER_ID;
      await db.insert(internalMessages).values({
        senderId,
        recipientId: recipientUserId,
        subject: title,
        body: message,
        clubId,
      });
      await logNotification(recipientUserId, clubId, entityType, entityId, scheduleKey, "CHAT", templateName, message);
    } catch (err: any) {
      await logNotification(recipientUserId, clubId, entityType, entityId, scheduleKey, "CHAT", templateName, message, "FAILED", err.message);
    }
  }

  if (emailEnabled && recipientEmail) {
    const alreadySentEmail = await hasBeenSent(recipientUserId, entityType, entityId, scheduleKey, "EMAIL");
    if (!alreadySentEmail) {
      try {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Club Master</h2>
            <p>${message.replace(/\n/g, "<br/>")}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : ''}${linkUrl}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Details
              </a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">You received this email from Club Master automated notifications.</p>
          </div>
        `;
        await sendEmail(recipientEmail, title, htmlContent);
        await logNotification(recipientUserId, clubId, entityType, entityId, scheduleKey, "EMAIL", templateName, message);
      } catch (err: any) {
        await logNotification(recipientUserId, clubId, entityType, entityId, scheduleKey, "EMAIL", templateName, message, "FAILED", err.message);
      }
    }
  }
}

// ============================================================
// SESSION PAYMENT REMINDERS
// ============================================================
export async function processSessionPaymentReminders() {
  const now = new Date();
  const allClubs = await db.select().from(clubs).where(eq(clubs.isActive, true));

  for (const club of allClubs) {
    const settings = await getClubSettings(club.id);
    if (!settings.paymentRemindersEnabled) continue;

    const bankDetails = getBankDetailsString(club);
    const daysBefore = settings.paymentReminderDaysBefore || 2;

    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + daysBefore + 1);

    const upcomingSessions = await db.select().from(sessions)
      .where(and(
        eq(sessions.clubId, club.id),
        gte(sessions.date, windowStart),
        lte(sessions.date, windowEnd),
      ));

    for (const session of upcomingSessions) {
      const unpaidSignups = await db.select({
        signup: sessionSignups,
        profile: playerProfiles,
      })
        .from(sessionSignups)
        .innerJoin(playerProfiles, eq(sessionSignups.playerId, playerProfiles.id))
        .where(and(
          eq(sessionSignups.sessionId, session.id),
          eq(sessionSignups.paymentStatus, "UNPAID"),
          inArray(sessionSignups.signupStatus, ["CONFIRMED", "WAITING"]),
        ));

      for (const { signup, profile } of unpaidSignups) {
        const user = await db.select().from(users).where(eq(users.id, profile.userId)).limit(1);
        if (!user.length) continue;
        const u = user[0];
        const firstName = u.fullName?.split(" ")[0] || "Player";
        const sessionDate = new Date(session.date);
        const diffDays = Math.floor((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const amount = formatAmount(signup.fee);
        const sessionDateStr = formatDate(sessionDate);

        let templateName = "";
        let scheduleKey = "";
        let message = "";
        let title = "";

        const profileConfirmText = " You can confirm your payment on your Profile page once payment is made.";

        if (diffDays === daysBefore) {
          templateName = "PAYMENT_REMINDER_BEFORE";
          scheduleKey = `payment_${daysBefore}d_before`;
          title = "Payment Reminder";
          message = `\ud83d\udd14 Hi ${firstName}, our records show your payment for the ${session.title} session on ${sessionDateStr} has not been received. Please pay ${amount} to ${bankDetails} to secure your spot.${profileConfirmText}`;
        } else if (diffDays === 0) {
          templateName = "PAYMENT_REMINDER_DAY_OF";
          scheduleKey = "payment_day_of";
          title = "Payment Due Today";
          message = `\u23f0 Hi ${firstName}, today is ${session.title} session. Please ensure your payment of ${amount} to ${bankDetails} is completed before arrival.${profileConfirmText}`;
        } else if (diffDays < -1 && settings.paymentReminderDailyAfter) {
          const daysSince = Math.abs(diffDays);
          templateName = "PAYMENT_REMINDER_DAILY";
          scheduleKey = `payment_daily_d${daysSince}`;
          title = "Urgent Payment Reminder";
          message = `\u26a0\ufe0f Hi ${firstName}, your payment for ${session.title} on ${sessionDateStr} is still unpaid. Please transfer ${amount} to ${bankDetails} immediately.${profileConfirmText}`;
        }

        if (templateName && scheduleKey) {
          await sendMultiChannel(
            u.id, u.email, firstName, club.id,
            "SESSION_SIGNUP", signup.id, scheduleKey,
            templateName, title, message,
            `/sessions/${session.id}`,
            settings.emailNotificationsEnabled,
            "PAYMENT_REMINDER"
          );
        }
      }
    }
  }
}

// ============================================================
// MEMBERSHIP EXPIRATION REMINDERS
// ============================================================
export async function processMembershipExpirationReminders() {
  const now = new Date();
  const allClubs = await db.select().from(clubs).where(eq(clubs.isActive, true));

  for (const club of allClubs) {
    const settings = await getClubSettings(club.id);
    if (!settings.membershipRemindersEnabled) continue;

    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 8);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 8);

    const memberships = await db.select({
      membership: clubMemberships,
      plan: membershipPlans,
    })
      .from(clubMemberships)
      .innerJoin(membershipPlans, eq(clubMemberships.planId, membershipPlans.id))
      .where(and(
        eq(clubMemberships.clubId, club.id),
        inArray(clubMemberships.status, ["ACTIVE", "EXPIRED"]),
        gte(clubMemberships.endDate, windowStart),
        lte(clubMemberships.endDate, windowEnd),
      ));

    for (const { membership, plan } of memberships) {
      const user = await db.select().from(users).where(eq(users.id, membership.userId)).limit(1);
      if (!user.length) continue;
      const u = user[0];
      const firstName = u.fullName?.split(" ")[0] || "Player";
      const expiryDate = new Date(membership.endDate);
      const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const expiryDateStr = formatDate(expiryDate);
      const planName = plan.name || "Premium Membership";

      let templateName = "";
      let scheduleKey = "";
      let message = "";
      let title = "";

      if (diffDays === 7) {
        templateName = "MEMBERSHIP_EXPIRY_1WEEK";
        scheduleKey = "membership_7d_before";
        title = "Membership Expiring Soon";
        message = `\u2b50 Hi ${firstName}, your ${planName} expires on ${expiryDateStr}. Please renew to continue enjoying member benefits.`;
      } else if (diffDays === 3) {
        templateName = "MEMBERSHIP_EXPIRY_3DAYS";
        scheduleKey = "membership_3d_before";
        title = "Membership Expiring in 3 Days";
        message = `\u23f3 Hi ${firstName}, your ${planName} expires on ${expiryDateStr}. Renew now to maintain access to all sessions and perks.`;
      } else if (diffDays === 0) {
        templateName = "MEMBERSHIP_EXPIRY_TODAY";
        scheduleKey = "membership_day_of";
        title = "Membership Expires Today";
        message = `\ud83d\udea8 Hi ${firstName}, your ${planName} expires today (${expiryDateStr}). Renew today to avoid losing benefits.`;
      } else if (diffDays === -5) {
        templateName = "MEMBERSHIP_EXPIRY_5DAYS_AFTER";
        scheduleKey = "membership_5d_after";
        title = "Membership Expired - Action Required";
        message = `\u26a0\ufe0f Hi ${firstName}, your ${planName} expired on ${expiryDateStr}. Renew now to avoid losing session privileges.`;
      } else if (diffDays === -7) {
        templateName = "MEMBERSHIP_EXPIRY_7DAYS_AFTER";
        scheduleKey = "membership_7d_after";
        title = "Membership Cancelled";
        message = `\u274c Hi ${firstName}, your ${planName} has been cancelled as of ${expiryDateStr}. Future sessions will now be charged at the standard member rate.`;
      }

      if (templateName && scheduleKey) {
        await sendMultiChannel(
          u.id, u.email, firstName, club.id,
          "CLUB_MEMBERSHIP", membership.id, scheduleKey,
          templateName, title, message,
          `/memberships`,
          settings.emailNotificationsEnabled,
          "MEMBERSHIP_EXPIRY"
        );
      }
    }
  }
}

// ============================================================
// REFERRAL EXPIRATION REMINDERS
// ============================================================
export async function processReferralExpirationReminders() {
  const now = new Date();
  const windowStart = new Date(now);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const expiringReferrals = await db.select().from(referrals)
    .where(and(
      eq(referrals.status, "ACTIVE"),
      gte(referrals.expiresAt, windowStart),
      lte(referrals.expiresAt, windowEnd),
    ));

  for (const referral of expiringReferrals) {
    const user = await db.select().from(users).where(eq(users.id, referral.referrerId)).limit(1);
    if (!user.length) continue;
    const u = user[0];
    const firstName = u.fullName?.split(" ")[0] || "Player";

    let clubName = "your club";
    if (referral.clubId) {
      const [club] = await db.select().from(clubs).where(eq(clubs.id, referral.clubId)).limit(1);
      if (club) clubName = club.name;
    }

    const clubId = referral.clubId;
    let settings: any = { referralRemindersEnabled: true, emailNotificationsEnabled: true };
    if (clubId) {
      settings = await getClubSettings(clubId);
      if (!settings.referralRemindersEnabled) continue;
    }

    const expiryDate = new Date(referral.expiresAt);
    const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let templateName = "";
    let scheduleKey = "";
    let message = "";
    let title = "";

    if (diffDays === 2) {
      templateName = "REFERRAL_EXPIRY_2DAYS";
      scheduleKey = "referral_2d_before";
      title = "Referral Code Expiring Soon";
      message = `\ud83d\udd14 Hi ${firstName}, your referral code for ${clubName} will expire in 2 days. Share it now to help friends join and earn rewards!`;
    } else if (diffDays === 0) {
      templateName = "REFERRAL_EXPIRY_TODAY";
      scheduleKey = "referral_day_of";
      title = "Referral Code Expires Today";
      message = `\u23f0 Hi ${firstName}, your referral code for ${clubName} expires today. Don't miss the chance to earn credits and unlock membership benefits.`;
    }

    if (templateName && scheduleKey) {
      await sendMultiChannel(
        u.id, u.email, firstName, clubId,
        "REFERRAL", referral.id, scheduleKey,
        templateName, title, message,
        `/referrals`,
        settings.emailNotificationsEnabled,
        "REFERRAL_EXPIRY"
      );
    }
  }
}

// ============================================================
// IMMEDIATE NOTIFICATION HELPERS (for tickets & messages)
// ============================================================
export async function sendTicketReplyNotification(
  ticketId: number,
  ticketNumber: string,
  recipientUserId: number,
  senderName: string,
  subject: string,
  clubId: number,
  isStaffReply: boolean,
) {
  const user = await db.select().from(users).where(eq(users.id, recipientUserId)).limit(1);
  if (!user.length) return;
  const u = user[0];
  const firstName = u.fullName?.split(" ")[0] || "Player";

  const settings = await getClubSettings(clubId);
  if (!settings.ticketNotificationsEnabled) return;

  const senderLabel = isStaffReply ? `${senderName} (Admin/Support)` : senderName;
  const message = `\ud83d\udd14 Hi ${firstName}, your ticket ${ticketNumber} has a new response from ${senderLabel}.`;
  const title = `Ticket Reply: ${ticketNumber}`;

  await sendMultiChannel(
    u.id, u.email, firstName, clubId,
    "TICKET_REPLY", ticketId, `ticket_reply_${Date.now()}`,
    "TICKET_REPLY_NOTIFICATION", title, message,
    `/tickets/${ticketId}`,
    settings.emailNotificationsEnabled,
    "TICKET_REPLY"
  );
}

export async function sendNewMessageNotification(
  messageId: number,
  recipientUserId: number,
  senderName: string,
  subject: string,
  clubId: number | null,
) {
  const user = await db.select().from(users).where(eq(users.id, recipientUserId)).limit(1);
  if (!user.length) return;
  const u = user[0];
  const firstName = u.fullName?.split(" ")[0] || "Player";

  if (clubId) {
    const settings = await getClubSettings(clubId);
    if (!settings.messageNotificationsEnabled) return;
  }

  const chatSubject = subject || "a new message";
  const message = `\ud83d\udce9 Hi ${firstName}, you have received a new message from ${senderName} regarding ${chatSubject}.`;
  const title = `New Message from ${senderName}`;

  await sendMultiChannel(
    u.id, u.email, firstName, clubId,
    "INTERNAL_MESSAGE", messageId, `message_${Date.now()}`,
    "NEW_MESSAGE_NOTIFICATION", title, message,
    `/inbox`,
    clubId ? (await getClubSettings(clubId)).emailNotificationsEnabled : true,
    "NEW_MESSAGE"
  );
}

// ============================================================
// CLUB JOINING ANNIVERSARY NOTIFICATIONS & CREDIT
// ============================================================
export async function processAnniversaryNotifications() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const allActiveProfiles = await db.select({
    profileId: playerProfiles.id,
    userId: playerProfiles.userId,
    clubId: playerProfiles.clubId,
    joinedAt: playerProfiles.joinedAt,
    playerStatus: playerProfiles.playerStatus,
  }).from(playerProfiles)
    .where(eq(playerProfiles.playerStatus, "ACTIVE"));

  for (const profile of allActiveProfiles) {
    if (!profile.joinedAt) continue;
    const joinDate = new Date(profile.joinedAt);
    if (joinDate.getMonth() !== today.getMonth() || joinDate.getDate() !== today.getDate()) continue;

    const yearsCompleted = today.getFullYear() - joinDate.getFullYear();
    if (yearsCompleted < 1) continue;

    const user = await db.select().from(users).where(eq(users.id, profile.userId)).limit(1);
    if (!user.length) continue;
    const u = user[0];
    const firstName = u.fullName?.split(" ")[0] || "Player";

    const [club] = await db.select().from(clubs).where(eq(clubs.id, profile.clubId)).limit(1);
    if (!club) continue;

    const settings = await getClubSettings(club.id);
    const scheduleKey = `anniversary_year_${yearsCompleted}`;
    const entityType = "PLAYER_PROFILE";

    const alreadySent = await hasBeenSent(profile.userId, entityType, profile.profileId, scheduleKey, "IN_APP");
    if (alreadySent) continue;

    const creditAmountPence = 1600;
    const creditReason = `Club anniversary reward - ${yearsCompleted} year${yearsCompleted > 1 ? "s" : ""} with ${club.name}`;
    const existingCredit = await db.select({ id: creditLedger.id }).from(creditLedger)
      .where(and(
        eq(creditLedger.userId, profile.userId),
        eq(creditLedger.clubId, club.id),
        eq(creditLedger.reason, creditReason),
      ))
      .limit(1);
    if (existingCredit.length === 0) {
      try {
        const systemUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "OWNER")).limit(1);
        const systemId = systemUsers.length > 0 ? systemUsers[0].id : SYSTEM_SENDER_ID;
        await db.insert(creditLedger).values({
          userId: profile.userId,
          clubId: club.id,
          amount: creditAmountPence,
          reason: creditReason,
          createdById: systemId,
        });
      } catch (err) {
        console.error(`[ANNIVERSARY] Failed to credit user ${profile.userId}:`, err);
      }
    }

    const yearLabel = yearsCompleted === 1 ? "1 year" : `${yearsCompleted} years`;
    const title = `Happy ${yearsCompleted}-Year Anniversary!`;
    const message = `Congratulations ${firstName}! Today marks ${yearLabel} since you joined ${club.name}. Thank you for being part of our sports community! As a token of our appreciation, we have added GBP 16.00 credit to your account.`;

    await sendMultiChannel(
      u.id, u.email, firstName, club.id,
      entityType, profile.profileId, scheduleKey,
      "ANNIVERSARY_NOTIFICATION", title, message,
      `/dashboard`,
      settings.emailNotificationsEnabled,
      "ANNIVERSARY"
    );
  }
}

// ============================================================
// MAIN SCHEDULER
// ============================================================
export async function runNotificationScheduler() {
  console.log("[NOTIFICATION SCHEDULER] Starting scheduled notification check...");
  try {
    await processSessionPaymentReminders();
  } catch (err) {
    console.error("[NOTIFICATION SCHEDULER] Session payment reminders failed:", err);
  }
  try {
    await processMembershipExpirationReminders();
  } catch (err) {
    console.error("[NOTIFICATION SCHEDULER] Membership expiration reminders failed:", err);
  }
  try {
    await processReferralExpirationReminders();
  } catch (err) {
    console.error("[NOTIFICATION SCHEDULER] Referral expiration reminders failed:", err);
  }
  try {
    await processAnniversaryNotifications();
  } catch (err) {
    console.error("[NOTIFICATION SCHEDULER] Anniversary notifications failed:", err);
  }
  console.log("[NOTIFICATION SCHEDULER] Scheduled notification check complete.");
}
