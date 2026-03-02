import { Award, Heart, Shield, Scale, Star, Network, Anvil, Compass, Zap, EyeOff, Crown, Sparkles } from "lucide-react";

type CardDesignConfig = {
  gradient: string;
  textColor: string;
  accentColor: string;
  pattern?: string;
};

type MetalMaterial = {
  base: string;
  lighting: string;
  texture: string;
  chip: string;
  textMain: string;
  textSub: string;
  divider: string;
  edgeHighlight: string;
  shimmerColor: string;
  hasGlow?: boolean;
};

const CARD_ICONS: Record<string, typeof Heart> = {
  hearts: Heart,
  shield: Shield,
  scales: Scale,
  stars: Star,
  network: Network,
  iron: Anvil,
  compass: Compass,
  lightning: Zap,
  "shield-dark": EyeOff,
  crown: Crown,
  comet: Sparkles,
};

const METAL_MATERIALS: Record<number, MetalMaterial> = {
  1: {
    base: "linear-gradient(145deg, #b76e79 0%, #a05a68 15%, #c98a94 30%, #8e4955 50%, #c08090 70%, #9e5f6b 85%, #b76e79 100%)",
    lighting: "linear-gradient(160deg, rgba(255,220,220,0.18) 0%, transparent 40%, rgba(255,180,180,0.06) 60%, transparent 100%)",
    texture: "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 3px)",
    chip: "linear-gradient(135deg, #d4a0aa, #8e4955, #c08090, #a05a68)",
    textMain: "#fff5f7",
    textSub: "rgba(255,240,245,0.7)",
    divider: "rgba(255,200,210,0.25)",
    edgeHighlight: "inset 0 0 0 1px rgba(255,200,210,0.12)",
    shimmerColor: "rgba(255,200,220,0.15)",
  },
  2: {
    base: "linear-gradient(145deg, #d4af37 0%, #b8941f 15%, #e8c84a 25%, #a07818 40%, #d4af37 55%, #c49b2a 70%, #e0be3d 85%, #b8941f 100%)",
    lighting: "linear-gradient(155deg, rgba(255,240,180,0.25) 0%, transparent 35%, rgba(255,215,0,0.08) 55%, transparent 100%)",
    texture: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, transparent 2px, transparent 4px)",
    chip: "linear-gradient(135deg, #e8c84a, #8a6d14, #d4af37, #a07818)",
    textMain: "#1a1400",
    textSub: "rgba(26,20,0,0.65)",
    divider: "rgba(139,109,20,0.35)",
    edgeHighlight: "inset 0 0 0 1px rgba(255,215,0,0.15)",
    shimmerColor: "rgba(255,240,180,0.2)",
  },
  3: {
    base: "linear-gradient(145deg, #0d5c2e 0%, #0a4a24 15%, #15804a 30%, #073d1c 45%, #0d6b35 60%, #0a5529 75%, #117a44 90%, #0d5c2e 100%)",
    lighting: "linear-gradient(160deg, rgba(100,255,180,0.12) 0%, transparent 40%, rgba(0,200,100,0.06) 65%, transparent 100%)",
    texture: "repeating-conic-gradient(rgba(255,255,255,0.02) 0deg 30deg, transparent 30deg 60deg)",
    chip: "linear-gradient(135deg, #15804a, #073d1c, #0d6b35, #0a4a24)",
    textMain: "#e0fff0",
    textSub: "rgba(200,255,230,0.7)",
    divider: "rgba(100,255,180,0.2)",
    edgeHighlight: "inset 0 0 0 1px rgba(100,255,180,0.1)",
    shimmerColor: "rgba(100,255,180,0.12)",
  },
  4: {
    base: "linear-gradient(145deg, #e5e4e2 0%, #c0c0c0 15%, #f0f0ee 25%, #a8a8a8 40%, #dcdcda 55%, #b8b8b8 70%, #e8e8e6 85%, #c8c8c6 100%)",
    lighting: "linear-gradient(155deg, rgba(255,255,255,0.35) 0%, transparent 30%, rgba(200,220,255,0.1) 55%, transparent 100%)",
    texture: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0px, transparent 1px, transparent 4px)",
    chip: "linear-gradient(135deg, #f0f0ee, #8a8a88, #dcdcda, #a8a8a8)",
    textMain: "#1a1a2e",
    textSub: "rgba(26,26,46,0.6)",
    divider: "rgba(100,100,120,0.25)",
    edgeHighlight: "inset 0 0 0 1px rgba(255,255,255,0.2)",
    shimmerColor: "rgba(255,255,255,0.25)",
  },
  5: {
    base: "linear-gradient(145deg, #4a5568 0%, #3d4654 15%, #5a6a7e 30%, #2d3748 45%, #4a5f75 60%, #3a4d60 75%, #5a6878 90%, #4a5568 100%)",
    lighting: "linear-gradient(160deg, rgba(150,200,255,0.12) 0%, transparent 40%, rgba(100,150,200,0.06) 60%, transparent 100%)",
    texture: "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, transparent 1px, transparent 2px)",
    chip: "linear-gradient(135deg, #5a6a7e, #2d3748, #4a5f75, #3d4654)",
    textMain: "#e8edf3",
    textSub: "rgba(220,230,240,0.65)",
    divider: "rgba(150,180,210,0.2)",
    edgeHighlight: "inset 0 0 0 1px rgba(150,200,255,0.08)",
    shimmerColor: "rgba(150,200,255,0.1)",
  },
  6: {
    base: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 15%, #2a2a2a 25%, #111111 40%, #1e1e1e 55%, #0a0a0a 70%, #222222 85%, #151515 100%)",
    lighting: "linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 35%, rgba(255,255,255,0.03) 60%, transparent 100%)",
    texture: "repeating-conic-gradient(rgba(255,255,255,0.02) 0deg 45deg, transparent 45deg 90deg)",
    chip: "linear-gradient(135deg, #333, #111, #2a2a2a, #0d0d0d)",
    textMain: "#e0e0e0",
    textSub: "rgba(200,200,200,0.6)",
    divider: "rgba(255,255,255,0.1)",
    edgeHighlight: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    shimmerColor: "rgba(255,255,255,0.08)",
    hasGlow: true,
  },
  7: {
    base: "linear-gradient(145deg, #1a1a1a 0%, #222 10%, #1c1c1c 20%, #252525 30%, #1a1a1a 40%, #202020 50%, #1d1d1d 60%, #232323 70%, #1a1a1a 80%, #212121 90%, #1e1e1e 100%)",
    lighting: "linear-gradient(160deg, rgba(100,200,220,0.08) 0%, transparent 40%, rgba(50,150,170,0.04) 60%, transparent 100%)",
    texture: "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, transparent 1px, transparent 3px, rgba(255,255,255,0.015) 4px, transparent 5px, transparent 7px)",
    chip: "linear-gradient(135deg, #2d2d2d, #111, #252525, #1a1a1a)",
    textMain: "#d0f0f0",
    textSub: "rgba(180,230,230,0.65)",
    divider: "rgba(100,200,220,0.2)",
    edgeHighlight: "inset 0 0 0 1px rgba(100,200,220,0.08)",
    shimmerColor: "rgba(100,220,240,0.1)",
  },
  8: {
    base: "linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 10%, #0a0a0a 25%, #222 35%, #0d0d0d 50%, #181818 65%, #0e0e0e 80%, #1c1c1c 100%)",
    lighting: "linear-gradient(155deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 20%, transparent 40%, rgba(255,200,100,0.06) 60%, transparent 80%)",
    texture: "repeating-linear-gradient(90deg, rgba(255,255,255,0.01) 0px, transparent 1px, transparent 4px)",
    chip: "linear-gradient(135deg, #333, #0a0a0a, #222, #111)",
    textMain: "#ffeedd",
    textSub: "rgba(255,230,200,0.6)",
    divider: "rgba(255,200,100,0.2)",
    edgeHighlight: "inset 0 0 0 1px rgba(255,255,255,0.08)",
    shimmerColor: "rgba(255,220,150,0.12)",
    hasGlow: true,
  },
  9: {
    base: "linear-gradient(145deg, #2c3539 0%, #1e2628 15%, #384448 25%, #1a2224 40%, #303c40 55%, #252f33 70%, #3a4a50 85%, #2c3539 100%)",
    lighting: "linear-gradient(160deg, rgba(150,180,200,0.1) 0%, transparent 40%, rgba(100,140,160,0.05) 60%, transparent 100%)",
    texture: "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, transparent 1px, transparent 2px)",
    chip: "linear-gradient(135deg, #3a4a50, #1a2224, #303c40, #1e2628)",
    textMain: "#d0dde0",
    textSub: "rgba(180,200,210,0.6)",
    divider: "rgba(150,180,200,0.15)",
    edgeHighlight: "inset 0 0 0 1px rgba(150,180,200,0.06)",
    shimmerColor: "rgba(150,200,220,0.08)",
  },
  10: {
    base: "linear-gradient(145deg, #ffd700 0%, #daa520 15%, #ffe44d 25%, #c8961e 40%, #f0c420 55%, #daa520 70%, #ffe84d 85%, #d4a017 100%)",
    lighting: "linear-gradient(155deg, rgba(255,255,240,0.3) 0%, transparent 30%, rgba(255,230,150,0.1) 55%, transparent 100%)",
    texture: "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, transparent 2px, transparent 5px)",
    chip: "linear-gradient(135deg, #ffe84d, #a07818, #f0c420, #c8961e)",
    textMain: "#1a1400",
    textSub: "rgba(26,20,0,0.6)",
    divider: "rgba(139,109,20,0.3)",
    edgeHighlight: "inset 0 0 0 1px rgba(255,255,200,0.2)",
    shimmerColor: "rgba(255,255,200,0.25)",
    hasGlow: true,
  },
  11: {
    base: "linear-gradient(145deg, #d4af37 0%, #c9a030 12%, #f0d860 22%, #b8941f 35%, #e8c84a 48%, #d4af37 58%, #c49b2a 70%, #ffe066 82%, #b8941f 92%, #d4af37 100%)",
    lighting: "linear-gradient(155deg, rgba(255,240,180,0.3) 0%, transparent 30%, rgba(255,215,0,0.1) 55%, transparent 100%)",
    texture: "repeating-conic-gradient(rgba(255,255,255,0.05) 0deg 15deg, transparent 15deg 30deg)",
    chip: "linear-gradient(135deg, #ffe066, #8a6d14, #d4af37, #b8941f)",
    textMain: "#1a1400",
    textSub: "rgba(26,20,0,0.7)",
    divider: "rgba(139,109,20,0.4)",
    edgeHighlight: "inset 0 0 0 1.5px rgba(255,215,0,0.2)",
    shimmerColor: "rgba(255,240,180,0.25)",
    hasGlow: true,
  },
  12: {
    base: "linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 12%, #d8d8d8 22%, #9a9a9a 35%, #c8c8c8 48%, #b0b0b0 58%, #d0d0d0 70%, #a0a0a0 82%, #c4c4c4 92%, #b8b8b8 100%)",
    lighting: "linear-gradient(155deg, rgba(255,255,255,0.3) 0%, transparent 30%, rgba(200,220,240,0.1) 55%, transparent 100%)",
    texture: "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, transparent 2px, transparent 5px)",
    chip: "linear-gradient(135deg, #d8d8d8, #808080, #c0c0c0, #a0a0a0)",
    textMain: "#1a1a2e",
    textSub: "rgba(26,26,46,0.65)",
    divider: "rgba(100,100,120,0.3)",
    edgeHighlight: "inset 0 0 0 1.5px rgba(255,255,255,0.25)",
    shimmerColor: "rgba(255,255,255,0.3)",
  },
};

