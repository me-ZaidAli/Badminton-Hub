import { db } from "./db";
import { playerSkillCategories, playerSkills } from "@shared/schema";
import { eq } from "drizzle-orm";

const CATEGORIES_AND_SKILLS = [
  {
    name: "Serving",
    iconName: "Send",
    skills: [
      "Forehand Low Serve",
      "Backhand Low Serve",
      "Forehand High Serve",
      "Flick Serve",
      "Drive Serve",
      "Serve Placement Accuracy",
    ],
  },
  {
    name: "Forecourt Shots",
    iconName: "Target",
    skills: [
      "Net Kill",
      "Hairpin / Net Drop",
      "Net Lift",
      "Push Shot",
      "Tumble Net Shot",
      "Cross-Court Net Shot",
    ],
  },
  {
    name: "Midcourt Shots",
    iconName: "Swords",
    skills: [
      "Forehand Drive",
      "Backhand Drive",
      "Flat Drive Exchange",
      "Block Return",
      "Push Return",
      "Midcourt Intercept",
    ],
  },
  {
    name: "Rearcourt Shots",
    iconName: "Zap",
    skills: [
      "Forehand Clear",
      "Backhand Clear",
      "Forehand Drop Shot",
      "Backhand Drop Shot",
      "Full Smash",
      "Jump Smash",
      "Half Smash",
      "Slice / Cut Shot",
      "Round-the-Head Shot",
    ],
  },
  {
    name: "Footwork",
    iconName: "Footprints",
    skills: [
      "Ready Position / Split Step",
      "Chassé Steps",
      "Forward Lunge",
      "Side Lunge",
      "Backward Movement",
      "Scissor Kick",
      "Recovery to Base",
      "6-Point Movement Pattern",
      "Change of Direction Speed",
    ],
  },
  {
    name: "Grip & Racket Control",
    iconName: "Crosshair",
    skills: [
      "Forehand Grip",
      "Backhand Grip",
      "Panhandle Grip",
      "Grip Switching Speed",
      "Wrist Power Generation",
      "Finger Power Control",
    ],
  },
  {
    name: "Deception & Advanced",
    iconName: "Eye",
    skills: [
      "Hold and Delay",
      "Slice Deception",
      "Fake Smash to Drop",
      "Body Feint",
      "Disguised Net Shot",
      "Backhand Deception",
    ],
  },
  {
    name: "Tactical Awareness",
    iconName: "Brain",
    skills: [
      "Shot Selection",
      "Rally Construction",
      "Court Angle Exploitation",
      "Tempo Control",
      "Reading Opponent",
      "Adapting Strategy",
      "Attack vs Defence Transitions",
    ],
  },
  {
    name: "Doubles Play",
    iconName: "Users",
    skills: [
      "Front-and-Back Formation",
      "Side-by-Side Defence",
      "Rotation & Switching",
      "Partner Communication",
      "Court Coverage Distribution",
      "Doubles Serving Strategy",
    ],
  },
  {
    name: "Physical Fitness",
    iconName: "Dumbbell",
    skills: [
      "Aerobic Endurance",
      "Explosive Power",
      "Leg Strength",
      "Core Stability",
      "Reaction Time",
      "First-Step Quickness",
      "Flexibility & Mobility",
      "Match Stamina",
    ],
  },
  {
    name: "Mental Game",
    iconName: "Lightbulb",
    skills: [
      "Concentration & Focus",
      "Decision Under Pressure",
      "Confidence",
      "Resilience / Comeback Mentality",
      "Match Temperament",
      "Self-Assessment Ability",
    ],
  },
];

export async function seedPlayerSkillCategories() {
  const existing = await db.select().from(playerSkillCategories);
  if (existing.length > 0) {
    console.log("[PLAYER SKILL SEED] Player skill categories already seeded, skipping.");
    return;
  }

  console.log("[PLAYER SKILL SEED] Seeding default badminton skill categories and skills...");

  for (let catIdx = 0; catIdx < CATEGORIES_AND_SKILLS.length; catIdx++) {
    const catDef = CATEGORIES_AND_SKILLS[catIdx];
    const [category] = await db.insert(playerSkillCategories).values({
      name: catDef.name,
      iconName: catDef.iconName,
      displayOrder: catIdx + 1,
      clubId: null,
    }).returning();

    for (let skillIdx = 0; skillIdx < catDef.skills.length; skillIdx++) {
      await db.insert(playerSkills).values({
        categoryId: category.id,
        name: catDef.skills[skillIdx],
        displayOrder: skillIdx + 1,
        clubId: null,
      });
    }
  }

  console.log(`[PLAYER SKILL SEED] Seeded ${CATEGORIES_AND_SKILLS.length} categories with ${CATEGORIES_AND_SKILLS.reduce((sum, c) => sum + c.skills.length, 0)} skills.`);
}
