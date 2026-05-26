import type { Express, Request, Response } from "express";
import multer from "multer";
import { db } from "./db";
import {
  sessionPaymentReminders,
  users,
  clubMemberships,
  clubs,
} from "@shared/schema";
import { and, desc, eq, inArray, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { saveBufferToBucket } from "./uploadStorage";

// Multer for optional payment-proof upload (≤6mb, common image/pdf types).
const uploadProof = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

// ----- helpers -------------------------------------------------------------

function isAdminish(role?: string | null) {
  return role === "OWNER" || role === "ADMIN";
}

// Resolve which clubs the current admin can issue reminders FOR.
// OWNER → all clubs. ADMIN → only clubs where they are listed as
// OWNER/ADMIN in club_memberships.
async function getAdminClubIds(userId: number, role: string): Promise<number[]> {
  if (role === "OWNER") {
    const all = await db.select({ id: clubs.id }).from(clubs);
    return all.map(c => c.id);
  }
  const rows = await db
    .select({ clubId: clubMemberships.clubId })
    .from(clubMemberships)
    .where(and(
      eq(clubMemberships.userId, userId),
      inArray(clubMemberships.clubRole, ["OWNER", "ADMIN"] as any),
      eq(clubMemberships.membershipStatus, "APPROVED" as any),
    ));
  return Array.from(new Set(rows.map(r => r.clubId).filter((v): v is number => v != null)));
}

const issueSchema = z.object({
  // Pick recipients via one of three modes
  userIds: z.array(z.number().int().positive()).optional(),
  clubId: z.number().int().positive().optional(),
  allMembersOfClubId: z.number().int().positive().optional(),
  // Reminder body
  sessionsCount: z.number().int().min(1).max(999),
  amountPence: z.number().int().min(1).max(10_000_000),
  description: z.string().min(2).max(280),
  note: z.string().max(500).optional().nullable(),
  dueDate: z.string().min(8), // ISO date string
});

// ----- route registration --------------------------------------------------

export function registerSessionPaymentReminderRoutes(app: Express) {
  // ===== USER endpoints ====================================================

  // Get all OPEN reminders for the current user (PENDING / VERIFYING / REJECTED).
  // CONFIRMED reminders are excluded — that's how the floater disappears.
  app.get("/api/session-payment-reminders/active", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rows = await db.select().from(sessionPaymentReminders)
      .where(and(
        eq(sessionPaymentReminders.userId, req.user!.id),
        inArray(sessionPaymentReminders.status, ["PENDING", "VERIFYING", "REJECTED"] as any),
      ))
      .orderBy(desc(sessionPaymentReminders.createdAt));
    res.json(rows);
  });

  // User clicks "I have made the payment" → flips status to VERIFYING.
  // Accepts optional multipart file `proof`.
  app.post(
    "/api/session-payment-reminders/:id/confirm-payment",
    uploadProof.single("proof"),
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      const [row] = await db.select().from(sessionPaymentReminders)
        .where(eq(sessionPaymentReminders.id, id));
      if (!row) return res.status(404).json({ message: "Reminder not found" });
      if (row.userId !== req.user!.id) return res.sendStatus(403);
      if (row.status === "CONFIRMED") {
        return res.status(409).json({ message: "Already confirmed" });
      }

      let proofUrl: string | null = row.proofUrl;
      if (req.file?.buffer) {
        proofUrl = await saveBufferToBucket(
          req.file.buffer,
          "payment-proofs",
          req.file.originalname || "proof",
        );
      }

      const [updated] = await db.update(sessionPaymentReminders)
        .set({
          status: "VERIFYING",
          userConfirmedAt: new Date(),
          proofUrl,
          // Reset any previous rejection so the user message is clean again
          rejectionReason: null,
        })
        .where(eq(sessionPaymentReminders.id, id))
        .returning();
      res.json(updated);
    },
  );

  // ===== ADMIN endpoints ===================================================

  // List reminders the admin is allowed to see. Supports ?status= filter
  // and ?q= search (matches description/note + recipient name/email).
  app.get("/api/admin/session-payment-reminders", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role as string;
    if (!isAdminish(role)) return res.sendStatus(403);

    const clubIds = await getAdminClubIds(req.user!.id, role);
    if (clubIds.length === 0 && role !== "OWNER") return res.json([]);

    const status = (req.query.status as string | undefined)?.toUpperCase();
    const validStatus = ["PENDING", "VERIFYING", "CONFIRMED", "REJECTED"];
    const conds: any[] = [];
    if (role !== "OWNER") {
      // ADMINs see only reminders for their clubs (or club_id NULL — orphans).
      conds.push(or(
        inArray(sessionPaymentReminders.clubId, clubIds),
        isNull(sessionPaymentReminders.clubId),
      ));
    }
    if (status && validStatus.includes(status)) {
      conds.push(eq(sessionPaymentReminders.status, status as any));
    }

    const rows = await db.select({
      reminder: sessionPaymentReminders,
      recipient: { id: users.id, fullName: users.fullName, email: users.email },
    })
      .from(sessionPaymentReminders)
      .leftJoin(users, eq(users.id, sessionPaymentReminders.userId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(sessionPaymentReminders.createdAt))
      .limit(500);

    res.json(rows.map(r => ({ ...r.reminder, recipient: r.recipient })));
  });

  // Issue reminder(s). Supports single user, multi-user, or "all members of club".
  app.post("/api/admin/session-payment-reminders", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role as string;
    if (!isAdminish(role)) return res.sendStatus(403);

    const parsed = issueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    const body = parsed.data;

    const dueDate = new Date(body.dueDate);
    if (!Number.isFinite(dueDate.getTime())) return res.status(400).json({ message: "Invalid dueDate" });

    // Resolve recipients
    let recipientUserIds: number[] = [];
    let targetClubId: number | null = null;
    const allowedClubIds = await getAdminClubIds(req.user!.id, role);

    if (body.allMembersOfClubId) {
      const cid = body.allMembersOfClubId;
      if (role !== "OWNER" && !allowedClubIds.includes(cid)) {
        return res.status(403).json({ message: "Not an admin of that club" });
      }
      targetClubId = cid;
      const members = await db.select({ userId: clubMemberships.userId })
        .from(clubMemberships)
        .where(and(
          eq(clubMemberships.clubId, cid),
          eq(clubMemberships.membershipStatus, "APPROVED" as any),
        ));
      recipientUserIds = Array.from(new Set(members.map(m => m.userId).filter((v): v is number => v != null)));
    } else if (body.userIds && body.userIds.length > 0) {
      recipientUserIds = Array.from(new Set(body.userIds));
      targetClubId = body.clubId ?? null;
      if (targetClubId && role !== "OWNER" && !allowedClubIds.includes(targetClubId)) {
        return res.status(403).json({ message: "Not an admin of that club" });
      }
    } else {
      return res.status(400).json({ message: "Provide userIds[] or allMembersOfClubId" });
    }

    if (recipientUserIds.length === 0) return res.status(400).json({ message: "No recipients" });

    const inserted = await db.insert(sessionPaymentReminders).values(
      recipientUserIds.map(uid => ({
        userId: uid,
        clubId: targetClubId,
        issuedByUserId: req.user!.id,
        sessionsCount: body.sessionsCount,
        amountPence: body.amountPence,
        description: body.description,
        note: body.note ?? null,
        dueDate,
      })),
    ).returning();

    res.status(201).json({ created: inserted.length, reminders: inserted });
  });

  // Admin confirms or rejects. action = "CONFIRM" | "REJECT".
  app.patch("/api/admin/session-payment-reminders/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role as string;
    if (!isAdminish(role)) return res.sendStatus(403);

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const action = String(req.body?.action || "").toUpperCase();
    if (action !== "CONFIRM" && action !== "REJECT") {
      return res.status(400).json({ message: "action must be CONFIRM or REJECT" });
    }
    const reason: string | undefined = action === "REJECT"
      ? String(req.body?.reason || "").trim()
      : undefined;
    if (action === "REJECT" && (!reason || reason.length < 2)) {
      return res.status(400).json({ message: "Rejection reason required" });
    }

    const [row] = await db.select().from(sessionPaymentReminders)
      .where(eq(sessionPaymentReminders.id, id));
    if (!row) return res.status(404).json({ message: "Not found" });

    // ADMINs can only action reminders for clubs they admin (or NULL club).
    if (role !== "OWNER") {
      const allowedClubIds = await getAdminClubIds(req.user!.id, role);
      if (row.clubId != null && !allowedClubIds.includes(row.clubId)) {
        return res.sendStatus(403);
      }
    }

    const newStatus = action === "CONFIRM" ? "CONFIRMED" : "REJECTED";
    const [updated] = await db.update(sessionPaymentReminders)
      .set({
        status: newStatus as any,
        adminActionedAt: new Date(),
        adminActionedByUserId: req.user!.id,
        rejectionReason: action === "REJECT" ? reason! : null,
      })
      .where(eq(sessionPaymentReminders.id, id))
      .returning();
    res.json(updated);
  });
}