const DEFAULT_MATERIAL: MetalMaterial = {
  base: "linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #333 100%)",
  lighting: "linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
  texture: "none",
  chip: "linear-gradient(135deg, #444, #222, #333, #1a1a1a)",
  textMain: "#e0e0e0",
  textSub: "rgba(200,200,200,0.6)",
  divider: "rgba(255,255,255,0.1)",
  edgeHighlight: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  shimmerColor: "rgba(255,255,255,0.08)",
};

const EMBLEM_GOLD: [string, string, string, string] = ["#d4af37", "#f5d76e", "#8a6d14", "#e8c84a"];
const EMBLEM_SILVER: [string, string, string, string] = ["#b8b8b8", "#e8e8e8", "#707070", "#d0d0d0"];
const EMBLEM_ROSEGOLD: [string, string, string, string] = ["#c98a94", "#f0c0c8", "#8e4955", "#daa0aa"];
const EMBLEM_BRONZE: [string, string, string, string] = ["#cd7f32", "#e8a860", "#8b5a2b", "#d4944a"];
const EMBLEM_EMERALD_GOLD: [string, string, string, string] = ["#c0a050", "#e0d080", "#806020", "#d0b868"];

const EMBLEM_COLORS: Record<number, [string, string, string, string]> = {
  1: EMBLEM_ROSEGOLD,
  2: EMBLEM_GOLD,
  3: EMBLEM_EMERALD_GOLD,
  4: EMBLEM_SILVER,
  5: EMBLEM_SILVER,
  6: EMBLEM_GOLD,
  7: EMBLEM_SILVER,
  8: EMBLEM_GOLD,
  9: EMBLEM_BRONZE,
  10: EMBLEM_GOLD,
  11: EMBLEM_GOLD,
  12: EMBLEM_SILVER,
};

