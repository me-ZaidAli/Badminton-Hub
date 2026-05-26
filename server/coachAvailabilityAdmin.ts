import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  coaches,
  coachAvailabilityRules,
  coachAvailabilityOverrides,
  coachBookingSettings,
  clubMemberships,
  users,
} from "@shared/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";

function authed(req: Request) {
  return !!(req as any).isAuthenticated?.() && !!(req as any).user;
}
function isAdminish(u: any) {
  return u?.role === "OWNER" || u?.role === "ADMIN";
}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!authed(req)) return res.status(401).json({ message: "Not authenticated" });
  if (!isAdminish((req as any).user)) return res.status(403).json({ message: "Admin only" });
  next();
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function addDaysISO(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function londonTodayISO() {
  // Anchor to Europe/London local-date for "future" cleanup.
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return f.format(new Date()); // YYYY-MM-DD
}

async function ensureCoach(coachId: number) {
  const [c] = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
  return c || null;
}

// Returns the list of clubIds the current user can administer.
// OWNER bypasses (returns null = "all").
async function getAdminClubIds(userId: number, role: string): Promise<number[] | null> {
  if (role === "OWNER") return null;
  const rows = await db
    .select({ clubId: clubMemberships.clubId })
    .from(clubMemberships)
    .where(
      and(
        eq(clubMemberships.userId, userId),
        inArray(clubMemberships.clubRole, ["OWNER", "ADMIN"] as any),
        eq(clubMemberships.membershipStatus, "APPROVED" as any),
      ),
    );
  return rows.map((r) => r.clubId).filter((id): id is number => typeof id === "number");
}

// Verifies the actor admins at least one club the target coach is linked to.
// Returns the coach row on success, or a {status, message} error to send back.
async function ensureCoachInAdminScope(req: Request, coachId: number): Promise<
  | { ok: true; coach: typeof coaches.$inferSelect }
  | { ok: false; status: number; message: string }
> {
  const coach = await ensureCoach(coachId);
  if (!coach) return { ok: false, status: 404, message: "Coach not found" };
  const role = ((req as any).user?.role || "") as string;
  const allowed = await getAdminClubIds((req as any).user!.id, role);
  if (allowed === null) return { ok: true, coach }; // OWNER
  const linked = (coach.linkedClubIds || []) as number[];
  const overlap = linked.some((id) => allowed.includes(id));
  if (!overlap) {
    return { ok: false, status: 403, message: "Coach is not in a club you administer" };
  }
  return { ok: true, coach };
}

export function registerCoachAvailabilityAdminRoutes(app: Express) {
  // ── Coach picker source (admin-only, club-scoped) ──────────────────────────
  // OWNER sees all approved coaches; ADMIN sees only coaches whose
  // `linkedClubIds` intersect the clubs they admin.
  app.get("/api/admin/coach-availability/coaches", requireAdmin, async (req, res) => {
    try {
      const role = ((req as any).user.role || "") as string;
      const allowedClubIds = await getAdminClubIds((req as any).user.id, role);

      const baseSelect = db
        .select({
          id: coaches.id,
          userId: coaches.userId,
          status: coaches.status,
          linkedClubIds: coaches.linkedClubIds,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(coaches)
        .leftJoin(users, eq(coaches.userId, users.id))
        .orderBy(users.firstName, users.lastName);

      let rows: Array<any>;
      if (allowedClubIds === null) {
        rows = await baseSelect;
      } else if (allowedClubIds.length === 0) {
        rows = [];
      } else {
        // ARRAY-OVERLAPS check against linked_club_ids
        rows = await baseSelect
          .where(sql`${coaches.linkedClubIds} && ${sql.raw(`ARRAY[${allowedClubIds.map((n) => Number(n)).join(",")}]::int[]`)}`);
      }
      res.json(rows.map(({ linkedClubIds: _l, ...r }) => r));
    } catch (e: any) {
      console.error("[coach-availability-admin] coaches", e);
      res.status(500).json({ message: e?.message || "Failed" });
    }
  });

  // ── Snapshot for a coach (rules + future overrides + default price) ────────
  app.get("/api/admin/coach-availability/:coachId/snapshot", requireAdmin, async (req, res) => {
    try {
      const coachId = Number(req.params.coachId);
      if (!Number.isFinite(coachId)) return res.status(400).json({ message: "Bad coachId" });
      const scope = await ensureCoachInAdminScope(req, coachId);
      if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

      const today = londonTodayISO();
      const [rules, overrides, [settings]] = await Promise.all([
        db.select().from(coachAvailabilityRules)
          .where(eq(coachAvailabilityRules.coachId, coachId)),
        db.select().from(coachAvailabilityOverrides)
          .where(and(
            eq(coachAvailabilityOverrides.coachId, coachId),
            gte(coachAvailabilityOverrides.date, today),
          )),
        db.select().from(coachBookingSettings)
          .where(eq(coachBookingSettings.coachId, coachId)).limit(1),
      ]);

      res.json({
        coachId,
        rules,
        overrides,
        defaultPricePence: settings?.defaultPricePence ?? 2500,
        holidayMode: settings?.holidayMode ?? false,
      });
    } catch (e: any) {
      console.error("[coach-availability-admin] snapshot", e);
      res.status(500).json({ message: e?.message || "Failed" });
    }
  });

  // ── 1. SET STANDARD WEEK HOURS — bulk apply to selected weekdays ────────────
  // Body: { days:number[], startTime, endTime, isFlexible?, replaceExisting?, defaultPricePence? }
  // Replaces (or appends to) the weekly rules for selected days in one shot.
  const standardWeekSchema = z.object({
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    startTime: z.string().regex(HHMM),
    endTime: z.string().regex(HHMM),
    isFlexible: z.boolean().optional().default(true),
    replaceExisting: z.boolean().optional().default(true),
    defaultPricePence: z.number().int().min(0).max(1_000_000).optional(),
  });
  app.post("/api/admin/coach-availability/:coachId/standard-week", requireAdmin, async (req, res) => {
    try {
      const coachId = Number(req.params.coachId);
      if (!Number.isFinite(coachId)) return res.status(400).json({ message: "Bad coachId" });
      const scope = await ensureCoachInAdminScope(req, coachId);
      if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

      const body = standardWeekSchema.parse(req.body);
      if (timeToMinutes(body.endTime) <= timeToMinutes(body.startTime)) {
        return res.status(400).json({ message: "End time must be after start time" });
      }

      await db.transaction(async (tx) => {
        if (body.replaceExisting) {
          await tx.delete(coachAvailabilityRules)
            .where(and(
              eq(coachAvailabilityRules.coachId, coachId),
              inArray(coachAvailabilityRules.dayOfWeek, body.days),
            ));
        }
        const rows = body.days.map((d) => ({
          coachId,
          dayOfWeek: d,
          startTime: body.startTime,
          endTime: body.endTime,
          isActive: true,
          isFlexible: body.isFlexible,
        }));
        if (rows.length) await tx.insert(coachAvailabilityRules).values(rows);

        if (typeof body.defaultPricePence === "number") {
          const [existing] = await tx.select().from(coachBookingSettings)
            .where(eq(coachBookingSettings.coachId, coachId)).limit(1);
          if (existing) {
            await tx.update(coachBookingSettings)
              .set({ defaultPricePence: body.defaultPricePence, updatedAt: new Date() })
              .where(eq(coachBookingSettings.coachId, coachId));
          } else {
            await tx.insert(coachBookingSettings).values({
              coachId, defaultPricePence: body.defaultPricePence,
            });
          }
        }
      });

      res.json({ ok: true, applied: body.days.length });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      console.error("[coach-availability-admin] standard-week", e);
      res.status(500).json({ message: e?.message || "Failed" });
    }
  });

  // ── 2. COPY DAY → DAYS (replicate one weekday's rules onto others) ──────────
  const copyDaySchema = z.object({
    sourceDay: z.number().int().min(0).max(6),
    targetDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    replaceExisting: z.boolean().optional().default(true),
  });
  app.post("/api/admin/coach-availability/:coachId/copy-day", requireAdmin, async (req, res) => {
    try {
      const coachId = Number(req.params.coachId);
      if (!Number.isFinite(coachId)) return res.status(400).json({ message: "Bad coachId" });
      const scope = await ensureCoachInAdminScope(req, coachId);
      if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

      const body = copyDaySchema.parse(req.body);
      const targets = body.targetDays.filter((d) => d !== body.sourceDay);
      if (!targets.length) return res.status(400).json({ message: "Pick at least one target day different from source" });

      const sourceRules = await db.select().from(coachAvailabilityRules)
        .where(and(
          eq(coachAvailabilityRules.coachId, coachId),
          eq(coachAvailabilityRules.dayOfWeek, body.sourceDay),
        ));
      if (!sourceRules.length) {
        return res.status(400).json({ message: "Source day has no rules to copy" });
      }

      await db.transaction(async (tx) => {
        if (body.replaceExisting) {
          await tx.delete(coachAvailabilityRules).where(and(
            eq(coachAvailabilityRules.coachId, coachId),
            inArray(coachAvailabilityRules.dayOfWeek, targets),
          ));
        }
        const clones = targets.flatMap((d) =>
          sourceRules.map((r) => ({
            coachId,
            dayOfWeek: d,
            startTime: r.startTime,
            endTime: r.endTime,
            isActive: r.isActive,
            isFlexible: r.isFlexible,
          })),
        );
        if (clones.length) await tx.insert(coachAvailabilityRules).values(clones);
      });

      res.json({ ok: true, copiedTo: targets.length, rulesPerDay: sourceRules.length });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      console.error("[coach-availability-admin] copy-day", e);
      res.status(500).json({ message: e?.message || "Failed" });
    }
  });

  // ── 3. REPEAT THIS WEEK → next N weeks (materialise as date overrides) ─────
  // weeks = 1 | 2 | 4. Materialises the current weekly rules as date-specific
  // override rows (one per (date,window)) so any later rule edits don't blow
  // away the locked-in future schedule.
  const repeatSchema = z.object({
    weeks: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    startDate: z.string().regex(YMD).optional(), // defaults to next Monday (London)
  });
  app.post("/api/admin/coach-availability/:coachId/repeat-week", requireAdmin, async (req, res) => {
    try {
      const coachId = Number(req.params.coachId);
      if (!Number.isFinite(coachId)) return res.status(400).json({ message: "Bad coachId" });
      const scope = await ensureCoachInAdminScope(req, coachId);
      if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

      const body = repeatSchema.parse(req.body);
      const rules = await db.select().from(coachAvailabilityRules)
        .where(and(
          eq(coachAvailabilityRules.coachId, coachId),
          eq(coachAvailabilityRules.isActive, true),
        ));
      if (!rules.length) return res.status(400).json({ message: "No weekly rules to repeat" });

      // Anchor: start at provided date, else next Monday in London.
      let startISO = body.startDate;
      if (!startISO) {
        const today = londonTodayISO();
        const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0..6
        const daysUntilMon = ((1 - todayDow) + 7) % 7 || 7;
        startISO = addDaysISO(today, daysUntilMon);
      }

      const totalDays = body.weeks * 7;
      const dates: { date: string; dow: number }[] = [];
      for (let i = 0; i < totalDays; i++) {
        const date = addDaysISO(startISO, i);
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        dates.push({ date, dow });
      }

      const inserts: Array<typeof coachAvailabilityOverrides.$inferInsert> = [];
      for (const { date, dow } of dates) {
        const dayRules = rules.filter((r) => r.dayOfWeek === dow);
        for (const r of dayRules) {
          inserts.push({
            coachId,
            date,
            isClosed: false,
            startTime: r.startTime,
            endTime: r.endTime,
            note: `Auto-repeated week (${body.weeks}w)`,
          });
        }
      }

      await db.transaction(async (tx) => {
        // Clear future overrides inside the repeat window first to avoid duplicates.
        await tx.delete(coachAvailabilityOverrides).where(and(
          eq(coachAvailabilityOverrides.coachId, coachId),
          gte(coachAvailabilityOverrides.date, startISO),
        ));
        if (inserts.length) await tx.insert(coachAvailabilityOverrides).values(inserts);
      });

      res.json({ ok: true, weeks: body.weeks, dates: dates.length, inserted: inserts.length });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      console.error("[coach-availability-admin] repeat-week", e);
      res.status(500).json({ message: e?.message || "Failed" });
    }
  });

  // ── 4. CLEAR — entire weekly schedule OR all future overrides ───────────────
  const clearSchema = z.object({
    scope: z.enum(["WEEKLY_RULES", "FUTURE_OVERRIDES", "BOTH"]),
  });
  app.post("/api/admin/coach-availability/:coachId/clear", requireAdmin, async (req, res) => {
    try {
      const coachId = Number(req.params.coachId);
      if (!Number.isFinite(coachId)) return res.status(400).json({ message: "Bad coachId" });
      const scope = await ensureCoachInAdminScope(req, coachId);
      if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

      const body = clearSchema.parse(req.body);
      const today = londonTodayISO();

      await db.transaction(async (tx) => {
        if (body.scope === "WEEKLY_RULES" || body.scope === "BOTH") {
          await tx.delete(coachAvailabilityRules)
            .where(eq(coachAvailabilityRules.coachId, coachId));
        }
        if (body.scope === "FUTURE_OVERRIDES" || body.scope === "BOTH") {
          await tx.delete(coachAvailabilityOverrides).where(and(
            eq(coachAvailabilityOverrides.coachId, coachId),
            gte(coachAvailabilityOverrides.date, today),
          ));
        }
      });

      res.json({ ok: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      console.error("[coach-availability-admin] clear", e);
      res.status(500).json({ message: e?.message || "Failed" });
    }
  });

  // ── 5. SET FULL DAY for one weekday (shortcut: green flexible window) ──────
  const fullDaySchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(HHMM).default("08:00"),
    endTime: z.string().regex(HHMM).default("22:00"),
  });
  app.post("/api/admin/coach-availability/:coachId/full-day", requireAdmin, async (req, res) => {
    try {
      const coachId = Number(req.params.coachId);
      if (!Number.isFinite(coachId)) return res.status(400).json({ message: "Bad coachId" });
      const scope = await ensureCoachInAdminScope(req, coachId);
      if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

      const body = fullDaySchema.parse(req.body);
      if (timeToMinutes(body.endTime) <= timeToMinutes(body.startTime)) {
        return res.status(400).json({ message: "End time must be after start time" });
      }

      await db.transaction(async (tx) => {
        await tx.delete(coachAvailabilityRules).where(and(
          eq(coachAvailabilityRules.coachId, coachId),
          eq(coachAvailabilityRules.dayOfWeek, body.dayOfWeek),
        ));
        await tx.insert(coachAvailabilityRules).values({
          coachId,
          dayOfWeek: body.dayOfWeek,
          startTime: body.startTime,
          endTime: body.endTime,
          isActive: true,
          isFlexible: true,
        });
      });

      res.json({ ok: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      console.error("[coach-availability-admin] full-day", e);
      res.status(500).json({ message: e?.message || "Failed" });
    }
  });
}
