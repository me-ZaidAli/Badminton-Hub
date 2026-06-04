/**
 * Regression test — match-scoped pairs must always flow into the club dashboard.
 *
 * Guards the behaviour described in replit.md / Task: pairs built per match
 * (`bsl_teams.bsl_fixture_id` set) must count toward a club's pair total and
 * appear in every team display alongside legacy club-level pairs
 * (`bsl_fixture_id IS NULL`). Both `GET /api/bsl/my-club` and
 * `GET /api/bsl/admin/clubs/:id/manager-view` query teams with
 * `eq(bslTeams.bslClubId, club.id)` and NO `isNull(bslTeams.bslFixtureId)`
 * filter — if anyone re-adds that filter, match pairs silently vanish from the
 * totals. This test fails loudly if that happens.
 *
 * Run with:  npx tsx server/__tests__/bsl-match-pairs.test.ts
 */
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { db } from "../db";
import { registerBslRoutes } from "../bsl-routes";
import { bslClubs, bslTeams, bslFixtures, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const stamp = Date.now();
  const created: {
    userId?: number;
    clubId?: number;
    fixtureId?: number;
    teamIds: number[];
  } = { teamIds: [] };

  // --- Build a tiny Express app with the real BSL routes + a stub auth that
  // impersonates an OWNER who manages the seeded club. ---
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: created.userId, role: "OWNER" };
    (req as any).isAuthenticated = () => true;
    next();
  });
  registerBslRoutes(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // --- Seed: user → club (managed by user) → fixture → two teams. ---
    const [user] = await db
      .insert(users)
      .values({
        fullName: "Regression Owner",
        email: `regression-owner-${stamp}@example.test`,
        password: "x",
        role: "OWNER",
      })
      .returning();
    created.userId = user.id;

    const [club] = await db
      .insert(bslClubs)
      .values({
        name: `Regression Club ${stamp}`,
        managerUserId: user.id,
        division: "Division 1",
        paymentReference: `BSL-REG-${stamp}`,
        status: "ACTIVE",
      })
      .returning();
    created.clubId = club.id;

    const [fixture] = await db.insert(bslFixtures).values({}).returning();
    created.fixtureId = fixture.id;

    // Legacy club-level pair (bslFixtureId IS NULL).
    const [legacyTeam] = await db
      .insert(bslTeams)
      .values({
        bslClubId: club.id,
        bslFixtureId: null,
        name: "Legacy Pair",
        division: "Division 1",
        category: "MD",
      })
      .returning();
    created.teamIds.push(legacyTeam.id);

    // Match-scoped pair (bslFixtureId set) — the one that used to be filtered out.
    const [matchTeam] = await db
      .insert(bslTeams)
      .values({
        bslClubId: club.id,
        bslFixtureId: fixture.id,
        name: "Match Pair",
        division: "Division 1",
        category: "MD",
      })
      .returning();
    created.teamIds.push(matchTeam.id);

    // --- GET /api/bsl/my-club ---
    const myClubRes = await fetch(`${base}/api/bsl/my-club`);
    assert.equal(myClubRes.status, 200, "my-club should respond 200");
    const myClub: any = await myClubRes.json();

    const myClubTeamIds = (myClub.teams || []).map((t: any) => t.id);
    assert.ok(
      myClubTeamIds.includes(matchTeam.id),
      "my-club teams must include the match-scoped pair (bslFixtureId set)",
    );
    assert.ok(
      myClubTeamIds.includes(legacyTeam.id),
      "my-club teams must include the legacy club-level pair",
    );
    assert.equal(
      myClub.summary?.pairs,
      2,
      "my-club summary.pairs must count both the legacy and match-scoped pairs",
    );

    // --- GET /api/bsl/admin/clubs/:id/manager-view ---
    const mvRes = await fetch(`${base}/api/bsl/admin/clubs/${club.id}/manager-view`);
    assert.equal(mvRes.status, 200, "manager-view should respond 200");
    const mv: any = await mvRes.json();

    const mvTeamIds = (mv.teams || []).map((t: any) => t.id);
    assert.ok(
      mvTeamIds.includes(matchTeam.id),
      "manager-view teams must include the match-scoped pair (bslFixtureId set)",
    );
    assert.ok(
      mvTeamIds.includes(legacyTeam.id),
      "manager-view teams must include the legacy club-level pair",
    );
    assert.equal(
      mv.summary?.pairs,
      2,
      "manager-view summary.pairs must count both the legacy and match-scoped pairs",
    );

    console.log("PASS — match-scoped pairs surface in my-club and manager-view totals");
  } finally {
    // --- Cleanup (FK-safe order). ---
    if (created.teamIds.length) {
      for (const id of created.teamIds) {
        await db.delete(bslTeams).where(eq(bslTeams.id, id)).catch(() => {});
      }
    }
    if (created.fixtureId != null) {
      await db.delete(bslFixtures).where(eq(bslFixtures.id, created.fixtureId)).catch(() => {});
    }
    if (created.clubId != null) {
      await db.delete(bslClubs).where(eq(bslClubs.id, created.clubId)).catch(() => {});
    }
    if (created.userId != null) {
      await db.delete(users).where(eq(users.id, created.userId)).catch(() => {});
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAIL —", err?.message || err);
    process.exit(1);
  });