const EMBLEM_PATHS: Record<number, { filled: string; stroked: string }> = {
  1: {
    filled: "M0,-8 C-2,-8 -12,-20 -18,-26 C-24,-32 -30,-28 -28,-22 C-26,-16 -18,-10 -12,-4 C-6,2 -2,6 0,10 C2,6 6,2 12,-4 C18,-10 26,-16 28,-22 C30,-28 24,-32 18,-26 C12,-20 2,-8 0,-8Z",
    stroked: "M-32,18 Q-36,8 -34,-2 Q-32,-10 -26,-18 Q-22,-22 -18,-24 M-26,-18 Q-24,-12 -28,-6 Q-32,-10 -26,-18 M-32,-6 Q-30,0 -34,6 Q-38,2 -32,-6 M-34,8 Q-32,14 -36,18 Q-40,14 -34,8 M32,18 Q36,8 34,-2 Q32,-10 26,-18 Q22,-22 18,-24 M26,-18 Q24,-12 28,-6 Q32,-10 26,-18 M32,-6 Q30,0 34,6 Q38,2 32,-6 M34,8 Q32,14 36,18 Q40,14 34,8 M-16,22 Q-8,20 0,22 Q8,20 16,22",
  },
  2: {
    filled: "M0,-38 L-22,-24 L-22,6 Q-22,30 0,40 Q22,30 22,6 L22,-24Z",
    stroked: "M0,-30 L-16,-20 L-16,4 Q-16,24 0,32 Q16,24 16,4 L16,-20Z M0,-24 L4,-14 L14,-14 L6,-8 L9,2 L0,-4 L-9,2 L-6,-8 L-14,-14 L-4,-14Z M-10,14 L10,14 M-12,20 L12,20 M-10,26 L10,26",
  },
  3: {
    filled: "M0,-40 L-4,-34 L-4,-10 L-16,-10 L-16,4 L-4,4 L-4,10 L-16,10 L-16,24 L-4,24 L-4,34 L4,34 L4,24 L16,24 L16,10 L4,10 L4,4 L16,4 L16,-10 L4,-10 L4,-34Z",
    stroked: "M-22,-16 C-20,-22 -16,-26 -12,-28 Q-6,-30 0,-30 Q6,-30 12,-28 C16,-26 20,-22 22,-16 M-22,-16 L-26,-12 L-24,-6 L-28,-2 M22,-16 L26,-12 L24,-6 L28,-2 M-16,-4 C-14,-6 -10,-8 -8,-8 L-4,-10 M16,-4 C14,-6 10,-8 8,-8 L4,-10 M-8,16 L-12,16 M8,16 L12,16 M-14,30 Q-10,36 0,38 Q10,36 14,30",
  },
  4: {
    filled: "M0,-36 L6,-14 L28,-14 L10,-2 L16,20 L0,8 L-16,20 L-10,-2 L-28,-14 L-6,-14Z",
    stroked: "M0,-42 L0,-36 M0,8 L0,14 M-16,20 L-20,24 M16,20 L20,24 M-28,-14 L-32,-16 M28,-14 L32,-16 M-3,18 Q-10,24 -18,26 Q-26,26 -32,22 M3,18 Q10,24 18,26 Q26,26 32,22 M-32,22 Q-28,28 -22,30 M32,22 Q28,28 22,30 M0,14 L2,20 L-2,20Z",
  },
  5: {
    filled: "M0,-28 C-4,-28 -6,-26 -6,-24 C-6,-22 -4,-20 0,-20 C4,-20 6,-22 6,-24 C6,-26 4,-28 0,-28Z M-20,-20 C-24,-20 -26,-18 -26,-16 C-26,-14 -24,-12 -20,-12 C-16,-12 -14,-14 -14,-16 C-14,-18 -16,-20 -20,-20Z M20,-20 C16,-20 14,-18 14,-16 C14,-14 16,-12 20,-12 C24,-12 26,-14 26,-16 C26,-18 24,-20 20,-20Z",
    stroked: "M0,-20 L0,-6 M0,-6 L-10,6 L-10,20 M0,-6 L10,6 L10,20 M-20,-12 L-14,0 L-10,6 M20,-12 L14,0 L10,6 M-10,6 L-22,10 L-28,20 M10,6 L22,10 L28,20 M-6,-6 L-14,0 M6,-6 L14,0 M-16,4 Q-20,10 -22,10 M16,4 Q20,10 22,10 M-32,24 Q-28,28 -22,28 M32,24 Q28,28 22,28 M-14,24 Q-8,28 0,28 Q8,28 14,24",
  },
  6: {
    filled: "M-8,-14 L-20,-14 L-20,22 L-8,22Z M8,-14 L20,-14 L20,22 L8,22Z M-20,22 L-8,22 L-8,34 L-14,34Z M8,22 L20,22 L14,34 L8,34Z",
    stroked: "M-20,-14 L-20,-24 C-20,-30 -16,-36 -10,-36 L-4,-36 C0,-36 2,-34 2,-32 L2,-14 M20,-14 L20,-24 C20,-30 16,-36 10,-36 L4,-36 C0,-36 -2,-34 -2,-32 L-2,-14 M-14,-14 L-14,22 M14,-14 L14,22 M-20,0 L-8,0 M8,0 L20,0 M-20,10 L-8,10 M8,10 L20,10 M-14,34 L-16,40 M14,34 L16,40 M-6,-32 L-6,-24 M6,-32 L6,-24 M0,-28 L0,-20 M-4,-8 L4,-8 M-4,4 L4,4 M-4,16 L4,16",
  },
  7: {
    filled: "M0,0 A26,26 0 1,1 0,-0.01Z M0,0 A18,18 0 1,0 0,-0.01Z",
    stroked: "M0,-26 L0,-38 M0,26 L0,38 M-26,0 L-38,0 M26,0 L38,0 M-18.4,-18.4 L-24,-24 M18.4,-18.4 L24,-24 M-18.4,18.4 L-24,24 M18.4,18.4 L24,24 M0,-18 L6,-6 L18,0 L6,6 L0,18 L-6,6 L-18,0 L-6,-6Z M0,-10 L0,-6 M0,10 L0,6 M-10,0 L-6,0 M10,0 L6,0 M-38,0 L-40,-2 L-40,2Z M0,-38 L-2,-40 L2,-40Z M38,0 L40,-2 L40,2Z M0,38 L-2,40 L2,40Z",
  },
  8: {
    filled: "M-4,-40 L4,-40 L6,-18 L10,-18 L0,0 L-10,-18 L-6,-18Z M0,0 L-8,8 L-6,14 L-12,16 L-8,22 L-14,26 L-6,30 L0,40 L6,30 L14,26 L8,22 L12,16 L6,14 L8,8Z",
    stroked: "M-8,-36 L-12,-30 M8,-36 L12,-30 M-14,-28 L-10,-24 M14,-28 L10,-24 M-16,32 Q-20,36 -24,34 M16,32 Q20,36 24,34 M-6,40 L-4,44 M6,40 L4,44 M0,40 L0,46 M-18,30 Q-22,28 -24,24 M18,30 Q22,28 24,24 M-10,6 L-16,4 M10,6 L16,4 M-12,20 L-18,22 M12,20 L18,22",
  },
  9: {
    filled: "M0,-36 L-24,-22 L-24,8 Q-24,32 0,42 Q24,32 24,8 L24,-22Z",
    stroked: "M0,-28 L-18,-18 L-18,6 Q-18,26 0,34 Q18,26 18,6 L18,-18Z M0,-16 A10,10 0 1,1 0,4 A10,10 0 1,1 0,-16Z M0,-10 A4,4 0 1,1 0,-2 A4,4 0 1,1 0,-10Z M-6,8 Q-10,14 -14,16 M6,8 Q10,14 14,16 M-14,16 L-10,20 L-14,24 M14,16 L10,20 L14,24 M0,4 L0,12 M-4,10 L4,10",
  },
  10: {
    filled: "M-22,4 L-16,-16 L-8,0 L0,-24 L8,0 L16,-16 L22,4 L22,12 L-22,12Z",
    stroked: "M-24,16 Q-28,8 -26,-2 Q-24,-10 -18,-18 Q-14,-22 -10,-24 M-18,-18 Q-16,-12 -20,-6 Q-24,-10 -18,-18 M-24,-4 Q-22,2 -26,8 Q-30,4 -24,-4 M-26,10 Q-24,16 -28,20 Q-32,16 -26,10 M24,16 Q28,8 26,-2 Q24,-10 18,-18 Q14,-22 10,-24 M18,-18 Q16,-12 20,-6 Q24,-10 18,-18 M24,-4 Q22,2 26,8 Q30,4 24,-4 M26,10 Q24,16 28,20 Q32,16 26,10 M-8,16 Q-4,18 0,16 Q4,18 8,16 M0,-18 A1.5,1.5 0 1,1 0,-15 A1.5,1.5 0 1,1 0,-18 M-8,-10 A1,1 0 1,1 -8,-8 A1,1 0 1,1 -8,-10 M8,-10 A1,1 0 1,1 8,-8 A1,1 0 1,1 8,-10",
  },
  11: {
    filled: "M12,-20 A8,8 0 1,1 12,-19.99Z M12,-20 Q4,-10 -8,0 Q-20,10 -32,14 Q-24,10 -16,4 Q-8,-2 0,-10 Q6,-16 12,-20Z",
    stroked: "M-32,14 Q-36,16 -40,16 M-32,14 Q-34,18 -34,22 M-24,10 Q-30,12 -34,10 M-16,4 Q-22,8 -26,4 M-8,0 Q-6,6 -10,10 M6,-14 Q2,-8 -4,0 M16,-22 Q22,-26 26,-24 M18,-16 Q22,-12 28,-12 M14,-26 Q18,-30 16,-34 M10,-14 Q14,-10 18,-10 M20,-28 Q16,-32 18,-36 M-20,18 Q-16,22 -18,26 M-28,22 Q-24,26 -26,30 M4,-6 A1.5,1.5 0 1,1 4,-4.5 A1.5,1.5 0 1,1 4,-6 M-12,6 A1,1 0 1,1 -12,7 A1,1 0 1,1 -12,6 M-24,14 A1,1 0 1,1 -24,15 A1,1 0 1,1 -24,14",
  },
  12: {
    filled: "M0,-32 L-6,-20 L-18,-16 L-10,-6 L-14,8 L0,2 L14,8 L10,-6 L18,-16 L6,-20Z M-24,14 Q-28,20 -24,26 Q-18,30 -12,28 Q-6,26 -4,20 M24,14 Q28,20 24,26 Q18,30 12,28 Q6,26 4,20",
    stroked: "M0,-38 L0,-32 M-18,-16 L-24,-18 M18,-16 L24,-18 M-14,8 L-18,12 M14,8 L18,12 M-24,26 Q-26,32 -22,36 M24,26 Q26,32 22,36 M-12,28 Q-10,34 -14,38 M12,28 Q10,34 14,38 M-4,20 Q-2,26 -6,30 M4,20 Q2,26 6,30 M0,2 L0,10 M-28,18 Q-32,14 -34,18 Q-32,22 -28,20 M28,18 Q32,14 34,18 Q32,22 28,20 M-30,24 Q-34,22 -36,26 Q-34,30 -30,28 M30,24 Q34,22 36,26 Q34,30 30,28",
  },
};

