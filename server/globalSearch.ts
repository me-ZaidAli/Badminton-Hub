// Universal Global Search — returns DB-backed results scoped to the
// authenticated user's permissions. The frontend separately searches the
// (already role-filtered) sidebar nav for pages/menus, so this endpoint only
// needs to handle records: clubs, players, sessions, venues, tournaments.
//
// Permission model:
//   OWNER / ADMIN  → searches everything system-wide.
//   Everyone else  → restricted to clubs they are an APPROVED member of.
//                    Players are NEVER returned for non-admins (privacy).

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { and, eq, ilike, inArray, or, sql, desc } from "drizzle-orm";
import {
  clubs,
  users,
  playerProfiles,
  sessions,
  venues,
  tournaments,
} from "@shared/schema";

export type GlobalSearchHit = {
  id: number | string;
  title: string;
  subtitle?: string;
  href: string;
};

export type GlobalSearchResponse = {
  clubs: GlobalSearchHit[];
  players: GlobalSearchHit[];
  sessions: GlobalSearchHit[];
  venues: GlobalSearchHit[];
  tournaments: GlobalSearchHit[];
};

const EMPTY: GlobalSearchResponse = {
  clubs: [],
  players: [],
  sessions: [],
  venues: [],
  tournaments: [],
};

async function getAccessibleClubIds(userId: number, role: string): Promise<number[] | null> {
  // null = unrestricted (admin/owner — search all clubs)
  if (role === "OWNER" || role === "ADMIN") return null;
  const rows = await db.select({ clubId: playerProfiles.clubId })
    .from(playerProfiles)
    .where(and(
      eq(playerProfiles.userId, userId),
      eq(playerProfiles.membershipStatus, "APPROVED"),
    ));
  return Array.from(new Set(rows.map(r => r.clubId)));
}

function fmtSessionDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function registerGlobalSearchRoute(app: Express) {
  app.get("/api/global-search", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const raw = String(req.query.q ?? "").trim();
    if (raw.length < 2) return res.json(EMPTY);
    // Keep payload light + responsive — cap term length and per-bucket rows.
    const q = raw.slice(0, 64);
    const like = `%${q}%`;
    const PER_BUCKET = 6;

    const userId = req.user!.id;
    const role = req.user!.role;
    const isAdmin = role === "OWNER" || role === "ADMIN";

    try {
      const accessibleClubIds = await getAccessibleClubIds(userId, role);
      // Non-admin with no club memberships → nothing to search.
      if (!isAdmin && (!accessibleClubIds || accessibleClubIds.length === 0)) {
        return res.json(EMPTY);
      }

      // --- CLUBS ---
      const clubsQ = db.select({
        id: clubs.id,
        name: clubs.name,
        city: clubs.city,
      }).from(clubs)
        .where(
          isAdmin
            ? ilike(clubs.name, like)
            : and(
                inArray(clubs.id, accessibleClubIds!),
                ilike(clubs.name, like),
              )
        )
        .limit(PER_BUCKET);

      // --- VENUES ---
      const venuesQ = db.select({
        id: venues.id,
        name: venues.name,
        address: venues.address,
        clubId: venues.clubId,
      }).from(venues)
        .where(
          isAdmin
            ? ilike(venues.name, like)
            : and(
                inArray(venues.clubId, accessibleClubIds!),
                ilike(venues.name, like),
              )
        )
        .limit(PER_BUCKET);

      // --- TOURNAMENTS ---
      const tournamentsQ = db.select({
        id: tournaments.id,
        name: tournaments.name,
        startDate: tournaments.startDate,
        clubId: tournaments.clubId,
      }).from(tournaments)
        .where(
          isAdmin
            ? ilike(tournaments.name, like)
            : and(
                inArray(tournaments.clubId, accessibleClubIds!),
                ilike(tournaments.name, like),
              )
        )
        .orderBy(desc(tournaments.startDate))
        .limit(PER_BUCKET);

      // --- SESSIONS ---
      const sessionsQ = db.select({
        id: sessions.id,
        title: sessions.title,
        date: sessions.date,
        clubId: sessions.clubId,
      }).from(sessions)
        .where(
          isAdmin
            ? ilike(sessions.title, like)
            : and(
                inArray(sessions.clubId, accessibleClubIds!),
                ilike(sessions.title, like),
              )
        )
        .orderBy(desc(sessions.date))
        .limit(PER_BUCKET);

      // --- PLAYERS --- (admin only — privacy)
      const playersQ = isAdmin
        ? db.selectDistinct({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            role: users.role,
          }).from(users)
            .where(and(
              or(
                ilike(users.fullName, like),
                ilike(users.email, like),
              ),
              // exclude OWNER/ADMIN from generic "players" bucket — they're
              // usually surfaced via other surfaces
              sql`${users.role} NOT IN ('OWNER')`,
            ))
            .limit(PER_BUCKET)
        : Promise.resolve([] as { id: number; fullName: string; email: string; role: string }[]);

      const [clubRows, venueRows, tournamentRows, sessionRows, playerRows] =
        await Promise.all([clubsQ, venuesQ, tournamentsQ, sessionsQ, playersQ]);

      // NOTE: hrefs MUST match real routes in client/src/App.tsx. There is no
      // /clubs/:id detail page and no /admin/users/:id route, so we send the
      // user to the relevant LIST page where the surfaced record can be
      // located. Sessions, tournaments and venues have direct/list routes.
      const out: GlobalSearchResponse = {
        clubs: clubRows.map(c => ({
          id: c.id,
          title: c.name,
          subtitle: c.city ?? "Club",
          href: `/clubs`,
        })),
        venues: venueRows.map(v => ({
          id: v.id,
          title: v.name,
          subtitle: v.address ?? "Venue",
          href: `/admin/venues`,
        })),
        tournaments: tournamentRows.map(t => ({
          id: t.id,
          title: t.name,
          subtitle: fmtSessionDate(t.startDate as any) || "Tournament",
          href: `/tournaments/${t.id}`,
        })),
        sessions: sessionRows.map(s => ({
          id: s.id,
          title: s.title || `Session ${s.id}`,
          subtitle: fmtSessionDate(s.date as any) || "Session",
          href: `/sessions/${s.id}`,
        })),
        players: playerRows.map(p => ({
          id: p.id,
          title: p.fullName,
          subtitle: p.email || p.role,
          href: `/admin/players`,
        })),
      };

      // Ranking inside each bucket: starts-with > contains. (DB-side LIKE
      // already restricted to contains; this re-orders within results.)
      const qLower = q.toLowerCase();
      const rank = (hit: GlobalSearchHit) =>
        hit.title.toLowerCase().startsWith(qLower) ? 0 : 1;
      (Object.keys(out) as (keyof GlobalSearchResponse)[]).forEach(k => {
        out[k] = [...out[k]].sort((a, b) => rank(a) - rank(b));
      });

      res.json(out);
    } catch (err: any) {
      console.error("[global-search] error:", err?.message || err);
      res.status(500).json({ message: "Search failed" });
    }
  });
}
