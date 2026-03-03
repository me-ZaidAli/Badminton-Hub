import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type BackgroundCategory =
  | "free"
  | "sport"
  | "nature"
  | "luxury"
  | "futuristic"
  | "cosmic"
  | "blackcard";

export type BackgroundTier = "free" | "premium" | "blackcard";

export interface BackgroundOption {
  id: string;
  label: string;
  preview: string;
  css: string;
  image?: string;
  category: BackgroundCategory;
  tier: BackgroundTier;
}

export const BACKGROUND_CATEGORIES: { id: BackgroundCategory | "all"; label: string }[] = [
  { id: "all", label: "All Backgrounds" },
  { id: "free", label: "Free Collection" },
  { id: "sport", label: "Sport Performance" },
  { id: "nature", label: "Nature & Earth" },
  { id: "luxury", label: "Luxury & Elite" },
  { id: "futuristic", label: "Futuristic & Tech" },
  { id: "cosmic", label: "Cosmic & Space" },
  { id: "blackcard", label: "Black Card Exclusive" },
];

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: "none",
    label: "None",
    preview: "linear-gradient(135deg, hsl(var(--background)), hsl(var(--background)))",
    css: "",
    category: "free",
    tier: "free",
  },
  {
    id: "aurora-mesh",
    label: "Aurora Mesh",
    preview: "linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)",
    css: "radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(236, 72, 153, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 40% 80%, rgba(34, 211, 238, 0.1) 0%, transparent 45%)",
    category: "free",
    tier: "free",
  },
  {
    id: "midnight-glow",
    label: "Midnight Glow",
    preview: "linear-gradient(135deg, #020617, #1e3a5f, #020617)",
    css: "radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(14, 165, 233, 0.06) 0%, transparent 40%)",
    category: "free",
    tier: "free",
  },
  {
    id: "emerald-forest",
    label: "Emerald Forest",
    preview: "linear-gradient(135deg, #022c22, #065f46, #022c22)",
    css: "radial-gradient(ellipse at 30% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(52, 211, 153, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 10% 90%, rgba(6, 95, 70, 0.15) 0%, transparent 50%)",
    category: "nature",
    tier: "free",
  },
  {
    id: "sunset-warm",
    label: "Sunset Warm",
    preview: "linear-gradient(135deg, #1c1917, #431407, #1c1917)",
    css: "radial-gradient(ellipse at 60% 30%, rgba(251, 146, 60, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(244, 63, 94, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 90% 60%, rgba(217, 119, 6, 0.06) 0%, transparent 40%)",
    category: "nature",
    tier: "free",
  },
  {
    id: "cosmic-purple",
    label: "Cosmic Purple",
    preview: "linear-gradient(135deg, #1a0533, #3b0764, #1a0533)",
    css: "radial-gradient(ellipse at 25% 25%, rgba(168, 85, 247, 0.14) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(192, 132, 252, 0.06) 0%, transparent 55%)",
    category: "cosmic",
    tier: "premium",
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    preview: "linear-gradient(135deg, #1c1917, #78350f, #1c1917)",
    css: "radial-gradient(ellipse at 40% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(212, 175, 55, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 10% 80%, rgba(180, 83, 9, 0.1) 0%, transparent 50%)",
    category: "luxury",
    tier: "premium",
  },
  {
    id: "ocean-depth",
    label: "Ocean Depth",
    preview: "linear-gradient(135deg, #0c1220, #164e63, #0c1220)",
    css: "radial-gradient(ellipse at 50% 10%, rgba(6, 182, 212, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 15% 60%, rgba(20, 184, 166, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 80%, rgba(8, 145, 178, 0.1) 0%, transparent 50%)",
    category: "nature",
    tier: "premium",
  },
  {
    id: "rose-garden",
    label: "Rose Garden",
    preview: "linear-gradient(135deg, #1c1017, #4c0519, #1c1017)",
    css: "radial-gradient(ellipse at 30% 30%, rgba(244, 63, 94, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(236, 72, 153, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 50% 90%, rgba(190, 24, 93, 0.1) 0%, transparent 50%)",
    category: "nature",
    tier: "premium",
  },
  {
    id: "northern-lights",
    label: "Northern Lights",
    preview: "linear-gradient(135deg, #0a0a1a, #1a2e44, #0a1a2a)",
    css: "radial-gradient(ellipse at 20% 10%, rgba(34, 211, 238, 0.1) 0%, transparent 40%), radial-gradient(ellipse at 60% 40%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 40% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 90% 20%, rgba(52, 211, 153, 0.06) 0%, transparent 35%)",
    category: "cosmic",
    tier: "premium",
  },
  {
    id: "steel-grid",
    label: "Steel Grid",
    preview: "linear-gradient(135deg, #18181b, #27272a, #18181b)",
    css: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px)",
    category: "futuristic",
    tier: "premium",
  },
  {
    id: "diamond-mesh",
    label: "Diamond Mesh",
    preview: "linear-gradient(135deg, #1e1b4b, #312e81, #1e1b4b)",
    css: "repeating-linear-gradient(45deg, transparent, transparent 29px, rgba(255,255,255,0.025) 29px, rgba(255,255,255,0.025) 30px), repeating-linear-gradient(-45deg, transparent, transparent 29px, rgba(255,255,255,0.025) 29px, rgba(255,255,255,0.025) 30px)",
    category: "futuristic",
    tier: "premium",
  },
  {
    id: "soft-cream",
    label: "Soft Cream",
    preview: "linear-gradient(135deg, #fef3c7, #fde68a, #fef3c7)",
    css: "radial-gradient(ellipse at 30% 20%, rgba(217, 119, 6, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(180, 83, 9, 0.04) 0%, transparent 45%)",
    category: "free",
    tier: "free",
  },
  {
    id: "pastel-sky",
    label: "Pastel Sky",
    preview: "linear-gradient(135deg, #e0f2fe, #bfdbfe, #ddd6fe)",
    css: "radial-gradient(ellipse at 40% 30%, rgba(96, 165, 250, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(167, 139, 250, 0.06) 0%, transparent 45%)",
    category: "free",
    tier: "free",
  },
  {
    id: "mint-breeze",
    label: "Mint Breeze",
    preview: "linear-gradient(135deg, #ecfdf5, #d1fae5, #ecfdf5)",
    css: "radial-gradient(ellipse at 25% 25%, rgba(52, 211, 153, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(16, 185, 129, 0.04) 0%, transparent 45%)",
    category: "free",
    tier: "free",
  },

  // === NEW: 20 backgrounds ===

  // 1. Soft Horizon (Free)
  {
    id: "soft-horizon",
    label: "Soft Horizon",
    preview: "linear-gradient(180deg, #fddcb5 0%, #fbc2a0 25%, #c9daf8 60%, #a8c8f0 100%)",
    css: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px), radial-gradient(ellipse at 50% 80%, rgba(251,194,160,0.08) 0%, transparent 60%)",
    category: "free",
    tier: "free",
  },
  // 2. Minimal Slate (Free)
  {
    id: "minimal-slate",
    label: "Minimal Slate",
    preview: "linear-gradient(135deg, #e5e7eb, #d1d5db, #e5e7eb)",
    css: "repeating-linear-gradient(135deg, transparent, transparent 11px, rgba(0,0,0,0.015) 11px, rgba(0,0,0,0.015) 12px), radial-gradient(ellipse at 70% 30%, rgba(0,0,0,0.03) 0%, transparent 50%)",
    category: "free",
    tier: "free",
  },
  // 3. Court Lines (Sport)
  {
    id: "court-lines",
    label: "Court Lines",
    preview: "linear-gradient(135deg, #1a1a1a, #2a2a2a, #1a1a1a)",
    css: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(74,222,128,0.08) 39px, rgba(74,222,128,0.08) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(74,222,128,0.08) 39px, rgba(74,222,128,0.08) 40px), linear-gradient(45deg, transparent 48%, rgba(74,222,128,0.04) 48%, rgba(74,222,128,0.04) 52%, transparent 52%), radial-gradient(circle at 50% 50%, rgba(74,222,128,0.06) 0%, transparent 30%)",
    category: "sport",
    tier: "premium",
  },
  // 4. Smash Velocity (Sport)
  {
    id: "smash-velocity",
    label: "Smash Velocity",
    preview: "linear-gradient(135deg, #0a0a14, #0f1729, #0a0a14)",
    css: "linear-gradient(175deg, transparent 30%, rgba(59,130,246,0.06) 40%, rgba(59,130,246,0.1) 50%, rgba(255,255,255,0.03) 55%, transparent 65%), linear-gradient(170deg, transparent 50%, rgba(59,130,246,0.04) 60%, rgba(147,197,253,0.06) 65%, transparent 75%), linear-gradient(180deg, transparent 65%, rgba(59,130,246,0.03) 75%, transparent 85%)",
    category: "sport",
    tier: "premium",
  },
  // 5. Feather Impact (Sport)
  {
    id: "feather-impact",
    label: "Feather Impact",
    preview: "linear-gradient(135deg, #1c1c24, #25252f, #1c1c24)",
    css: "repeating-linear-gradient(30deg, transparent, transparent 7px, rgba(255,255,255,0.012) 7px, rgba(255,255,255,0.012) 8px), repeating-linear-gradient(-30deg, transparent, transparent 7px, rgba(255,255,255,0.012) 7px, rgba(255,255,255,0.012) 8px), radial-gradient(ellipse at 60% 40%, rgba(255,255,255,0.04) 0%, transparent 40%), radial-gradient(ellipse at 40% 60%, rgba(200,200,220,0.03) 0%, transparent 35%)",
    category: "sport",
    tier: "premium",
  },
  // 6. Tropical Calm (Nature)
  {
    id: "tropical-calm",
    label: "Tropical Calm",
    preview: "linear-gradient(160deg, #0a2918, #134a2c, #1a5c35, #0a2918)",
    css: "radial-gradient(ellipse at 20% 30%, rgba(74,222,128,0.1) 0%, transparent 45%), radial-gradient(ellipse at 80% 70%, rgba(245,158,11,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 10%, rgba(253,224,71,0.05) 0%, transparent 40%), radial-gradient(ellipse at 10% 80%, rgba(16,185,129,0.06) 0%, transparent 45%)",
    category: "nature",
    tier: "premium",
  },
  // 7. Forest Mist (Nature)
  {
    id: "forest-mist",
    label: "Forest Mist",
    preview: "linear-gradient(180deg, #0b1a12, #132a1e, #1a3d2a, #0d2218)",
    css: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 30%, rgba(255,255,255,0.01) 60%, transparent 100%), radial-gradient(ellipse at 30% 80%, rgba(52,211,153,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(16,185,129,0.04) 0%, transparent 45%), radial-gradient(ellipse at 50% 95%, rgba(255,255,255,0.03) 0%, transparent 30%)",
    category: "nature",
    tier: "premium",
  },
  // 8. Savanna Gold (Nature)
  {
    id: "savanna-gold",
    label: "Savanna Gold",
    preview: "linear-gradient(180deg, #2c1e0e, #3d2a14, #2c1e0e)",
    css: "linear-gradient(180deg, rgba(245,158,11,0.04) 0%, rgba(217,119,6,0.06) 50%, rgba(180,83,9,0.04) 80%, transparent 100%), radial-gradient(ellipse at 50% 85%, rgba(120,53,15,0.08) 0%, transparent 40%), radial-gradient(ellipse at 80% 70%, rgba(245,158,11,0.05) 0%, transparent 35%)",
    category: "nature",
    tier: "premium",
  },
  // 9. Midnight Marble (Luxury)
  {
    id: "midnight-marble",
    label: "Midnight Marble",
    preview: "linear-gradient(135deg, #0a0a0a, #141414, #0a0a0a)",
    css: "linear-gradient(125deg, transparent 20%, rgba(212,175,55,0.04) 30%, transparent 40%, rgba(212,175,55,0.03) 55%, transparent 65%, rgba(212,175,55,0.05) 80%, transparent 90%), linear-gradient(225deg, transparent 10%, rgba(212,175,55,0.02) 25%, transparent 35%), radial-gradient(ellipse at 60% 40%, rgba(255,255,255,0.02) 0%, transparent 30%)",
    category: "luxury",
    tier: "premium",
  },
  // 10. Royal Emerald (Luxury)
  {
    id: "royal-emerald",
    label: "Royal Emerald",
    preview: "linear-gradient(135deg, #021a12, #064e3b, #021a12)",
    css: "repeating-linear-gradient(60deg, transparent, transparent 39px, rgba(255,255,255,0.015) 39px, rgba(255,255,255,0.015) 40px), repeating-linear-gradient(-60deg, transparent, transparent 39px, rgba(255,255,255,0.015) 39px, rgba(255,255,255,0.015) 40px), radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.06) 0%, transparent 50%)",
    category: "luxury",
    tier: "premium",
  },
  // 11. Obsidian Silk (Luxury)
  {
    id: "obsidian-silk",
    label: "Obsidian Silk",
    preview: "linear-gradient(135deg, #080808, #121212, #080808)",
    css: "linear-gradient(160deg, transparent 20%, rgba(255,255,255,0.015) 35%, transparent 50%, rgba(255,255,255,0.01) 65%, transparent 80%), linear-gradient(200deg, transparent 30%, rgba(255,255,255,0.012) 45%, transparent 60%), radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.02) 0%, transparent 40%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.015) 0%, transparent 35%)",
    category: "luxury",
    tier: "premium",
  },
  // 12. Neon Grid (Futuristic)
  {
    id: "neon-grid",
    label: "Neon Grid",
    preview: "linear-gradient(180deg, #0a0a14, #0f0f1e, #0a0a14)",
    css: "repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(99,102,241,0.06) 49px, rgba(99,102,241,0.06) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(99,102,241,0.06) 49px, rgba(99,102,241,0.06) 50px), linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 40%, transparent 80%, rgba(99,102,241,0.02) 100%)",
    category: "futuristic",
    tier: "premium",
  },
  // 13. Holographic Mesh (Futuristic)
  {
    id: "holographic-mesh",
    label: "Holographic Mesh",
    preview: "linear-gradient(135deg, #0f0f1a, #1a1028, #0f1a1f, #0f0f1a)",
    css: "repeating-linear-gradient(60deg, transparent, transparent 19px, rgba(168,85,247,0.025) 19px, rgba(168,85,247,0.025) 20px), repeating-linear-gradient(-60deg, transparent, transparent 19px, rgba(34,211,238,0.025) 19px, rgba(34,211,238,0.025) 20px), radial-gradient(ellipse at 30% 40%, rgba(168,85,247,0.08) 0%, transparent 45%), radial-gradient(ellipse at 70% 60%, rgba(34,211,238,0.06) 0%, transparent 45%)",
    category: "futuristic",
    tier: "premium",
  },
  // 14. Quantum Pulse (Futuristic)
  {
    id: "quantum-pulse",
    label: "Quantum Pulse",
    preview: "linear-gradient(135deg, #08080f, #0d0d18, #08080f)",
    css: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.04) 20%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(139,92,246,0.06) 10%, transparent 55%), radial-gradient(circle at 30% 70%, rgba(59,130,246,0.04) 0%, transparent 35%), radial-gradient(circle at 70% 30%, rgba(168,85,247,0.03) 0%, transparent 30%)",
    category: "futuristic",
    tier: "premium",
  },
  // 15. Lunar Surface (Cosmic)
  {
    id: "lunar-surface",
    label: "Lunar Surface",
    preview: "linear-gradient(135deg, #1a1a1f, #2a2a30, #1a1a1f)",
    css: "radial-gradient(circle at 25% 35%, rgba(255,255,255,0.04) 0%, transparent 15%), radial-gradient(circle at 65% 55%, rgba(255,255,255,0.03) 0%, transparent 12%), radial-gradient(circle at 45% 75%, rgba(255,255,255,0.025) 0%, transparent 10%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 8%), radial-gradient(ellipse at 50% 50%, rgba(200,200,210,0.03) 0%, transparent 50%)",
    category: "cosmic",
    tier: "premium",
  },
  // 16. Nebula Drift (Cosmic)
  {
    id: "nebula-drift",
    label: "Nebula Drift",
    preview: "linear-gradient(135deg, #0a0515, #150a28, #0a1020, #0a0515)",
    css: "radial-gradient(ellipse at 25% 30%, rgba(139,92,246,0.12) 0%, transparent 45%), radial-gradient(ellipse at 75% 65%, rgba(59,130,246,0.1) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.05) 0%, transparent 55%), radial-gradient(circle at 30% 70%, rgba(96,165,250,0.04) 0%, transparent 25%), radial-gradient(circle at 70% 25%, rgba(192,132,252,0.04) 0%, transparent 20%)",
    category: "cosmic",
    tier: "premium",
  },
  // 17. Solar Flare (Cosmic)
  {
    id: "solar-flare",
    label: "Solar Flare",
    preview: "linear-gradient(135deg, #080808, #0a0a0a, #080808)",
    css: "radial-gradient(ellipse at 90% 50%, rgba(251,146,60,0.15) 0%, rgba(245,158,11,0.08) 15%, rgba(217,119,6,0.04) 30%, transparent 50%), radial-gradient(ellipse at 85% 45%, rgba(253,224,71,0.04) 0%, transparent 25%), radial-gradient(ellipse at 95% 55%, rgba(251,146,60,0.03) 0%, transparent 20%)",
    category: "cosmic",
    tier: "premium",
  },
  // 18. Black Diamond (Black Card Exclusive)
  {
    id: "black-diamond",
    label: "Black Diamond",
    preview: "linear-gradient(135deg, #050505, #0a0a0a, #050505)",
    css: "linear-gradient(60deg, transparent 30%, rgba(255,255,255,0.02) 35%, transparent 40%), linear-gradient(120deg, transparent 50%, rgba(255,255,255,0.015) 55%, transparent 60%), linear-gradient(180deg, transparent 20%, rgba(255,255,255,0.01) 25%, transparent 30%), repeating-linear-gradient(60deg, transparent, transparent 24px, rgba(255,255,255,0.008) 24px, rgba(255,255,255,0.008) 25px), repeating-linear-gradient(-60deg, transparent, transparent 24px, rgba(255,255,255,0.008) 24px, rgba(255,255,255,0.008) 25px)",
    category: "blackcard",
    tier: "blackcard",
  },
  // 19. Galaxy Prestige (Black Card Exclusive)
  {
    id: "galaxy-prestige",
    label: "Galaxy Prestige",
    preview: "linear-gradient(135deg, #030308, #08061a, #030308)",
    css: "linear-gradient(30deg, transparent 20%, rgba(212,175,55,0.02) 25%, transparent 30%), linear-gradient(150deg, transparent 40%, rgba(212,175,55,0.015) 45%, transparent 50%), linear-gradient(75deg, transparent 60%, rgba(212,175,55,0.02) 65%, transparent 70%), radial-gradient(circle at 20% 30%, rgba(255,255,255,0.015) 0%, transparent 3%), radial-gradient(circle at 60% 20%, rgba(255,255,255,0.012) 0%, transparent 2%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.015) 0%, transparent 3%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.01) 0%, transparent 2%), radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.03) 0%, transparent 50%)",
    category: "blackcard",
    tier: "blackcard",
  },
  // 20. Infinite Void (Black Card Exclusive)
  {
    id: "infinite-void",
    label: "Infinite Void",
    preview: "linear-gradient(135deg, #000000, #020204, #000000)",
    css: "radial-gradient(circle at 15% 25%, rgba(255,255,255,0.008) 0%, transparent 2%), radial-gradient(circle at 45% 15%, rgba(255,255,255,0.006) 0%, transparent 1.5%), radial-gradient(circle at 75% 35%, rgba(255,255,255,0.01) 0%, transparent 2.5%), radial-gradient(circle at 25% 65%, rgba(255,255,255,0.005) 0%, transparent 1%), radial-gradient(circle at 85% 75%, rgba(255,255,255,0.008) 0%, transparent 2%), radial-gradient(circle at 55% 85%, rgba(255,255,255,0.006) 0%, transparent 1.5%), radial-gradient(circle at 35% 45%, rgba(255,255,255,0.004) 0%, transparent 1%), radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.015) 0%, transparent 60%)",
    category: "blackcard",
    tier: "blackcard",
  },

  {
    id: "img-diamond-luxe",
    label: "Diamond Luxe",
    preview: "linear-gradient(135deg, #080818, #101025, #080818)",
    css: "",
    image: "/backgrounds/bg-diamond-luxe.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-noir-gold-lines",
    label: "Noir Gold Lines",
    preview: "linear-gradient(135deg, #020202, #080808, #020202)",
    css: "",
    image: "/backgrounds/bg-noir-gold-lines.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-crimson-velvet",
    label: "Crimson Velvet",
    preview: "linear-gradient(135deg, #0a0202, #1a0508, #0a0202)",
    css: "",
    image: "/backgrounds/bg-crimson-velvet.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-world-atlas",
    label: "World Atlas",
    preview: "linear-gradient(135deg, #0a0e1a, #141e30, #0a0e1a)",
    css: "",
    image: "/backgrounds/bg-world-atlas.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-gold-wave",
    label: "Gold Wave",
    preview: "linear-gradient(135deg, #030303, #0a0806, #030303)",
    css: "",
    image: "/backgrounds/bg-gold-wave.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-art-deco-gold",
    label: "Art Deco Gold",
    preview: "linear-gradient(135deg, #060606, #0e0e0e, #060606)",
    css: "",
    image: "/backgrounds/bg-art-deco-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-royal-blue-gold",
    label: "Royal Blue & Gold",
    preview: "linear-gradient(135deg, #020510, #0a1030, #020510)",
    css: "",
    image: "/backgrounds/bg-royal-blue-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-neon-arena-blue",
    label: "Neon Arena Blue",
    preview: "linear-gradient(135deg, #020208, #04040f, #020208)",
    css: "",
    image: "/backgrounds/bg-neon-arena-blue.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-neon-arena-red",
    label: "Neon Arena Red",
    preview: "linear-gradient(135deg, #080202, #0f0404, #080202)",
    css: "",
    image: "/backgrounds/bg-neon-arena-red.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-black-marble-gold",
    label: "Black Marble Gold",
    preview: "linear-gradient(135deg, #080604, #14100a, #080604)",
    css: "",
    image: "/backgrounds/bg-black-marble-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-gold-polygon",
    label: "Gold Polygon",
    preview: "linear-gradient(135deg, #0a0806, #141008, #0a0806)",
    css: "",
    image: "/backgrounds/bg-gold-polygon.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-silk-waves",
    label: "Silk Waves",
    preview: "linear-gradient(135deg, #020202, #060606, #020202)",
    css: "",
    image: "/backgrounds/bg-silk-waves.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-navy-gold-geo",
    label: "Navy Gold Geometric",
    preview: "linear-gradient(135deg, #020510, #0a1030, #020510)",
    css: "",
    image: "/backgrounds/bg-navy-gold-geo.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-gold-bokeh",
    label: "Gold Bokeh",
    preview: "linear-gradient(135deg, #0a0808, #1a1510, #0a0808)",
    css: "",
    image: "/backgrounds/bg-gold-bokeh.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-tech-portal",
    label: "Tech Portal",
    preview: "linear-gradient(135deg, #020208, #06060f, #020208)",
    css: "",
    image: "/backgrounds/bg-tech-portal.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-carbon-gold",
    label: "Carbon Gold",
    preview: "linear-gradient(135deg, #0a0a0a, #141414, #0a0a0a)",
    css: "",
    image: "/backgrounds/bg-carbon-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-emerald-gold",
    label: "Emerald Gold",
    preview: "linear-gradient(135deg, #020a08, #041a12, #020a08)",
    css: "",
    image: "/backgrounds/bg-emerald-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-rose-gold",
    label: "Rose Gold",
    preview: "linear-gradient(135deg, #0a0606, #140c0c, #0a0606)",
    css: "",
    image: "/backgrounds/bg-rose-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-amethyst-cave",
    label: "Amethyst Cave",
    preview: "linear-gradient(135deg, #08040f, #140a22, #08040f)",
    css: "",
    image: "/backgrounds/bg-amethyst-cave.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-baroque-frame",
    label: "Baroque Frame",
    preview: "linear-gradient(135deg, #040404, #0a0808, #040404)",
    css: "",
    image: "/backgrounds/bg-baroque-frame.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-neon-cross",
    label: "Neon Cross",
    preview: "linear-gradient(135deg, #020208, #06060f, #020208)",
    css: "",
    image: "/backgrounds/bg-neon-cross.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-sapphire-floral",
    label: "Sapphire Floral",
    preview: "linear-gradient(135deg, #020818, #0a1838, #020818)",
    css: "",
    image: "/backgrounds/bg-sapphire-floral.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-layered-panels",
    label: "Layered Panels",
    preview: "linear-gradient(135deg, #050510, #0a0a1a, #050510)",
    css: "",
    image: "/backgrounds/bg-layered-panels.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-gold-sparkle",
    label: "Gold Sparkle",
    preview: "linear-gradient(135deg, #030303, #0a0806, #030303)",
    css: "",
    image: "/backgrounds/bg-gold-sparkle.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-teal-gold",
    label: "Teal Gold",
    preview: "linear-gradient(135deg, #020a0e, #041a22, #020a0e)",
    css: "",
    image: "/backgrounds/bg-teal-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-platinum-wave",
    label: "Platinum Wave",
    preview: "linear-gradient(135deg, #0c0c0c, #161616, #0c0c0c)",
    css: "",
    image: "/backgrounds/bg-platinum-wave.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-wine-leather",
    label: "Wine Leather",
    preview: "linear-gradient(135deg, #080204, #140508, #080204)",
    css: "",
    image: "/backgrounds/bg-wine-leather.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-neon-purple-stage",
    label: "Neon Purple Stage",
    preview: "linear-gradient(135deg, #040208, #0a040f, #040208)",
    css: "",
    image: "/backgrounds/bg-neon-purple-stage.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-quilted-royal",
    label: "Quilted Royal",
    preview: "linear-gradient(135deg, #020510, #0a1030, #020510)",
    css: "",
    image: "/backgrounds/bg-quilted-royal.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-hex-gold",
    label: "Hex Gold",
    preview: "linear-gradient(135deg, #060606, #0e0e0e, #060606)",
    css: "",
    image: "/backgrounds/bg-hex-gold.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-thunderstorm",
    label: "Thunderstorm",
    preview: "linear-gradient(135deg, #0a0818, #1a1030, #0a0818)",
    css: "",
    image: "/backgrounds/bg-thunderstorm.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-dark-forest",
    label: "Dark Forest",
    preview: "linear-gradient(135deg, #040a04, #0a1a0a, #040a04)",
    css: "",
    image: "/backgrounds/bg-dark-forest.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-black-smoke",
    label: "Black Smoke",
    preview: "linear-gradient(135deg, #020202, #080808, #020202)",
    css: "",
    image: "/backgrounds/bg-black-smoke.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-ocean-storm",
    label: "Ocean Storm",
    preview: "linear-gradient(135deg, #020810, #041828, #020810)",
    css: "",
    image: "/backgrounds/bg-ocean-storm.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-aurora-mountains",
    label: "Aurora Mountains",
    preview: "linear-gradient(135deg, #020a10, #041a28, #020a10)",
    css: "",
    image: "/backgrounds/bg-aurora-mountains.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-volcanic-glow",
    label: "Volcanic Glow",
    preview: "linear-gradient(135deg, #0a0404, #1a0808, #0a0404)",
    css: "",
    image: "/backgrounds/bg-volcanic-glow.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-dark-waterfall",
    label: "Dark Waterfall",
    preview: "linear-gradient(135deg, #040808, #081414, #040808)",
    css: "",
    image: "/backgrounds/bg-dark-waterfall.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-cosmic-nebula",
    label: "Cosmic Nebula",
    preview: "linear-gradient(135deg, #060410, #0c0820, #060410)",
    css: "",
    image: "/backgrounds/bg-cosmic-nebula.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-bamboo-dusk",
    label: "Bamboo Dusk",
    preview: "linear-gradient(135deg, #040804, #0a140a, #040804)",
    css: "",
    image: "/backgrounds/bg-bamboo-dusk.png",
    category: "blackcard",
    tier: "blackcard",
  },
  {
    id: "img-desert-twilight",
    label: "Desert Twilight",
    preview: "linear-gradient(135deg, #0a0604, #1a0e08, #0a0604)",
    css: "",
    image: "/backgrounds/bg-desert-twilight.png",
    category: "blackcard",
    tier: "blackcard",
  },

  {
    id: "img-mountain-lake",
    label: "Mountain Lake",
    preview: "linear-gradient(135deg, #1a3a4a, #2a5a6a)",
    css: "",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "free",
  },
  {
    id: "img-sunset-clouds",
    label: "Sunset Clouds",
    preview: "linear-gradient(135deg, #f97316, #ec4899)",
    css: "",
    image: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "free",
  },
  {
    id: "img-starry-night",
    label: "Starry Night",
    preview: "linear-gradient(135deg, #0a0a2e, #1a1a4e)",
    css: "",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80&auto=format&fit=crop",
    category: "cosmic",
    tier: "free",
  },
  {
    id: "img-ocean-waves",
    label: "Ocean Waves",
    preview: "linear-gradient(135deg, #0e4166, #1a6e8e)",
    css: "",
    image: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "free",
  },
  {
    id: "img-forest-path",
    label: "Forest Path",
    preview: "linear-gradient(135deg, #1a3a1a, #2a5a2a)",
    css: "",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "premium",
  },
  {
    id: "img-city-lights",
    label: "City Lights",
    preview: "linear-gradient(135deg, #1a1a2e, #2a2a4e)",
    css: "",
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80&auto=format&fit=crop",
    category: "luxury",
    tier: "premium",
  },
  {
    id: "img-northern-sky",
    label: "Northern Sky",
    preview: "linear-gradient(135deg, #0a2a3a, #1a4a5a)",
    css: "",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80&auto=format&fit=crop",
    category: "cosmic",
    tier: "premium",
  },
  {
    id: "img-dark-mountains",
    label: "Dark Mountains",
    preview: "linear-gradient(135deg, #111, #222)",
    css: "",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "premium",
  },
  {
    id: "img-abstract-smoke",
    label: "Abstract Smoke",
    preview: "linear-gradient(135deg, #0a0a0a, #1a1a2a)",
    css: "",
    image: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80&auto=format&fit=crop",
    category: "luxury",
    tier: "premium",
  },
  {
    id: "img-galaxy-deep",
    label: "Deep Galaxy",
    preview: "linear-gradient(135deg, #0a0520, #150a30)",
    css: "",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80&auto=format&fit=crop",
    category: "cosmic",
    tier: "blackcard",
  },

  {
    id: "img-badminton-court",
    label: "Badminton Court",
    preview: "linear-gradient(135deg, #1a3a1a, #2a5a2a)",
    css: "",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1920&q=80&auto=format&fit=crop",
    category: "sport",
    tier: "free",
  },
  {
    id: "img-shuttlecock-close",
    label: "Shuttlecock",
    preview: "linear-gradient(135deg, #2a2a2a, #3a3a3a)",
    css: "",
    image: "https://images.unsplash.com/photo-1613918431703-aa50889e3be4?w=1920&q=80&auto=format&fit=crop",
    category: "sport",
    tier: "free",
  },
  {
    id: "img-racket-strings",
    label: "Racket Strings",
    preview: "linear-gradient(135deg, #1a1a2e, #2a2a4e)",
    css: "",
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1920&q=80&auto=format&fit=crop",
    category: "sport",
    tier: "premium",
  },
  {
    id: "img-stadium-lights",
    label: "Stadium Lights",
    preview: "linear-gradient(135deg, #0a0a1a, #1a1a3a)",
    css: "",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80&auto=format&fit=crop",
    category: "sport",
    tier: "premium",
  },
  {
    id: "img-sport-arena",
    label: "Sport Arena",
    preview: "linear-gradient(135deg, #1a1a2e, #0a0a1e)",
    css: "",
    image: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1920&q=80&auto=format&fit=crop",
    category: "sport",
    tier: "premium",
  },
  {
    id: "img-neon-tunnel",
    label: "Neon Tunnel",
    preview: "linear-gradient(135deg, #0a001a, #1a0a3a)",
    css: "",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&q=80&auto=format&fit=crop",
    category: "futuristic",
    tier: "premium",
  },
  {
    id: "img-cyber-city",
    label: "Cyber City",
    preview: "linear-gradient(135deg, #0a0a2e, #1a0a4e)",
    css: "",
    image: "https://images.unsplash.com/photo-1515705576963-95cad62945b6?w=1920&q=80&auto=format&fit=crop",
    category: "futuristic",
    tier: "premium",
  },
  {
    id: "img-digital-waves",
    label: "Digital Waves",
    preview: "linear-gradient(135deg, #0a0a1a, #0a1a3a)",
    css: "",
    image: "/backgrounds/bg-digital-waves.png",
    category: "futuristic",
    tier: "premium",
  },
  {
    id: "img-circuit-board",
    label: "Circuit Board",
    preview: "linear-gradient(135deg, #0a1a0a, #0a2a1a)",
    css: "",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80&auto=format&fit=crop",
    category: "futuristic",
    tier: "premium",
  },
  {
    id: "img-laser-show",
    label: "Laser Show",
    preview: "linear-gradient(135deg, #1a0a2e, #2a0a4e)",
    css: "",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1920&q=80&auto=format&fit=crop",
    category: "futuristic",
    tier: "blackcard",
  },
  {
    id: "img-milky-way",
    label: "Milky Way",
    preview: "linear-gradient(135deg, #050510, #0a0a20)",
    css: "",
    image: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1920&q=80&auto=format&fit=crop",
    category: "cosmic",
    tier: "premium",
  },
  {
    id: "img-earth-space",
    label: "Earth from Space",
    preview: "linear-gradient(135deg, #000510, #001030)",
    css: "",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80&auto=format&fit=crop",
    category: "cosmic",
    tier: "premium",
  },
  {
    id: "img-aurora-sky",
    label: "Aurora Sky",
    preview: "linear-gradient(135deg, #0a1a2a, #0a3a2a)",
    css: "",
    image: "https://images.unsplash.com/photo-1483086431886-3590a88317fe?w=1920&q=80&auto=format&fit=crop",
    category: "cosmic",
    tier: "premium",
  },
  {
    id: "img-marble-gold",
    label: "Marble & Gold",
    preview: "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
    css: "",
    image: "/backgrounds/bg-marble-gold.png",
    category: "luxury",
    tier: "premium",
  },
  {
    id: "img-dark-silk",
    label: "Dark Silk",
    preview: "linear-gradient(135deg, #0a0a0a, #1a1a1a)",
    css: "",
    image: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=75&auto=format&fit=crop&crop=entropy",
    category: "luxury",
    tier: "premium",
  },
  {
    id: "img-golden-gate",
    label: "Golden Gate",
    preview: "linear-gradient(135deg, #2a1a0a, #4a2a0a)",
    css: "",
    image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1920&q=80&auto=format&fit=crop",
    category: "luxury",
    tier: "premium",
  },
  {
    id: "img-tropical-beach",
    label: "Tropical Beach",
    preview: "linear-gradient(135deg, #0a3a4a, #0a5a6a)",
    css: "",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "free",
  },
  {
    id: "img-cherry-blossom",
    label: "Cherry Blossom",
    preview: "linear-gradient(135deg, #3a1a2a, #5a2a4a)",
    css: "",
    image: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "premium",
  },
  {
    id: "img-waterfall",
    label: "Waterfall",
    preview: "linear-gradient(135deg, #0a2a1a, #0a4a2a)",
    css: "",
    image: "/backgrounds/bg-waterfall.png",
    category: "nature",
    tier: "premium",
  },
  {
    id: "img-lightning-storm",
    label: "Lightning Storm",
    preview: "linear-gradient(135deg, #0a0a1a, #1a1a2a)",
    css: "",
    image: "https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?w=1920&q=80&auto=format&fit=crop",
    category: "nature",
    tier: "blackcard",
  },
];