function EmblemOverlay({ cardId, side = "front" }: { cardId: number; side?: "front" | "back" }) {
  const emblem = EMBLEM_PATHS[cardId];
  const colors = EMBLEM_COLORS[cardId] || EMBLEM_GOLD;
  if (!emblem) return null;

  const uid = `emb-${side}-${cardId}`;
  const gFill = `${uid}-fill`;
  const gStroke = `${uid}-stroke`;
  const gRing = `${uid}-ring`;
  const gBg = `${uid}-bg`;
  const fId = `${uid}-f`;
  const [c1, c2, c3, c4] = colors;

  const isBack = side === "back";
  const cx = isBack ? 285 : 195;
  const cy = isBack ? 40 : 101;
  const scale = isBack ? 0.38 : 1;

  return (
    <svg
      viewBox="0 0 320 202"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      style={{ borderRadius: 20 }}
    >
      <defs>
        <linearGradient id={gFill} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c2} />
          <stop offset="30%" stopColor={c1} />
          <stop offset="55%" stopColor={c4} />
          <stop offset="80%" stopColor={c3} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>

        <linearGradient id={gStroke} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c2} />
          <stop offset="45%" stopColor={c1} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>

        <linearGradient id={gRing} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={c2} />
          <stop offset="30%" stopColor={c1} />
          <stop offset="60%" stopColor={c4} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>

        <radialGradient id={gBg} cx="0.45" cy="0.4" r="0.55">
          <stop offset="0%" stopColor={c3} stopOpacity="0.3" />
          <stop offset="50%" stopColor={c3} stopOpacity="0.12" />
          <stop offset="100%" stopColor={c3} stopOpacity="0" />
        </radialGradient>

        <filter id={fId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation={isBack ? 1.5 : 3} result="shadow" />
          <feOffset in="shadow" dx={isBack ? 0.8 : 1.5} dy={isBack ? 1 : 2.5} result="shadowOff" />
          <feFlood floodColor="rgba(0,0,0,0.5)" result="shadowColor" />
          <feComposite in="shadowColor" in2="shadowOff" operator="in" result="dropShadow" />

          <feOffset in="SourceAlpha" dx={isBack ? -0.5 : -1} dy={isBack ? -0.5 : -1.2} result="hlOff" />
          <feGaussianBlur in="hlOff" stdDeviation={isBack ? 0.4 : 0.8} result="hlBlur" />
          <feFlood floodColor={c2} floodOpacity="0.6" result="hlColor" />
          <feComposite in="hlColor" in2="hlBlur" operator="in" result="embossHL" />

          <feOffset in="SourceAlpha" dx={isBack ? 0.6 : 1.2} dy={isBack ? 0.8 : 1.5} result="shOff" />
          <feGaussianBlur in="shOff" stdDeviation={isBack ? 0.5 : 1} result="shBlur" />
          <feFlood floodColor="rgba(0,0,0,0.6)" result="shColor" />
          <feComposite in="shColor" in2="shBlur" operator="in" result="embossSH" />

          <feMerge>
            <feMergeNode in="dropShadow" />
            <feMergeNode in="embossSH" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="embossHL" />
          </feMerge>
        </filter>
      </defs>

      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        <circle r="62" fill={`url(#${gBg})`} />

        <circle r="56" fill="none" stroke={`url(#${gRing})`} strokeWidth="2" opacity="0.3" filter={`url(#${fId})`} />
        <circle r="52" fill="none" stroke={`url(#${gRing})`} strokeWidth="3.5" filter={`url(#${fId})`} />
        <circle r="49" fill="none" stroke={`url(#${gRing})`} strokeWidth="1" opacity="0.4" />

        <g filter={`url(#${fId})`} transform="scale(1.05)">
          <path d={emblem.filled} fill="none" stroke={`url(#${gFill})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d={emblem.stroked} fill="none" stroke={`url(#${gStroke})`} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        </g>
      </g>
    </svg>
  );
}

export function MetalCardFront({
  cardId,
  cardName,
  serialNumber,
  pattern,
  size = "normal",
}: {
  cardId: number;
  cardName: string;
  serialNumber?: string;
  pattern?: string;
  size?: "compact" | "normal" | "large";
}) {
  const mat = METAL_MATERIALS[cardId] || DEFAULT_MATERIAL;
  const IconComponent = CARD_ICONS[pattern || ""] || Award;

  const sizeConfig = {
    compact: { label: "text-[6px]", title: "text-[11px]", serial: "text-[6px]", chip: "w-7 h-5", icon: "h-3 w-3", pad: "p-3", divW: "w-6" },
    normal: { label: "text-[7px]", title: "text-sm", serial: "text-[7px]", chip: "w-9 h-6", icon: "h-3.5 w-3.5", pad: "p-4", divW: "w-8" },
    large: { label: "text-[9px]", title: "text-lg", serial: "text-[9px]", chip: "w-12 h-8", icon: "h-5 w-5", pad: "p-6", divW: "w-10" },
  }[size];

  return (
    <div
      className={`absolute inset-0 ${sizeConfig.pad} flex flex-col justify-between`}
      style={{
        borderRadius: "20px",
        background: mat.base,
        boxShadow: `${mat.edgeHighlight}, 0 25px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)`,
        backfaceVisibility: "hidden",
        overflow: "hidden",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "20px", background: mat.texture }} />

      <EmblemOverlay cardId={cardId} />

      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "20px", background: mat.lighting }} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: "20px" }}>
        <div
          className="metal-card-shimmer"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            background: `linear-gradient(90deg, transparent 0%, ${mat.shimmerColor} 50%, transparent 100%)`,
          }}
        />
      </div>

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p
            className={`${sizeConfig.label} font-bold uppercase tracking-[0.15em]`}
            style={{
              color: mat.textSub,
              textShadow: `0 1px 2px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.08)`,
            }}
          >
            Private Recognition Series
          </p>
        </div>
        <IconComponent
          className={sizeConfig.icon}
          style={{ color: mat.textSub, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-1.5">
        <h3
          className={`${sizeConfig.title} font-bold uppercase tracking-wide text-center leading-tight`}
          style={{
            color: mat.textMain,
            textShadow: `0 1px 0 rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), 0 -1px 0 rgba(255,255,255,0.06), 0 0 2px rgba(255,255,255,0.05)`,
          }}
        >
          {cardName}
        </h3>

        <div className={sizeConfig.divW} style={{ height: "1px", background: mat.divider }} />
      </div>

      <div className="relative z-10 flex justify-between items-end">
        <div>
          <p
            className={`${sizeConfig.serial} font-mono uppercase tracking-wider`}
            style={{
              color: mat.textSub,
              textShadow: `0 1px 2px rgba(0,0,0,0.5)`,
            }}
          >
            {serialNumber || `CM-${String(cardId).padStart(3, "0")}`}
          </p>
        </div>
        <p
          className={`${sizeConfig.serial} font-bold uppercase tracking-[0.2em]`}
          style={{
            color: mat.textSub,
            textShadow: `0 1px 2px rgba(0,0,0,0.5)`,
          }}
        >
          Club Master
        </p>
      </div>

      {mat.hasGlow && (
        <div
          className="absolute -inset-2 pointer-events-none metal-glow-aura"
          style={{
            borderRadius: "24px",
            background: `radial-gradient(ellipse at center, ${mat.shimmerColor}, transparent 70%)`,
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
}

export function MetalCardBack({
  cardId,
  cardName,
  description,
  customReason,
  issuerName,
  issuedAt,
  rarityLabel,
  size = "normal",
}: {
  cardId: number;
  cardName: string;
  description: string;
  customReason?: string | null;
  issuerName?: string | null;
  issuedAt?: string;
  rarityLabel?: string;
  size?: "compact" | "normal" | "large";
}) {
  const mat = METAL_MATERIALS[cardId] || DEFAULT_MATERIAL;

  const sizeConfig = {
    compact: { label: "text-[7px]", body: "text-[8px]", pad: "p-3", gap: "space-y-1.5" },
    normal: { label: "text-[8px]", body: "text-[9px]", pad: "p-4", gap: "space-y-2" },
    large: { label: "text-xs", body: "text-sm", pad: "p-6", gap: "space-y-3" },
  }[size];

  return (
    <div
      className={`absolute inset-0 ${sizeConfig.pad} flex flex-col justify-between`}
      style={{
        borderRadius: "20px",
        background: mat.base,
        boxShadow: `${mat.edgeHighlight}, 0 25px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)`,
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        overflow: "hidden",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "20px", background: mat.texture }} />

      <EmblemOverlay cardId={cardId} side="back" />

      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "20px", background: mat.lighting }} />

      <div className={`relative z-10 ${sizeConfig.gap}`}>
        <p
          className={`${sizeConfig.label} font-bold uppercase tracking-wider`}
          style={{ color: mat.textMain, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          {cardName}
        </p>
        <div style={{ height: "1px", background: mat.divider }} />
        <p
          className={`${sizeConfig.body} leading-relaxed`}
          style={{ color: mat.textSub }}
        >
          {description}
        </p>
      </div>

      <div className={`relative z-10 ${sizeConfig.gap}`}>
        {customReason && (
          <div
            className="rounded-md p-2"
            style={{ background: "rgba(0,0,0,0.2)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)" }}
          >
            <p className={`${sizeConfig.label} font-semibold uppercase tracking-wider mb-0.5`} style={{ color: mat.textSub }}>
              Personal Note
            </p>
            <p className={`${sizeConfig.body} leading-relaxed line-clamp-2`} style={{ color: mat.textMain }}>
              {customReason}
            </p>
          </div>
        )}
        {issuerName && (
          <p className={sizeConfig.label} style={{ color: mat.textSub }}>
            Awarded by {issuerName}
          </p>
        )}
        <div className="flex justify-between items-end">
          {issuedAt && (
            <p className={sizeConfig.label} style={{ color: mat.textSub }}>
              {issuedAt}
            </p>
          )}
          {rarityLabel && (
            <p
              className={`${sizeConfig.label} font-bold uppercase tracking-widest`}
              style={{ color: mat.textMain, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              {rarityLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function getMetalMaterial(cardId: number): MetalMaterial {
  return METAL_MATERIALS[cardId] || DEFAULT_MATERIAL;
}

export { CARD_ICONS };
