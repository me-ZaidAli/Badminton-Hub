import { db } from "./db";
import { juniorSkillCategories, juniorSkills } from "@shared/schema";
import { eq } from "drizzle-orm";

const CATEGORIES_AND_SKILLS = [
  {
    name: "Game Rules",
    iconName: "BookOpen",
    skills: [
      "Doubles rules",
      "Respect for opponent",
    ],
  },
  {
    name: "Warm Up",
    iconName: "Flame",
    skills: [
      "Side by sides",
      "Cross / Split / Scissors",
      "Balance",
    ],
  },
  {
    name: "Physical",
    iconName: "Dumbbell",
    skills: [
      "Resistance",
      "Endurance",
      "Breath",
    ],
  },
  {
    name: "Footwork",
    iconName: "Footprints",
    skills: [
      "Move towards net / Left",
      "Move towards net / Right",
      "Mid court moves / Left",
      "Mid court moves / Right",
      "Move back / Left",
      "Move back / Right",
      "Hit move forward",
      "Position behind shuttle",
    ],
  },
  {
    name: "Positioning",
    iconName: "Crosshair",
    skills: [
      "Receiving serve / Positioning",
      "Position when serving",
      "Position when partner serves",
      "Moving back to middle",
      "Front covering / Attack",
      "Front covering / Net distance",
      "Moving back after lift",
      "Moving front after partner's smash",
      "Covering back",
      "Chest stretch before hit",
      "Leg move towards front (after smash)",
      "Jump when smashing",
      "Positioning after smash",
      "Positioning after drop",
      "Positioning after lift",
      "Ready stance",
    ],
  },
  {
    name: "Service",
    iconName: "Send",
    skills: [
      "Service low",
      "Service high",
      "Receive after service / Drive",
      "Receive after service / Lift",
    ],
  },
  {
    name: "Attack",
    iconName: "Swords",
    skills: [
      "Drop shot / Net",
      "Drop shot / Mid court",
      "Smash",
      "Cross smash",
      "Back smash",
    ],
  },
  {
    name: "Defense",
    iconName: "Shield",
    skills: [
      "Clear / Back",
    ],
  },
  {
    name: "Strategic Shot",
    iconName: "Target",
    skills: [
      "Drive shot / Mid right side court",
      "Drive shot / Mid left side court (backhand)",
      "Drive shot / Middle court",
      "Cross back to back",
      "Cross mid to back",
      "Cross back to front",
      "Play on net / Right drive",
      "Play on net / Right lift",
      "Play on net / Right drop",
      "Play on net / Left drive",
      "Play on net / Left lift",
      "Play on net / Left net",
      "Drop from back",
      "Cross drop / Right",
      "Cross drop / Left",
      "Cross drop / Right backhand",
      "Cross drop / Left backhand",
      "Seek 4 corners",
      "Attack weaker opponent",
    ],
  },
  {
    name: "Psychology",
    iconName: "Brain",
    skills: [
      "Positive thinking",
      "Patience when waiting for opponent",
      "Partner support",
      "Relax, think, serve",
    ],
  },
  {
    name: "Sync",
    iconName: "Users",
    skills: [
      "Communication with partner",
    ],
  },
];

export async function seedJuniorSkills(): Promise<void> {
  const existing = await db.select().from(juniorSkillCategories).limit(1);
  if (existing.length > 0) {
    return;
  }

  console.log("[seed] Seeding junior skill categories and skills...");

  for (let i = 0; i < CATEGORIES_AND_SKILLS.length; i++) {
    const cat = CATEGORIES_AND_SKILLS[i];
    const [inserted] = await db.insert(juniorSkillCategories).values({
      name: cat.name,
      displayOrder: i + 1,
      iconName: cat.iconName,
    }).returning();

    for (let j = 0; j < cat.skills.length; j++) {
      await db.insert(juniorSkills).values({
        categoryId: inserted.id,
        name: cat.skills[j],
        displayOrder: j + 1,
      });
    }
  }

  const totalSkills = CATEGORIES_AND_SKILLS.reduce((sum, c) => sum + c.skills.length, 0);
  console.log(`[seed] Seeded ${CATEGORIES_AND_SKILLS.length} categories and ${totalSkills} skills`);
}
