import type { Express, Request, Response, NextFunction } from "express";
import { eq, and, desc, asc, gte, lte, sql as dsql, ne } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  coaches,
  coachAvailabilityRules,
  coachAvailabilityOverrides,
  coachBookingSettings,
  coachGalleryImages,
  lessonRequests,
  users,
  notifications,
} from "@shared/schema";
import { sendRulePush } from "./notificationRules";
import { storage } from "./storage";

// ── Local upload (gallery images reuse /public/uploads/coaches/) ─────────────
const galleryDir = path.join(process.cwd(), "public", "uploads", "coaches", "gallery");
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
const galleryUpload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, galleryDir),
    filename: (_r, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => {
    if (f.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ── Auth helpers ─────────────────────────────────────────────────────────────
function authed(req: Request) {
  return !!(req as any).isAuthenticated?.() && !!(req as any).user;
}
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!authed(req)) return res.status(401).json({ message: "Not authenticated" });
  next();
}
function isAdminish(u: any) {
  return u?.role === "OWNER" || u?.role === "ADMIN";
}

async function getMyCoach(userId: number) {
  const rows = await db.select().from(coaches).where(eq(coaches.userId, userId)).limit(1);
  return rows[0] || null;
}

// ── Slot generation (Europe/London anchored) ─────────────────────────────────
// Uses simple "minutes from midnight" math against a YYYY-MM-DD; the calendar
// UI sends booking date + slot HH:MM and we resolve to a JS Date in the
// caller's timezone. Server stores resolved start/end as timestamptz.

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(m: number): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

type Slot = { time: string; available: boolean; reason?: string };

async function generateSlotsForDate(coachId: number, dateStr: string): Promise<Slot[]> {
  // 1. resolve settings
  const [settings] = await db
    .select()
    .from(coachBookingSettings)
    .where(eq(coachBookingSettings.coachId, coachId));
  const slotDur = settings?.slotDurationMinutes ?? 60;
  const buffBefore = settings?.bufferBeforeMinutes ?? 0;
  const buffAfter = settings?.bufferAfterMinutes ?? 15;
  const advanceNoticeHrs = settings?.advanceNoticeHours ?? 12;
  const maxAdvanceDays = settings?.maxAdvanceDays ?? 60;
  const holidayMode = settings?.holidayMode ?? false;
  if (holidayMode) return [];

  // 2. Bounds checks
  const today = new Date();
  const target = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86400000);
  if (diffDays > maxAdvanceDays) return [];

  // 3. Day of week
  const dow = target.getDay(); // 0..6

  // 4. Override (closed?)
  const [override] = await db
    .select()
    .from(coachAvailabilityOverrides)
    .where(and(eq(coachAvailabilityOverrides.coachId, coachId), eq(coachAvailabilityOverrides.date, dateStr)));
  if (override?.isClosed) return [];

  // 5. Time windows
  let windows: { start: string; end: string }[] = [];
  if (override && override.startTime && override.endTime) {
    windows = [{ start: override.startTime, end: override.endTime }];
  } else {
    const rules = await db
      .select()
      .from(coachAvailabilityRules)
      .where(and(eq(coachAvailabilityRules.coachId, coachId), eq(coachAvailabilityRules.dayOfWeek, dow), eq(coachAvailabilityRules.isActive, true)));
    windows = rules.map((r) => ({ start: r.startTime, end: r.endTime }));
  }
  if (windows.length === 0) return [];

  // 6. Existing bookings on this date (block PENDING + APPROVED)
  const dayStart = new Date(`${dateStr}T00:00:00Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59Z`);
  const bookings = await db
    .select()
    .from(lessonRequests)
    .where(
      and(
        eq(lessonRequests.coachId, coachId),
        gte(lessonRequests.startTime, dayStart),
        lte(lessonRequests.startTime, dayEnd),
      ),
    );
  const blockedRanges = bookings
    .filter((b) => ["PENDING", "ACCEPTED", "APPROVED"].includes(b.status as string))
    .map((b) => {
      const t = new Date(b.startTime as any);
      const start = t.getUTCHours() * 60 + t.getUTCMinutes();
      const end = start + (b.durationMinutes || slotDur) + buffAfter;
      return { start: Math.max(0, start - buffBefore), end };
    });

  // 7. Build slot grid
  const slots: Slot[] = [];
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const isToday = diffDays === 0;
  const noticeBlock = isToday ? nowMin + advanceNoticeHrs * 60 : -1;

  for (const w of windows) {
    let cur = timeToMinutes(w.start);
    const endM = timeToMinutes(w.end);
    while (cur + slotDur <= endM) {
      const slotEnd = cur + slotDur;
      const conflicts = blockedRanges.some((b) => cur < b.end && slotEnd > b.start);
      let reason: string | undefined;
      if (conflicts) reason = "Booked";
      else if (noticeBlock >= 0 && cur < noticeBlock) reason = "Too soon";
      slots.push({ time: minutesToTime(cur), available: !reason, reason });
      cur += slotDur;
    }
  }
  return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
export function registerCoachBookingRoutes(app: Express) {
  // Helper used inline by several routes
  async function notifyNewBooking(coachUserId: number, playerName: string, dateLabel: string) {
    try {
      await sendRulePush("coachLessonRequested", [coachUserId], { playerName, date: dateLabel }, { url: "/coach-dashboard", inApp: true });
    } catch {}
  }

  // ── COACH SELF: Availability rules CRUD ──────────────────────────────────
  app.get("/api/coach-bookings/availability/rules", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    const rules = await db
      .select()
      .from(coachAvailabilityRules)
      .where(eq(coachAvailabilityRules.coachId, coach.id))
      .orderBy(asc(coachAvailabilityRules.dayOfWeek), asc(coachAvailabilityRules.startTime));
    res.json(rules);
  });

  app.post("/api/coach-bookings/availability/rules", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    const { dayOfWeek, startTime, endTime } = req.body;
    if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) return res.status(400).json({ message: "dayOfWeek 0-6 required" });
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return res.status(400).json({ message: "HH:MM times required" });
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) return res.status(400).json({ message: "End must be after start" });
    const [row] = await db.insert(coachAvailabilityRules).values({ coachId: coach.id, dayOfWeek, startTime, endTime }).returning();
    res.status(201).json(row);
  });

  app.delete("/api/coach-bookings/availability/rules/:id", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    await db.delete(coachAvailabilityRules).where(and(eq(coachAvailabilityRules.id, Number(req.params.id)), eq(coachAvailabilityRules.coachId, coach.id)));
    res.json({ ok: true });
  });

  // ── COACH SELF: Date overrides CRUD ──────────────────────────────────────
  app.get("/api/coach-bookings/availability/overrides", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    const rows = await db
      .select()
      .from(coachAvailabilityOverrides)
      .where(eq(coachAvailabilityOverrides.coachId, coach.id))
      .orderBy(asc(coachAvailabilityOverrides.date));
    res.json(rows);
  });

  app.post("/api/coach-bookings/availability/overrides", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    const { date, isClosed, startTime, endTime, note } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "date YYYY-MM-DD required" });
    if (!isClosed) {
      if (!/^\d{2}:\d{2}$/.test(startTime || "") || !/^\d{2}:\d{2}$/.test(endTime || ""))
        return res.status(400).json({ message: "startTime and endTime required when not closed" });
    }
    const [row] = await db
      .insert(coachAvailabilityOverrides)
      .values({ coachId: coach.id, date, isClosed: !!isClosed, startTime: isClosed ? null : startTime, endTime: isClosed ? null : endTime, note: note || null })
      .returning();
    res.status(201).json(row);
  });

  app.delete("/api/coach-bookings/availability/overrides/:id", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    await db.delete(coachAvailabilityOverrides).where(and(eq(coachAvailabilityOverrides.id, Number(req.params.id)), eq(coachAvailabilityOverrides.coachId, coach.id)));
    res.json({ ok: true });
  });

  // ── COACH SELF: Settings GET/PUT ─────────────────────────────────────────
  app.get("/api/coach-bookings/settings", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    let [row] = await db.select().from(coachBookingSettings).where(eq(coachBookingSettings.coachId, coach.id));
    if (!row) {
      [row] = await db.insert(coachBookingSettings).values({ coachId: coach.id }).returning();
    }
    res.json(row);
  });

  app.put("/api/coach-bookings/settings", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    const allowed = ["slotDurationMinutes", "bufferBeforeMinutes", "bufferAfterMinutes", "advanceNoticeHours", "maxAdvanceDays", "holidayMode", "holidayMessage", "defaultPricePence", "autoApprove"] as const;
    const updates: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    updates.updatedAt = new Date();
    let [row] = await db.select().from(coachBookingSettings).where(eq(coachBookingSettings.coachId, coach.id));
    if (!row) {
      [row] = await db.insert(coachBookingSettings).values({ coachId: coach.id, ...updates }).returning();
    } else {
      [row] = await db.update(coachBookingSettings).set(updates).where(eq(coachBookingSettings.coachId, coach.id)).returning();
    }
    res.json(row);
  });

  // ── COACH SELF: Gallery ──────────────────────────────────────────────────
  app.get("/api/coach-bookings/gallery/me", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    const rows = await db.select().from(coachGalleryImages).where(eq(coachGalleryImages.coachId, coach.id)).orderBy(asc(coachGalleryImages.sortOrder), asc(coachGalleryImages.id));
    res.json(rows);
  });

  app.post("/api/coach-bookings/gallery/upload", requireAuth, galleryUpload.single("photo"), async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    if (!req.file) return res.status(400).json({ message: "No file" });
    const url = `/uploads/coaches/gallery/${req.file.filename}`;
    const [row] = await db.insert(coachGalleryImages).values({ coachId: coach.id, imageUrl: url, caption: req.body.caption || null, sortOrder: 0 }).returning();
    res.status(201).json(row);
  });

  app.delete("/api/coach-bookings/gallery/:id", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.status(404).json({ message: "Not a coach" });
    await db.delete(coachGalleryImages).where(and(eq(coachGalleryImages.id, Number(req.params.id)), eq(coachGalleryImages.coachId, coach.id)));
    res.json({ ok: true });
  });

  // ── PUBLIC: Coach availability slots for a given date ────────────────────
  app.get("/api/coaches/:id/availability-slots", async (req, res) => {
    const coachId = Number(req.params.id);
    const date = String(req.query.date || "");
    if (!coachId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "id + date YYYY-MM-DD required" });
    const slots = await generateSlotsForDate(coachId, date);
    res.json({ date, slots });
  });

  // ── PUBLIC: Coach availability rules + settings (read-only summary) ──────
  app.get("/api/coaches/:id/availability-summary", async (req, res) => {
    const coachId = Number(req.params.id);
    const [c] = await db.select().from(coaches).where(eq(coaches.id, coachId));
    if (!c || c.status !== "APPROVED") return res.status(404).json({ message: "Coach not found" });
    const [settings] = await db.select().from(coachBookingSettings).where(eq(coachBookingSettings.coachId, coachId));
    const rules = await db.select().from(coachAvailabilityRules).where(and(eq(coachAvailabilityRules.coachId, coachId), eq(coachAvailabilityRules.isActive, true)));
    const gallery = await db.select().from(coachGalleryImages).where(eq(coachGalleryImages.coachId, coachId)).orderBy(asc(coachGalleryImages.sortOrder));
    res.json({
      rules,
      gallery,
      settings: settings ? {
        slotDurationMinutes: settings.slotDurationMinutes,
        advanceNoticeHours: settings.advanceNoticeHours,
        maxAdvanceDays: settings.maxAdvanceDays,
        holidayMode: settings.holidayMode,
        holidayMessage: settings.holidayMessage,
        defaultPricePence: settings.defaultPricePence,
      } : null,
    });
  });

  // ── BOOKING: Create (player) ─────────────────────────────────────────────
  app.post("/api/coach-bookings", requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).user.id;
      const { coachId, date, time, durationMinutes, lessonType, location, playerMessage } = req.body;
      if (!coachId || !date || !time) return res.status(400).json({ message: "coachId, date, time required" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
        return res.status(400).json({ message: "Invalid date/time format" });

      const [coach] = await db.select().from(coaches).where(and(eq(coaches.id, Number(coachId)), eq(coaches.status, "APPROVED")));
      if (!coach) return res.status(404).json({ message: "Coach not available" });

      const [settings] = await db.select().from(coachBookingSettings).where(eq(coachBookingSettings.coachId, coach.id));
      const dur = Number(durationMinutes) || settings?.slotDurationMinutes || 60;

      // Verify slot still free
      const slots = await generateSlotsForDate(coach.id, date);
      const match = slots.find((s) => s.time === time);
      if (!match || !match.available) return res.status(409).json({ message: match?.reason || "Slot not available" });

      // NB: UK-only product. We treat the calendar's HH:MM as a "wall-clock" UK
      // time and store it as a UTC timestamp at that wall-clock value. Since both
      // the slot grid and the conflict check round-trip through getUTCHours()
      // the math is internally consistent. A future Europe/London-aware refactor
      // (luxon or Intl.DateTimeFormat) is needed before going multi-region.
      const startTime = new Date(`${date}T${time}:00.000Z`);
      const endTime = new Date(startTime.getTime() + dur * 60_000);

      const initialStatus = settings?.autoApprove ? "ACCEPTED" : "PENDING";

      // Atomic insert — partial unique index `idx_lesson_requests_active_slot`
      // on (coach_id, start_time) WHERE status IN ('PENDING','ACCEPTED') guards
      // against the slot-check → insert race window. Catch the unique-violation
      // and return 409 so the UI can refresh the slot grid.
      let row;
      try {
        [row] = await db.insert(lessonRequests).values({
          playerId,
          coachId: coach.id,
          startTime,
          endTime,
          preferredDate: date,
          preferredTime: time,
          durationMinutes: dur,
          lessonType: lessonType === "GROUP" ? "GROUP" : "ONE_TO_ONE",
          location: location || null,
          playerMessage: playerMessage || null,
          agreedPrice: settings?.defaultPricePence || null,
          status: initialStatus as any,
        }).returning();
      } catch (e: any) {
        if (e?.code === "23505" || /duplicate key/i.test(String(e?.message))) {
          return res.status(409).json({ message: "That slot was just taken — please pick another." });
        }
        throw e;
      }

      // Notify coach
      await notifyNewBooking(coach.userId, (req as any).user.fullName, `${date} ${time}`);

      // In-app notification too
      try {
        await db.insert(notifications).values({
          userId: coach.userId,
          type: "GENERAL",
          title: initialStatus === "ACCEPTED" ? "New booking (auto-approved)" : "New booking request",
          message: `${(req as any).user.fullName} booked ${date} at ${time}.`,
          linkUrl: "/coach-dashboard",
        });
      } catch {}

      res.status(201).json(row);
    } catch (err: any) {
      console.error("[coach-bookings POST]", err);
      res.status(500).json({ message: err?.message || "Failed to create booking" });
    }
  });

  // ── BOOKING: List for current coach (inbox) ──────────────────────────────
  app.get("/api/coach-bookings/coach", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach) return res.json([]);
    const rows = await db
      .select({ r: lessonRequests, p: users })
      .from(lessonRequests)
      .innerJoin(users, eq(lessonRequests.playerId, users.id))
      .where(eq(lessonRequests.coachId, coach.id))
      .orderBy(desc(lessonRequests.startTime));
    res.json(rows.map((x) => ({ ...x.r, player: { id: x.p.id, fullName: x.p.fullName, email: x.p.email } })));
  });

  // ── BOOKING: List for current player ─────────────────────────────────────
  app.get("/api/coach-bookings/player", requireAuth, async (req, res) => {
    const userId = (req as any).user.id;
    const rows = await db
      .select({ r: lessonRequests, c: coaches })
      .from(lessonRequests)
      .innerJoin(coaches, eq(lessonRequests.coachId, coaches.id))
      .where(eq(lessonRequests.playerId, userId))
      .orderBy(desc(lessonRequests.startTime));
    res.json(rows.map((x) => ({ ...x.r, coach: { id: x.c.id, fullName: x.c.fullName, profilePhoto: x.c.profilePhoto, city: x.c.city, sessionPrices: x.c.sessionPrices } })));
  });

  // ── BOOKING: Coach approves / rejects / completes / no-shows ─────────────
  app.patch("/api/coach-bookings/:id/status", requireAuth, async (req, res) => {
    const coach = await getMyCoach((req as any).user.id);
    if (!coach && !isAdminish((req as any).user)) return res.status(403).json({ message: "Coach only" });
    const id = Number(req.params.id);
    const { status, coachResponse, agreedPrice } = req.body;
    const allowed = ["APPROVED", "REJECTED", "COMPLETED", "NO_SHOW", "CANCELLED"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
    const [b] = await db.select().from(lessonRequests).where(eq(lessonRequests.id, id));
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (coach && b.coachId !== coach.id && !isAdminish((req as any).user)) return res.status(403).json({ message: "Not your booking" });

    // Map APPROVED→ACCEPTED, REJECTED→DECLINED to fit existing enum + add NO_SHOW
    const sqlStatus = status === "APPROVED" ? "ACCEPTED" : status === "REJECTED" ? "DECLINED" : status;

    const updates: any = { status: sqlStatus, updatedAt: new Date() };
    if (coachResponse !== undefined) updates.coachResponse = coachResponse;
    if (agreedPrice !== undefined) updates.agreedPrice = agreedPrice ? Number(agreedPrice) : null;

    const [updated] = await db.update(lessonRequests).set(updates).where(eq(lessonRequests.id, id)).returning();

    // Notify player
    const ruleKey =
      status === "APPROVED" ? "coachLessonApproved" :
      status === "REJECTED" ? "coachLessonRejected" :
      status === "COMPLETED" ? "coachLessonCompleted" :
      status === "NO_SHOW" ? "coachLessonNoShow" :
      null;
    if (ruleKey) {
      try {
        await sendRulePush(ruleKey, [b.playerId], { coachName: coach?.fullName ?? "Coach", date: b.preferredDate, time: b.preferredTime }, { url: "/my-lessons", inApp: true });
      } catch {}
    }

    res.json(updated);
  });

  // ── BOOKING: Player cancels own pending booking ──────────────────────────
  app.patch("/api/coach-bookings/:id/cancel", requireAuth, async (req, res) => {
    const userId = (req as any).user.id;
    const id = Number(req.params.id);
    const [b] = await db.select().from(lessonRequests).where(eq(lessonRequests.id, id));
    if (!b) return res.status(404).json({ message: "Not found" });
    if (b.playerId !== userId) return res.status(403).json({ message: "Not your booking" });
    if (!["PENDING", "ACCEPTED"].includes(b.status as string)) return res.status(400).json({ message: "Cannot cancel this status" });
    const [u] = await db.update(lessonRequests).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(lessonRequests.id, id)).returning();
    // Notify coach
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, b.coachId));
    if (coach) {
      try {
        await db.insert(notifications).values({
          userId: coach.userId, type: "GENERAL",
          title: "Booking cancelled",
          message: `${(req as any).user.fullName} cancelled ${b.preferredDate} at ${b.preferredTime}.`,
          linkUrl: "/coach-dashboard",
        });
      } catch {}
    }
    res.json(u);
  });

  // ── ADMIN: Search users to promote ───────────────────────────────────────
  app.get("/api/admin/users/search-for-coach", requireAuth, async (req, res) => {
    if (!isAdminish((req as any).user)) return res.status(403).json({ message: "Admin only" });
    const q = String(req.query.q || "").trim().toLowerCase();
    if (q.length < 2) return res.json([]);
    const rows = await db.select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role }).from(users)
      .where(dsql`LOWER(${users.fullName}) LIKE ${"%" + q + "%"} OR LOWER(${users.email}) LIKE ${"%" + q + "%"}`)
      .limit(20);
    res.json(rows);
  });

  // ── ADMIN: Grant / revoke COACH role ─────────────────────────────────────
  app.post("/api/admin/users/:id/grant-coach", requireAuth, async (req, res) => {
    if (!isAdminish((req as any).user)) return res.status(403).json({ message: "Admin only" });
    const userId = Number(req.params.id);
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u) return res.status(404).json({ message: "User not found" });
    // Set role
    await db.update(users).set({ role: "COACH" as any }).where(eq(users.id, userId));
    // Ensure coach profile exists
    let coach = await getMyCoach(userId);
    if (!coach) {
      const [c] = await db.insert(coaches).values({
        userId,
        fullName: u.fullName || "Coach",
        email: u.email || `${u.id}@unknown.local`,
        status: "APPROVED",
      }).returning();
      coach = c;
      // seed default settings
      await db.insert(coachBookingSettings).values({ coachId: c.id });
    } else {
      await db.update(coaches).set({ status: "APPROVED" }).where(eq(coaches.id, coach.id));
    }
    try {
      await sendRulePush("coachRoleGranted", [userId], { name: u.fullName || "" }, { url: "/coach-dashboard", inApp: true });
    } catch {}
    res.json({ ok: true, coach });
  });

  app.post("/api/admin/users/:id/revoke-coach", requireAuth, async (req, res) => {
    if (!isAdminish((req as any).user)) return res.status(403).json({ message: "Admin only" });
    const userId = Number(req.params.id);
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u) return res.status(404).json({ message: "User not found" });
    if (u.role === "COACH") await db.update(users).set({ role: "PLAYER" as any }).where(eq(users.id, userId));
    const coach = await getMyCoach(userId);
    if (coach) await db.update(coaches).set({ status: "SUSPENDED" }).where(eq(coaches.id, coach.id));
    res.json({ ok: true });
  });
}