function getInitialBackground(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("dashboardBackground") || "none";
  }
  return "none";
}

let bgStyleEl: HTMLStyleElement | null = null;

function applyBackgroundToDOM(id: string) {
  const option = BACKGROUND_OPTIONS.find(b => b.id === id) || BACKGROUND_OPTIONS[0];
  const html = document.documentElement;

  if (!bgStyleEl) {
    bgStyleEl = document.createElement("style");
    bgStyleEl.id = "app-bg-override";
    document.head.appendChild(bgStyleEl);
  }

  if (id === "none" || (!option.css && !option.image)) {
    html.removeAttribute("data-bg");
    bgStyleEl.textContent = "";
  } else if (option.image) {
    html.setAttribute("data-bg", id);
    bgStyleEl.textContent = `
      html[data-bg],
      html[data-bg].dark,
      html[data-bg] body {
        background: ${option.preview} !important;
        background-image: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url('${option.image}') !important;
        background-size: cover !important;
        background-position: center !important;
        background-attachment: fixed !important;
        background-repeat: no-repeat !important;
      }
    `;
  } else {
    html.setAttribute("data-bg", id);
    bgStyleEl.textContent = `
      html[data-bg],
      html[data-bg].dark,
      html[data-bg] body {
        background: ${option.preview} !important;
        background-image: ${option.css}, ${option.preview} !important;
        background-attachment: fixed !important;
      }
    `;
  }
}

