import type { Express } from "express";
import { db } from "./db";
import { stepEntries } from "@shared/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const upsertSchema = z.object({
  date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
  steps: z.number().int().min(0).max(200000),
});

export function registerStepsRoutes(app: Express) {
  app.get("/api/steps/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = req.user!.id;
      const from = typeof req.query.from === "string" && dateRegex.test(req.query.from) ? req.query.from : undefined;
      const to = typeof req.query.to === "string" && dateRegex.test(req.query.to) ? req.query.to : undefined;
      const conds = [eq(stepEntries.userId, userId)];
      if (from) conds.push(gte(stepEntries.date, from));
      if (to) conds.push(lte(stepEntries.date, to));
      const rows = await db.select().from(stepEntries).where(and(...conds)).orderBy(desc(stepEntries.date)).limit(400);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load step entries" });
    }
  });

  app.post("/api/steps/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = upsertSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid step entry" });
      }
      const userId = req.user!.id;
      const { date, steps } = parsed.data;
      const [row] = await db
        .insert(stepEntries)
        .values({ userId, date, steps, source: "manual" })
        .onConflictDoUpdate({
          target: [stepEntries.userId, stepEntries.date],
          set: { steps, source: "manual", updatedAt: new Date() },
        })
        .returning();
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to save step entry" });
    }
  });

  app.get("/api/steps/me/summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = req.user!.id;
      const today = todayISO();
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 29);
      const fromISO = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, "0")}-${String(monthAgo.getDate()).padStart(2, "0")}`;
      const rows = await db
        .select()
        .from(stepEntries)
        .where(and(eq(stepEntries.userId, userId), gte(stepEntries.date, fromISO)))
        .orderBy(desc(stepEntries.date));

      const byDate = new Map<string, number>();
      for (const r of rows) byDate.set(r.date, r.steps);

      const last7: Array<{ date: string; steps: number }> = [];
      const last30: Array<{ date: string; steps: number }> = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const steps = byDate.get(iso) ?? 0;
        const entry = { date: iso, steps };
        last30.push(entry);
        if (i < 7) last7.push(entry);
      }

      const todaySteps = byDate.get(today) ?? 0;
      const weekTotal = last7.reduce((s, r) => s + r.steps, 0);
      const monthTotal = last30.reduce((s, r) => s + r.steps, 0);
      const weekAvg = Math.round(weekTotal / 7);
      const monthAvg = Math.round(monthTotal / 30);

      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if ((byDate.get(iso) ?? 0) > 0) streak++;
        else if (i > 0) break;
      }

      res.json({
        todaySteps,
        weekTotal,
        weekAvg,
        monthTotal,
        monthAvg,
        streak,
        last7: last7.reverse(),
        last30: last30.reverse(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load steps summary" });
    }
  });
}
