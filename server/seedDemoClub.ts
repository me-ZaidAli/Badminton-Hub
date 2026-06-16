/**
 * seedDemoClub.ts — creates a demo club and 26 demo players in the database
 * based on the matchEngineLab player roster.
 *
 * Run:
 *   npx tsx server/seedDemoClub.ts
 *
 * All demo users are created with password: "demo123"
 * Emails follow the pattern: alice@demo.club, ben@demo.club, etc.
 */

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db, pool } from "./db";
import { users, clubs, playerProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// ─── Demo players — mirrors matchEngineLab roster ─────────────────────────────
// Grades: A1–A3, B1–B3, C1–C3, D1–D3
// Genders: ~27% female (7/26), spread across the roster
const DEMO_PLAYERS: { name: string; grade: string; gender: "MALE" | "FEMALE" }[] = [
  { name: "Alice",   grade: "A1", gender: "FEMALE" },
  { name: "Ben",     grade: "A1", gender: "MALE"   },
  { name: "Chloe",   grade: "A2", gender: "FEMALE" },
  { name: "David",   grade: "A3", gender: "MALE"   },
  { name: "Emma",    grade: "B1", gender: "FEMALE" },
  { name: "Finn",    grade: "B1", gender: "MALE"   },
  { name: "Grace",   grade: "B2", gender: "FEMALE" },
  { name: "Harry",   grade: "B2", gender: "MALE"   },
  { name: "Isla",    grade: "B2", gender: "FEMALE" },
  { name: "Jack",    grade: "B3", gender: "MALE"   },
  { name: "Katie",   grade: "B3", gender: "FEMALE" },
  { name: "Liam",    grade: "C1", gender: "MALE"   },
  { name: "Mia",     grade: "C1", gender: "FEMALE" },
  { name: "Noah",    grade: "C1", gender: "MALE"   },
  { name: "Olivia",  grade: "C2", gender: "FEMALE" },
  { name: "Paul",    grade: "C2", gender: "MALE"   },
  { name: "Quinn",   grade: "C2", gender: "MALE"   },
  { name: "Rose",    grade: "C3", gender: "FEMALE" },
  { name: "Sam",     grade: "C3", gender: "MALE"   },
  { name: "Tara",    grade: "C3", gender: "FEMALE" },
  { name: "Uma",     grade: "D1", gender: "FEMALE" },
  { name: "Victor",  grade: "D1", gender: "MALE"   },
  { name: "Wendy",   grade: "D2", gender: "FEMALE" },
  { name: "Xander",  grade: "D2", gender: "MALE"   },
  { name: "Yara",    grade: "D3", gender: "FEMALE" },
  { name: "Zoe",     grade: "D3", gender: "FEMALE" },
  // 20 extra male-only players
  { name: "Aaron",   grade: "A2", gender: "MALE"   },
  { name: "Blake",   grade: "A3", gender: "MALE"   },
  { name: "Caleb",   grade: "B1", gender: "MALE"   },
  { name: "Derek",   grade: "B1", gender: "MALE"   },
  { name: "Ethan",   grade: "B2", gender: "MALE"   },
  { name: "Felix",   grade: "B2", gender: "MALE"   },
  { name: "George",  grade: "B3", gender: "MALE"   },
  { name: "Henry",   grade: "B3", gender: "MALE"   },
  { name: "Ivan",    grade: "C1", gender: "MALE"   },
  { name: "James",   grade: "C1", gender: "MALE"   },
  { name: "Kyle",    grade: "C2", gender: "MALE"   },
  { name: "Leon",    grade: "C2", gender: "MALE"   },
  { name: "Marcus",  grade: "C2", gender: "MALE"   },
  { name: "Nate",    grade: "C3", gender: "MALE"   },
  { name: "Omar",    grade: "C3", gender: "MALE"   },
  { name: "Pete",    grade: "C3", gender: "MALE"   },
  { name: "Rhys",    grade: "D1", gender: "MALE"   },
  { name: "Scott",   grade: "D2", gender: "MALE"   },
  { name: "Tyler",   grade: "D2", gender: "MALE"   },
  { name: "Usman",   grade: "D3", gender: "MALE"   },
];

function gradeToCategory(grade: string): "A" | "B" | "C" | "D" {
  const letter = grade[0];
  if (letter === "A") return "A";
  if (letter === "B") return "B";
  if (letter === "C") return "C";
  return "D";
}

const DEMO_PASSWORD   = "demo123";
const DEMO_CLUB_SLUG  = "demo-club";
const OWNER_EMAIL     = "Bpgbirmingham@gmail.com"; // super admin created on first server start

async function main() {
  console.log("🚀 Seeding demo club and players...\n");

  // 1. Resolve the owner (super admin must exist)
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, OWNER_EMAIL))
    .limit(1);

  if (!owner) {
    console.error(
      `❌ Super admin (${OWNER_EMAIL}) not found.\n` +
      "   Start the server once first so the super admin account gets created, then re-run this script."
    );
    process.exit(1);
  }

  // 2. Find or create the demo club
  let [demoClub] = await db
    .select()
    .from(clubs)
    .where(eq(clubs.slug, DEMO_CLUB_SLUG))
    .limit(1);

  if (demoClub) {
    console.log(`ℹ️  Club already exists: "${demoClub.name}" (id: ${demoClub.id})\n`);
  } else {
    [demoClub] = await db
      .insert(clubs)
      .values({
        name: "Demo Club",
        slug: DEMO_CLUB_SLUG,
        ownerId: owner.id,
        status: "APPROVED",
        isActive: true,
        planType: "PREMIUM",
        planStatus: "ACTIVE_PREMIUM",
        premiumEndDate: new Date("2099-01-01"),
        hasSocialGames: true,
      } as any)
      .returning();
    console.log(`✅ Created club: "${demoClub.name}" (id: ${demoClub.id})\n`);
  }

  // 3. Create users + player profiles
  const hashedPassword = await hashPassword(DEMO_PASSWORD);
  let created = 0;
  let skipped = 0;

  for (const p of DEMO_PLAYERS) {
    const email = `${p.name.toLowerCase()}@demo.club`;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      // Check if a profile already exists for this club too
      const [existingProfile] = await db
        .select({ id: playerProfiles.id })
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, existing.id))
        .limit(1);

      if (existingProfile) {
        console.log(`  skip  ${p.name.padEnd(8)} — user + profile already exist`);
        skipped++;
        continue;
      }

      // User exists but profile doesn't — create the profile
      await db.insert(playerProfiles).values({
        userId: existing.id,
        clubId: demoClub.id,
        clubRole: "PLAYER",
        membershipStatus: "APPROVED",
        playerStatus: "ACTIVE",
        gender: p.gender,
        category: gradeToCategory(p.grade),
        grade: p.grade,
      });
      console.log(`  ✅ ${p.name.padEnd(8)} — profile created (user existed)`);
      created++;
      continue;
    }

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        fullName: p.name,
        email,
        password: hashedPassword,
        role: "PLAYER",
        accountStatus: "APPROVED",
        emailVerified: true,
        gender: p.gender,
      } as any)
      .returning();

    // Create player profile
    await db.insert(playerProfiles).values({
      userId: newUser.id,
      clubId: demoClub.id,
      clubRole: "PLAYER",
      membershipStatus: "APPROVED",
      playerStatus: "ACTIVE",
      gender: p.gender,
      category: gradeToCategory(p.grade),
      grade: p.grade,
    });

    console.log(`  ✅ ${p.name.padEnd(8)} grade: ${p.grade.padEnd(3)}  gender: ${p.gender}`);
    created++;
  }

  console.log(`\n────────────────────────────────────`);
  console.log(`  Created : ${created}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Club ID : ${demoClub.id}`);
  console.log(`  Password: "${DEMO_PASSWORD}" (all demo users)`);
  console.log(`────────────────────────────────────\n`);

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
