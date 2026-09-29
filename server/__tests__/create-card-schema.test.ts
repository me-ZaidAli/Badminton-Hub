/**
 * Validation rules for POST /api/admin/cards (new recognition card types).
 *
 * Run with:  npx tsx server/__tests__/create-card-schema.test.ts
 */
import assert from "node:assert/strict";
import { createCardSchema } from "@shared/schema";

const validInput = {
  name: "  Smash Specialist  ",
  description: "  For the hardest hitter in the club.  ",
  cardCategory: "admin_gifted",
  pattern: "lightning",
};

const validResult = createCardSchema.safeParse(validInput);
assert.ok(validResult.success, "valid input should pass");
assert.equal(validResult.data.name, "Smash Specialist", "name is trimmed");
assert.equal(validResult.data.description, "For the hardest hitter in the club.", "description is trimmed");
assert.equal(validResult.data.isActive, true, "isActive defaults to true");
assert.equal(validResult.data.rarityLevel, "standard", "rarity defaults to standard");
assert.equal(validResult.data.weeklyCreditValue, 0, "benefit defaults to 0");

const withRarityResult = createCardSchema.safeParse({ ...validInput, rarityLevel: "legendary", weeklyCreditValue: 500 });
assert.ok(withRarityResult.success, "rarity + benefit should pass");
assert.equal(withRarityResult.data.rarityLevel, "legendary");
assert.equal(withRarityResult.data.weeklyCreditValue, 500);

const inactiveResult = createCardSchema.safeParse({ ...validInput, cardCategory: "milestone", isActive: false });
assert.ok(inactiveResult.success, "milestone + inactive should pass");
assert.equal(inactiveResult.data.isActive, false);

const withArtworkResult = createCardSchema.safeParse({ ...validInput, imageUrl: "/files/cards/1780000000000-abc123.png" });
assert.ok(withArtworkResult.success, "uploaded card artwork URL should pass");
assert.equal(withArtworkResult.data.imageUrl, "/files/cards/1780000000000-abc123.png");
assert.equal(validResult.data.imageUrl, undefined, "artwork is optional");

const rejectedInputs: { label: string; input: Record<string, unknown>; expectedMessage?: string }[] = [
  { label: "blank name", input: { ...validInput, name: "   " }, expectedMessage: "Name is required" },
  { label: "blank description", input: { ...validInput, description: "" }, expectedMessage: "Description is required" },
  { label: "name over 60 chars", input: { ...validInput, name: "x".repeat(61) }, expectedMessage: "Name must be 60 characters or fewer" },
  { label: "description over 500 chars", input: { ...validInput, description: "x".repeat(501) }, expectedMessage: "Description must be 500 characters or fewer" },
  { label: "unknown icon pattern", input: { ...validInput, pattern: "rocket" } },
  { label: "unknown category", input: { ...validInput, cardCategory: "purchased" } },
  { label: "missing pattern", input: { name: "Card", description: "Desc", cardCategory: "milestone" } },
  { label: "external artwork URL", input: { ...validInput, imageUrl: "https://evil.example/card.png" }, expectedMessage: "Invalid card artwork" },
  { label: "artwork from another upload folder", input: { ...validInput, imageUrl: "/files/announcements/123.png" }, expectedMessage: "Invalid card artwork" },
  { label: "artwork URL with CSS breakout", input: { ...validInput, imageUrl: "/files/cards/a.png);background:url(x" }, expectedMessage: "Invalid card artwork" },
  { label: "artwork path traversal", input: { ...validInput, imageUrl: "/files/cards/../secret.png" }, expectedMessage: "Invalid card artwork" },
  { label: "unknown rarity", input: { ...validInput, rarityLevel: "ultra" } },
  { label: "negative benefit", input: { ...validInput, weeklyCreditValue: -100 }, expectedMessage: "Benefit cannot be negative" },
  { label: "fractional pence benefit", input: { ...validInput, weeklyCreditValue: 150.5 }, expectedMessage: "Benefit must be in whole pence" },
  { label: "benefit over £100", input: { ...validInput, weeklyCreditValue: 10001 }, expectedMessage: "Benefit must be £100 or less" },
];

for (const { label, input, expectedMessage } of rejectedInputs) {
  const result = createCardSchema.safeParse(input);
  assert.equal(result.success, false, `${label} should be rejected`);
  if (expectedMessage && !result.success) {
    assert.equal(result.error.issues[0]?.message, expectedMessage, `${label} message`);
  }
}

console.log("create-card-schema: all assertions passed");