const initialBg = getInitialBackground();
if (typeof window !== "undefined" && initialBg !== "none") {
  applyBackgroundToDOM(initialBg);
}

export function useBackground() {
  const [backgroundId, setBackgroundIdState] = useState<string>(initialBg);

  const saveMutation = useMutation({
    mutationFn: async (bg: string) => {
      await apiRequest("PATCH", "/api/user/display-preferences", { dashboardBackground: bg });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  useEffect(() => {
    applyBackgroundToDOM(backgroundId);
  }, [backgroundId]);

  const setBackground = useCallback((id: string) => {
    setBackgroundIdState(id);
    localStorage.setItem("dashboardBackground", id);
    applyBackgroundToDOM(id);
    saveMutation.mutate(id);
  }, []);

  const syncFromUser = useCallback((bg: string | null | undefined) => {
    const effective = bg || "none";
    if (effective !== localStorage.getItem("dashboardBackground")) {
      setBackgroundIdState(effective);
      localStorage.setItem("dashboardBackground", effective);
      applyBackgroundToDOM(effective);
    }
  }, []);

  const currentBackground = BACKGROUND_OPTIONS.find(b => b.id === backgroundId) || BACKGROUND_OPTIONS[0];

  return {
    backgroundId,
    setBackground,
    syncFromUser,
    currentBackground,
    backgroundCss: currentBackground.css,
  };
}
