/**
 * benchmark-v2 — simple simulation for matchEngineV2
 *
 * 30 players, 4 courts, 120-minute session, 10-15 min matches.
 * Tracks games played per player and prints a distribution table.
 *
 * Run:
 *   npx ts-node benchmark-v2.ts
 */

import { generateMatches, Player } from "./matchEngineV2";

// ─── Config ───────────────────────────────────────────────────────────────────
const NUM_PLAYERS = 26;
const NUM_COURTS = 4;
const SESSION_MIN = 120;
const MATCH_MIN = 10;
const MATCH_MAX = 15;

const GRADE_POOL = [
  // High-grade session: A1–B1 only
  ...Array<string>(20).fill("A1"),
  ...Array<string>(20).fill("A2"),
  ...Array<string>(20).fill("A3"),
  ...Array<string>(20).fill("B1"),
  ...Array<string>(20).fill("B2"),
  ...Array<string>(20).fill("B2"),
];

const NAMES = [
  "Alice",
  "Ben",
  "Chloe",
  "David",
  "Emma",
  "Finn",
  "Grace",
  "Harry",
  "Isla",
  "Jack",
  "Katie",
  "Liam",
  "Mia",
  "Noah",
  "Olivia",
  "Paul",
  "Quinn",
  "Rose",
  "Sam",
  "Tara",
  "Uma",
  "Victor",
  "Wendy",
  "Xander",
  "Yara",
  "Zoe",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function bar(n: number, max: number, width = 40): string {
  const filled = max > 0 ? Math.round((n / max) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
}

// ─── Build players ────────────────────────────────────────────────────────────
// Female count is fixed to exactly 20–25% of the roster each run.
const femaleCount = randInt(Math.ceil(NUM_PLAYERS * 0.20), Math.floor(NUM_PLAYERS * 0.25));
const genderPool  = [
  ...Array<string>(femaleCount).fill("FEMALE"),
  ...Array<string>(NUM_PLAYERS - femaleCount).fill("MALE"),
];
// Shuffle so females are spread randomly across IDs
for (let i = genderPool.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [genderPool[i], genderPool[j]] = [genderPool[j], genderPool[i]];
}

const players: Player[] = Array.from({ length: NUM_PLAYERS }, (_, i) => ({
  id: i + 1,
  grade: GRADE_POOL[randInt(0, GRADE_POOL.length - 1)],
  gender: genderPool[i],
  isPaused: false,
}));

const nameOf = (id: number) => NAMES[(id - 1) % NAMES.length];
const gamesPlayed = new Map<number, number>(players.map((p) => [p.id, 0]));
const partnerHistory = new Map<string, number>();
const uniquePartners = new Map<number, Set<number>>(players.map((p) => [p.id, new Set<number>()]));

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// ─── Court state ──────────────────────────────────────────────────────────────
type Court = { freeAt: number; players: number[] } | null;
const courts: Court[] = Array(NUM_COURTS).fill(null);

// ─── Simulation ───────────────────────────────────────────────────────────────
type MatchLog = {
  num: number;
  tMin: number;
  teamA: { name: string; grade: string; gender: string }[];
  teamB: { name: string; grade: string; gender: string }[];
  gradeSpread: number;
  teamDiff: number;
  repeatsA: number;
  repeatsB: number;
};

const matchLog: MatchLog[] = [];

function gradeRank(grade: string | null): number {
  if (!grade) return 1;
  // 12-tier numeric sub-grades: A1=12 … D3=1
  const m = grade.match(/^([A-D])([123])$/);
  if (m) {
    const letterRank = ({ A: 3, B: 2, C: 1, D: 0 } as Record<string, number>)[m[1]] ?? 0;
    return letterRank * 3 + (4 - parseInt(m[2], 10));
  }
  // 4-tier fallback
  return ({ A: 4, B: 3, C: 2, D: 1 } as Record<string, number>)[grade] ?? 1;
}

let time = 0;
let totalMatches = 0;
let totalCalls = 0;

// Snapshot every 20 min
const snapshots: { t: number; max: number; min: number; spread: number }[] = [];

function snapshot(t: number) {
  const counts = [...gamesPlayed.values()];
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  snapshots.push({ t, max, min, spread: max - min });
}

while (time < SESSION_MIN) {
  // Release courts whose match has ended
  for (let c = 0; c < NUM_COURTS; c++) {
    if (courts[c] && courts[c]!.freeAt <= time) {
      courts[c] = null;
    }
  }

  const freeCourts = courts.filter((c) => c === null).length;
  if (freeCourts === 0) {
    // Advance time to next court release
    const nextRelease = Math.min(
      ...courts
        .filter((c): c is NonNullable<Court> => c !== null)
        .map((c) => c.freeAt),
    );
    time = nextRelease;
    continue;
  }

  // Build the set of busy players
  const busy = new Set<number>();
  for (const c of courts) {
    if (c) c.players.forEach((id) => busy.add(id));
  }

  const available = players.map((p) => ({ ...p, isPaused: busy.has(p.id) }));

  totalCalls++;
  const result = generateMatches({
    players: available,
    gamesPlayed,
    slotsNeeded: freeCourts,
    gradeSpreadLimit: 5,
    partnerHistory,
  });

  if (result.matches.length === 0) {
    // No matches possible — advance time by 1 min
    time += 1;
    continue;
  }

  // Place matches on free courts
  let ci = 0;
  for (const m of result.matches) {
    while (ci < NUM_COURTS && courts[ci] !== null) ci++;
    if (ci >= NUM_COURTS) break;

    const ids = [
      m.teamAPlayer1Id,
      m.teamAPlayer2Id,
      m.teamBPlayer1Id,
      m.teamBPlayer2Id,
    ];
    const duration = randInt(MATCH_MIN, MATCH_MAX);
    courts[ci] = { freeAt: time + duration, players: ids };

    for (const id of ids) {
      gamesPlayed.set(id, (gamesPlayed.get(id) ?? 0) + 1);
    }

    // Track partner history for repeat-avoidance
    const k1 = pairKey(m.teamAPlayer1Id, m.teamAPlayer2Id);
    const k2 = pairKey(m.teamBPlayer1Id, m.teamBPlayer2Id);
    const repeatsA = partnerHistory.get(k1) ?? 0;
    const repeatsB = partnerHistory.get(k2) ?? 0;
    partnerHistory.set(k1, repeatsA + 1);
    partnerHistory.set(k2, repeatsB + 1);
    uniquePartners.get(m.teamAPlayer1Id)!.add(m.teamAPlayer2Id);
    uniquePartners.get(m.teamAPlayer2Id)!.add(m.teamAPlayer1Id);
    uniquePartners.get(m.teamBPlayer1Id)!.add(m.teamBPlayer2Id);
    uniquePartners.get(m.teamBPlayer2Id)!.add(m.teamBPlayer1Id);

    const pInfo = (id: number) => {
      const p = players.find((x) => x.id === id)!;
      return {
        name: nameOf(id),
        grade: p.grade ?? "?",
        gender: p.gender ?? "MALE",
      };
    };
    const tA = [pInfo(m.teamAPlayer1Id), pInfo(m.teamAPlayer2Id)];
    const tB = [pInfo(m.teamBPlayer1Id), pInfo(m.teamBPlayer2Id)];
    const allRanks = [...tA, ...tB].map((p) => gradeRank(p.grade));
    const spread = Math.max(...allRanks) - Math.min(...allRanks);
    const avgA = (gradeRank(tA[0].grade) + gradeRank(tA[1].grade)) / 2;
    const avgB = (gradeRank(tB[0].grade) + gradeRank(tB[1].grade)) / 2;
    matchLog.push({
      num: totalMatches + 1,
      tMin: time,
      teamA: tA,
      teamB: tB,
      gradeSpread: spread,
      teamDiff: Math.abs(avgA - avgB),
      repeatsA,
      repeatsB,
    });

    totalMatches++;
    ci++;
  }

  // Take a snapshot every 20 min
  const nextSnap = Math.ceil(time / 20) * 20;
  if (nextSnap <= time + 1 && !snapshots.find((s) => s.t === nextSnap)) {
    snapshot(Math.min(nextSnap, time));
  }

  // Advance time to the next event
  const nextRelease = courts
    .filter((c): c is NonNullable<Court> => c !== null)
    .map((c) => c.freeAt)
    .reduce((a, b) => Math.min(a, b), SESSION_MIN);
  time = Math.min(nextRelease, SESSION_MIN);
}

// Final snapshot
snapshot(SESSION_MIN);

// ─── Print results ────────────────────────────────────────────────────────────
const W = 78;
console.log("\n" + "╔" + "═".repeat(W) + "╗");
console.log(
  "║" + "  matchEngineV2 — 120-MIN SESSION SIMULATION".padEnd(W) + "║",
);
console.log("╚" + "═".repeat(W) + "╝\n");

const gradeBuckets = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
const females = players.filter((p) => p.gender === "FEMALE").length;
for (const p of players) {
  const letter = (p.grade ?? "D3")[0];
  gradeBuckets[letter] = (gradeBuckets[letter] || 0) + 1;
}

console.log(
  `  Players: ${NUM_PLAYERS}  |  Courts: ${NUM_COURTS}  |  Match: ${MATCH_MIN}–${MATCH_MAX} min` +
    `  |  Matches played: ${totalMatches}  |  Engine calls: ${totalCalls}`,
);
console.log(
  `  Grades: A×${gradeBuckets["A"] || 0}  B×${gradeBuckets["B"] || 0}  C×${gradeBuckets["C"] || 0}  D×${gradeBuckets["D"] || 0}` +
    `  |  Female: ${females} (${Math.round((females / NUM_PLAYERS) * 100)}%)\n`,
);

// Spread over time
console.log("┌" + "─".repeat(W) + "┐");
console.log(
  "│  SPREAD OVER TIME (max − min games played)" + " ".repeat(W - 43) + "│",
);
console.log(
  "├" +
    "─".repeat(8) +
    "┬" +
    "─".repeat(6) +
    "┬" +
    "─".repeat(6) +
    "┬" +
    "─".repeat(W - 22) +
    "┤",
);
console.log("│  Time  │  Max │  Min │  Spread" + " ".repeat(W - 30) + "│");
console.log(
  "├" +
    "─".repeat(8) +
    "┼" +
    "─".repeat(6) +
    "┼" +
    "─".repeat(6) +
    "┼" +
    "─".repeat(W - 22) +
    "┤",
);
for (const s of snapshots) {
  const assessment =
    s.spread === 0
      ? "Excellent  (equal play)"
      : s.spread === 1
        ? "Excellent  (equal play)"
        : s.spread === 2
          ? "Good       (minor drift)"
          : s.spread === 3
            ? "Moderate   (some inequality)"
            : s.spread === 4
              ? "Poor       (notable imbalance) ⚠"
              : "Critical   (severe failure) ⚠";
  const row = `│ ${String(s.t + "min").padEnd(6)} │ ${String(s.max).padEnd(4)} │ ${String(s.min).padEnd(4)} │ +${s.spread}  ${assessment}`;
  console.log(row.padEnd(W + 1) + "│");
}
console.log("└" + "─".repeat(W) + "┘\n");

// Player distribution
const maxGames = Math.max(...gamesPlayed.values());
console.log("┌" + "─".repeat(W) + "┐");
console.log("│  PLAYER DISTRIBUTION AT SESSION END" + " ".repeat(W - 36) + "│");
console.log(
  "├" +
    "─".repeat(14) +
    "┬" +
    "─".repeat(7) +
    "┬" +
    "─".repeat(8) +
    "┬" +
    "─".repeat(9) +
    "┬" +
    "─".repeat(6) +
    "┬" +
    "─".repeat(W - 47) +
    "┤",
);
console.log(
  "│  Name          │ Grade │ Gender │ Matches │ Uniq │ Bar" +
    " ".repeat(W - 48) +
    "│",
);
console.log(
  "├" +
    "─".repeat(14) +
    "┼" +
    "─".repeat(7) +
    "┼" +
    "─".repeat(8) +
    "┼" +
    "─".repeat(9) +
    "┼" +
    "─".repeat(6) +
    "┼" +
    "─".repeat(W - 47) +
    "┤",
);

const sorted = [...players].sort((a, b) => {
  const ga = gamesPlayed.get(a.id) ?? 0;
  const gb = gamesPlayed.get(b.id) ?? 0;
  return ga - gb;
});

for (const p of sorted) {
  const n = gamesPlayed.get(p.id) ?? 0;
  const nm = nameOf(p.id).padEnd(14);
  const gr = (p.grade ?? "?").padEnd(5);
  const ge = (p.gender === "FEMALE" ? "Female" : "Male  ").padEnd(6);
  const uniq = uniquePartners.get(p.id)?.size ?? 0;
  const b = bar(n, maxGames, 30);
  const tag = n === maxGames ? " ◀ MOST ACTIVE" : "";
  const row = `│ ${nm} │ ${gr} │ ${ge} │ ${String(n).padEnd(7)} │ ${String(uniq).padEnd(4)} │ ${b}${tag}`;
  console.log(row.padEnd(W + 1) + "│");
}
console.log("└" + "─".repeat(W) + "┘");

const counts = [...gamesPlayed.values()];
const max = Math.max(...counts);
const min = Math.min(...counts);
const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
console.log(
  `\n  Final spread: ${max - min}  |  Max: ${max}  Min: ${min}  Avg: ${avg.toFixed(1)}\n`,
);

// ─── Match log ────────────────────────────────────────────────────────────────
function fmtTeam(
  team: { name: string; grade: string; gender: string }[],
): string {
  return team
    .map((p) => `${p.name}(${p.grade}${p.gender === "FEMALE" ? "♀" : ""})`)
    .join(" & ");
}

console.log("\n" + "┌" + "─".repeat(W) + "┐");
console.log("│  ALL MATCHES" + " ".repeat(W - 13) + "│");
console.log(
  "├" +
    "─".repeat(4) +
    "┬" +
    "─".repeat(6) +
    "┬" +
    "─".repeat(28) +
    "┬" +
    "─".repeat(7) +
    "┬" +
    "─".repeat(28) +
    "┬" +
    "─".repeat(W - 77) +
    "┤",
);
console.log(
  "│ #  │  Min │  Team A                      │ Spread│  Team B                      │ Diff" +
    " ".repeat(W - 77) +
    "│",
);
console.log(
  "├" +
    "─".repeat(4) +
    "┼" +
    "─".repeat(6) +
    "┼" +
    "─".repeat(28) +
    "┼" +
    "─".repeat(7) +
    "┼" +
    "─".repeat(28) +
    "┼" +
    "─".repeat(W - 77) +
    "┤",
);
for (const m of matchLog) {
  const num = String(m.num).padEnd(3);
  const t = String(m.tMin + "m").padEnd(5);
  const tA = fmtTeam(m.teamA).padEnd(28);
  const tB = fmtTeam(m.teamB).padEnd(28);
  const spread = ("spread:" + m.gradeSpread).padEnd(6);
  const diff = "diff:" + m.teamDiff.toFixed(1);
  const rpts = `  [A:×${m.repeatsA} B:×${m.repeatsB}]`;
  const flag =
    m.gradeSpread > 3 ? " ⚠ wide" : m.teamDiff > 1.5 ? " ⚠ uneven" : "";
  const row = `│ ${num}│ ${t} │ ${tA} │ ${spread} │ ${tB} │ ${diff}${rpts}${flag}`;
  console.log(row.padEnd(W + 1) + "│");
}
console.log("└" + "─".repeat(W) + "┘\n");

// ─── Summary stats ────────────────────────────────────────────────────────────
const avgSpread =
  matchLog.reduce((s, m) => s + m.gradeSpread, 0) / matchLog.length;
const avgDiff = matchLog.reduce((s, m) => s + m.teamDiff, 0) / matchLog.length;
const wideMatches = matchLog.filter((m) => m.gradeSpread > 3).length;
const unevenMatches = matchLog.filter((m) => m.teamDiff > 1.5).length;
console.log(`  Match quality summary:`);
console.log(`    Avg grade spread : ${avgSpread.toFixed(2)}  (ideal ≤ 3)`);
console.log(`    Avg team diff    : ${avgDiff.toFixed(2)}  (ideal ≤ 1.5)`);
console.log(
  `    Wide matches     : ${wideMatches}/${matchLog.length}  (spread > 3)`,
);
console.log(
  `    Uneven matches   : ${unevenMatches}/${matchLog.length}  (team diff > 1.5)\n`,
);
