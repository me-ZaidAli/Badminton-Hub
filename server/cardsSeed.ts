import { db } from "./db";
import { cards } from "@shared/schema";

export async function seedRecognitionCards() {
  try {
    const existing = await db.select({ id: cards.id }).from(cards).limit(1);
    if (existing.length > 0) {
      console.log("[CARD SEED] Recognition cards already seeded, skipping.");
      return;
    }

    console.log("[CARD SEED] Seeding recognition cards...");

    const cardSeedData = [
      { name: "Heart of the Club", description: "Awarded to members who consistently go above and beyond for the club community — helping newcomers, volunteering, and spreading positivity.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-rose-500 via-pink-500 to-fuchsia-500", textColor: "text-white", accentColor: "#ec4899", pattern: "hearts" }, isActive: true },
      { name: "Captain's Spirit", description: "Recognises natural leadership on and off the court — someone who inspires teammates, organises play, and leads by example.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-amber-500 via-orange-500 to-red-500", textColor: "text-white", accentColor: "#f59e0b", pattern: "shield" }, isActive: true },
      { name: "Fair Play Champion", description: "For those who exemplify sportsmanship — always respectful, honest in line calls, and gracious in both victory and defeat.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-emerald-500 via-green-500 to-teal-500", textColor: "text-white", accentColor: "#10b981", pattern: "scales" }, isActive: true },
      { name: "Rising Star", description: "Awarded to players showing exceptional improvement and dedication to their development, regardless of current skill level.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-violet-500 via-purple-500 to-indigo-500", textColor: "text-white", accentColor: "#8b5cf6", pattern: "stars" }, isActive: true },
      { name: "Community Builder", description: "For members who bring people together — organising social events, welcoming new members, and strengthening club bonds.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-sky-500 via-blue-500 to-indigo-500", textColor: "text-white", accentColor: "#3b82f6", pattern: "network" }, isActive: true },
      { name: "Ironclad Commitment", description: "Recognises unwavering dedication — consistent attendance, reliable availability, and a never-miss attitude through rain or shine.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-slate-600 via-zinc-500 to-stone-600", textColor: "text-white", accentColor: "#71717a", pattern: "iron" }, isActive: true },
      { name: "Mentor's Touch", description: "For experienced players who generously share their knowledge, coach newer members, and help others reach their potential.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-cyan-500 via-teal-500 to-emerald-500", textColor: "text-white", accentColor: "#14b8a6", pattern: "compass" }, isActive: true },
      { name: "Trailblazer", description: "Awarded to those who bring fresh ideas, innovative suggestions, or new energy that moves the club forward.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-orange-500 via-amber-500 to-yellow-500", textColor: "text-white", accentColor: "#f97316", pattern: "lightning" }, isActive: true },
      { name: "Silent Guardian", description: "For the unsung heroes who quietly keep things running — setting up courts, managing equipment, handling logistics without being asked.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-gray-700 via-slate-600 to-gray-800", textColor: "text-white", accentColor: "#64748b", pattern: "shield-dark" }, isActive: true },
      { name: "Golden Racket", description: "The highest honour — awarded for extraordinary contribution, exceptional character, and lasting positive impact on the club.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-yellow-400 via-amber-400 to-orange-400", textColor: "text-black", accentColor: "#eab308", pattern: "crown" }, isActive: true },
      { name: "Metallic Comet", description: "The rarest recognition — blazing across the sky like a comet. Awarded to those who have demonstrated extraordinary dedication, skill, and unwavering passion for the sport.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-yellow-300 via-amber-400 to-yellow-600", textColor: "text-black", accentColor: "#D4AF37", pattern: "comet" }, isActive: true },
      { name: "Royal Duty", description: "A mark of true distinction — bestowed upon those whose unwavering commitment, selfless leadership, and graceful conduct embody the highest standards of sporting excellence.", cardCategory: "admin_gifted" as const, designConfig: { gradient: "from-slate-200 via-gray-300 to-zinc-400", textColor: "text-gray-900", accentColor: "#94A3B8", pattern: "crown" }, isActive: true },
    ];

    const inserted = await db.insert(cards).values(cardSeedData).returning();
    console.log(`[CARD SEED] Seeded ${inserted.length} recognition cards.`);
  } catch (err) {
    console.error("[CARD SEED] Failed to seed recognition cards:", err);
  }
}
