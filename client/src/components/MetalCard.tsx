import { Award, Heart, Shield, Scale, Star, Network, Anvil, Compass, Zap, EyeOff, Crown } from "lucide-react";

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

const IS_DARK_METAL: Record<number, boolean> = {
  1: false, 2: false, 3: true, 4: false, 5: true,
  6: true, 7: true, 8: true, 9: true, 10: false,
};

const GRAIN_ANGLE: Record<number, number> = {
  1: 90, 2: 45, 3: 60, 4: 135, 5: 0,
  6: 45, 7: 45, 8: 90, 9: 0, 10: 135,
};

const E = {
  shuttlecockBody: "M0,38 Q-4,35 -5,30 Q-5,26 -2,24 L2,24 Q5,26 5,30 Q4,35 0,38Z",
  shuttlecockCone: "M-2,24 Q-16,16 -20,-2 Q-22,-16 -16,-28 Q-10,-36 0,-42 Q10,-36 16,-28 Q22,-16 20,-2 Q16,16 2,24",
  shuttlecockFeathers: "M-13,6 Q-18,-8 -10,-24 M-7,16 Q-14,2 -5,-16 M7,16 Q14,2 5,-16 M13,6 Q18,-8 10,-24 M0,24 L0,-42 M-10,-18 Q-14,-30 -6,-38 M10,-18 Q14,-30 6,-38",
  shuttlecockMicro: "M-4,36 Q-8,34 -10,30 M4,36 Q8,34 10,30 M-8,28 Q-12,24 -14,18 M8,28 Q12,24 14,18 M-14,12 Q-18,6 -19,0 M14,12 Q18,6 19,0",

  racketHead: "M0,-42 Q-18,-42 -28,-24 Q-34,-6 -28,10 Q-18,24 0,24 Q18,24 28,10 Q34,-6 28,-24 Q18,-42 0,-42Z",
  racketStrings: "M-26,-34 L26,-34 M-30,-20 L30,-20 M-32,-6 L32,-6 M-30,8 L30,8 M-26,20 L26,20 M-16,-41 L-16,23 M-6,-42 L-6,24 M6,-42 L6,24 M16,-41 L16,23",
  racketHandle: "M-4,24 L-4,50 L4,50 L4,24 M-3,50 L-3,58 L3,58 L3,50 M-6,56 L6,56",

  courtOuter: "M-55,-32 L55,-32 L55,32 L-55,32Z",
  courtCenter: "M-55,0 L55,0",
  courtInner: "M0,-32 L0,32 M-38,-32 L-38,32 M38,-32 L38,32 M-38,-16 L38,-16 M-38,16 L38,16",
  courtNet: "M-55,0 L55,0 M-55,-1 L55,-1 M-55,1 L55,1",

  smashArc: "M-55,38 Q-25,28 5,-2 Q25,-22 55,-38",
  smashArcTrail: "M-50,40 Q-20,30 8,0 M-52,36 Q-22,26 3,-4",
  smashImpact: "M55,-38 L52,-32 M55,-38 L58,-33 M55,-38 L53,-42 M55,-38 L50,-36",

  trajectoryTL: "M-42,28 Q-28,12 -22,-8 Q-18,-22 -24,-38",
  trajectoryBR: "M42,32 Q28,16 22,-4 Q18,-18 24,-34",
  trajectoryDots: "M-38,20 L-37,18 M-32,8 L-31,6 M-26,-4 L-25,-6 M-22,-14 L-21,-16",

  laurelL: "M0,38 Q-22,32 -38,18 Q-48,6 -50,-10 Q-52,-22 -46,-34 Q-40,-42 -30,-46 M-30,-46 Q-26,-38 -32,-30 Q-38,-34 -30,-46 M-38,-36 Q-34,-28 -40,-20 Q-44,-24 -38,-36 M-44,-22 Q-40,-14 -46,-6 Q-50,-10 -44,-22 M-48,-8 Q-44,0 -48,8 Q-52,4 -48,-8 M-48,10 Q-44,18 -48,24 Q-52,20 -48,10",
  laurelR: "M0,38 Q22,32 38,18 Q48,6 50,-10 Q52,-22 46,-34 Q40,-42 30,-46 M30,-46 Q26,-38 32,-30 Q38,-34 30,-46 M38,-36 Q34,-28 40,-20 Q44,-24 38,-36 M44,-22 Q40,-14 46,-6 Q50,-10 44,-22 M48,-8 Q44,0 48,8 Q52,4 48,-8 M48,10 Q44,18 48,24 Q52,20 48,10",
  laurelLeafL: "M-32,-40 Q-28,-32 -34,-24 M-40,-30 Q-36,-22 -42,-14 M-46,-16 Q-42,-8 -48,0 M-50,-2 Q-46,6 -50,14",
  laurelLeafR: "M32,-40 Q28,-32 34,-24 M40,-30 Q36,-22 42,-14 M46,-16 Q42,-8 48,0 M50,-2 Q46,6 50,14",

  shieldOuter: "M0,-42 L-28,-26 L-28,8 Q-28,36 0,48 Q28,36 28,8 L28,-26Z",
  shieldInner: "M0,-34 L-20,-22 L-20,6 Q-20,28 0,38 Q20,28 20,6 L20,-22Z",
  shieldBevel: "M0,-38 L-24,-24 L-24,7 Q-24,32 0,43 Q24,32 24,7 L24,-24Z",

  crownBase: "M-22,6 L-22,14 L22,14 L22,6",
  crownPoints: "M-22,6 L-16,-14 L-8,2 L0,-22 L8,2 L16,-14 L22,6",
  crownJewels: "M0,-16 A2,2 0 1,1 0,-12 A2,2 0 1,1 0,-16Z M-12,-8 A1.5,1.5 0 1,1 -12,-5 A1.5,1.5 0 1,1 -12,-8Z M12,-8 A1.5,1.5 0 1,1 12,-5 A1.5,1.5 0 1,1 12,-8Z",

  featherV: "M-8,8 L0,-10 L8,8 M-5,5 L0,-4 L5,5",
  featherStrand: "M0,12 Q-2,4 0,-12 M-4,10 Q-5,0 -2,-10 M4,10 Q5,0 2,-10",

  starBurst: "M0,-16 L3,-6 L14,-6 L5,1 L8,12 L0,6 L-8,12 L-5,1 L-14,-6 L-3,-6Z",
  starRays: "M0,-20 L0,-14 M14,-6 L10,-5 M10,14 L7,10 M-10,14 L-7,10 M-14,-6 L-10,-5",

  diamond: "M0,-12 L10,0 L0,12 L-10,0Z",
  diamondInner: "M0,-7 L6,0 L0,7 L-6,0Z",

  compassOuter: "M0,-32 L5,-8 L32,0 L5,8 L0,32 L-5,8 L-32,0 L-5,-8Z",
  compassInner: "M0,-22 L3,-5 L22,0 L3,5 L0,22 L-3,5 L-22,0 L-3,-5Z",
  compassTicks: "M0,-28 L0,-24 M28,0 L24,0 M0,28 L0,24 M-28,0 L-24,0 M18,-18 L16,-16 M18,18 L16,16 M-18,18 L-16,16 M-18,-18 L-16,-16",

  crossedL: "M-8,-35 Q-20,-35 -28,-22 Q-32,-8 -28,6 Q-20,16 -8,16 Q4,16 12,6 Q16,-8 12,-22 Q4,-35 -8,-35Z M-10,16 L-14,38 M-6,16 L-2,38",
  crossedR: "M8,-35 Q20,-35 28,-22 Q32,-8 28,6 Q20,16 8,16 Q-4,16 -12,6 Q-16,-8 -12,-22 Q-4,-35 8,-35Z M10,16 L14,38 M6,16 L2,38",

  lightningSmash: "M-30,30 L-5,8 L-15,6 L15,-12 L5,-10 L30,-35",
  lightningGlow: "M-28,28 L-3,6 M17,-14 L32,-37",

  eyeOuter: "M-25,0 Q0,-20 25,0 Q0,20 -25,0Z",
  eyeInner: "M0,-8 A8,8 0 1,1 0,8 A8,8 0 1,1 0,-8Z",
  eyePupil: "M0,-4 A4,4 0 1,1 0,4 A4,4 0 1,1 0,-4Z",

  heartShape: "M0,18 Q-10,8 -16,-2 Q-20,-12 -14,-20 Q-8,-26 0,-18 Q8,-26 14,-20 Q20,-12 16,-2 Q10,8 0,18Z",

  sealRing: "M0,-28 A28,28 0 1,1 0,28 A28,28 0 1,1 0,-28Z M0,-22 A22,22 0 1,1 0,22 A22,22 0 1,1 0,-22Z",
  sealDots: "M0,-25 L0,-24 M18,-18 L17,-17 M25,0 L24,0 M18,18 L17,17 M0,25 L0,24 M-18,18 L-17,17 M-25,0 L-24,0 M-18,-18 L-17,-17",
};

type EngPiece = {
  paths: (keyof typeof E)[];
  x: number;
  y: number;
  s?: number;
  r?: number;
  o?: number;
  fill?: boolean;
  sw?: number;
};

const CARD_ENGRAVINGS: Record<number, EngPiece[]> = {
  1: [
    { paths: ['heartShape'], x: 160, y: 88, s: 1.8, o: 0.06, fill: true },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockFeathers'], x: 160, y: 92, s: 0.55, o: 0.07 },
    { paths: ['trajectoryTL', 'trajectoryDots'], x: 55, y: 50, s: 0.5, o: 0.05 },
    { paths: ['trajectoryBR'], x: 268, y: 155, s: 0.45, o: 0.04 },
    { paths: ['featherV'], x: 278, y: 38, s: 1.1, r: 15, o: 0.05 },
    { paths: ['featherV'], x: 262, y: 52, s: 0.9, r: 15, o: 0.04 },
    { paths: ['featherStrand'], x: 42, y: 160, s: 0.7, r: -20, o: 0.04 },
    { paths: ['sealRing', 'sealDots'], x: 270, y: 165, s: 0.35, o: 0.04 },
  ],
  2: [
    { paths: ['shieldOuter', 'shieldBevel'], x: 258, y: 130, s: 0.55, o: 0.06 },
    { paths: ['racketHead', 'racketHandle'], x: 258, y: 125, s: 0.22, o: 0.05 },
    { paths: ['smashArc', 'smashArcTrail'], x: 155, y: 95, s: 1.1, r: -5, o: 0.05 },
    { paths: ['featherV'], x: 48, y: 38, s: 1.4, o: 0.05 },
    { paths: ['featherV'], x: 72, y: 50, s: 1.2, o: 0.04 },
    { paths: ['featherV'], x: 48, y: 62, s: 1.0, o: 0.04 },
    { paths: ['crownPoints', 'crownBase', 'crownJewels'], x: 60, y: 165, s: 0.5, o: 0.05 },
    { paths: ['featherStrand'], x: 290, y: 42, s: 0.6, r: 25, o: 0.04 },
  ],
  3: [
    { paths: ['courtOuter', 'courtCenter', 'courtInner', 'courtNet'], x: 160, y: 100, s: 1.25, r: 0, o: 0.035 },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockFeathers'], x: 115, y: 85, s: 0.42, r: -15, o: 0.06 },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockFeathers'], x: 205, y: 85, s: 0.42, r: 15, o: 0.06 },
    { paths: ['laurelL', 'laurelR', 'laurelLeafL', 'laurelLeafR'], x: 160, y: 105, s: 0.45, o: 0.055 },
    { paths: ['featherV'], x: 45, y: 170, s: 0.9, r: -10, o: 0.04 },
    { paths: ['featherV'], x: 275, y: 170, s: 0.9, r: 10, o: 0.04 },
  ],
  4: [
    { paths: ['smashArc', 'smashImpact'], x: 160, y: 100, s: 1.4, r: -8, o: 0.06 },
    { paths: ['starBurst', 'starRays'], x: 262, y: 42, s: 1.1, o: 0.07 },
    { paths: ['featherV'], x: 75, y: 148, s: 1.4, o: 0.05 },
    { paths: ['featherV'], x: 98, y: 162, s: 1.2, o: 0.04 },
    { paths: ['featherV'], x: 120, y: 148, s: 1.0, o: 0.04 },
    { paths: ['trajectoryBR'], x: 252, y: 142, s: 0.6, o: 0.05 },
    { paths: ['shuttlecockBody', 'shuttlecockCone'], x: 52, y: 45, s: 0.3, r: -30, o: 0.04 },
    { paths: ['featherStrand'], x: 290, y: 165, s: 0.5, r: 15, o: 0.04 },
  ],
  5: [
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockMicro'], x: 85, y: 72, s: 0.3, o: 0.06 },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockMicro'], x: 160, y: 60, s: 0.3, o: 0.06 },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockMicro'], x: 235, y: 72, s: 0.3, o: 0.06 },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockMicro'], x: 122, y: 115, s: 0.28, o: 0.05 },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockMicro'], x: 198, y: 115, s: 0.28, o: 0.05 },
    { paths: ['laurelL', 'laurelR'], x: 160, y: 162, s: 0.32, o: 0.05 },
    { paths: ['courtOuter'], x: 160, y: 100, s: 0.7, o: 0.025 },
  ],
  6: [
    { paths: ['crossedL'], x: 140, y: 88, s: 0.55, r: -18, o: 0.08 },
    { paths: ['crossedR'], x: 180, y: 88, s: 0.55, r: 18, o: 0.08 },
    { paths: ['diamond', 'diamondInner'], x: 75, y: 38, s: 1.0, o: 0.05 },
    { paths: ['diamond', 'diamondInner'], x: 245, y: 38, s: 1.0, o: 0.05 },
    { paths: ['diamond', 'diamondInner'], x: 75, y: 162, s: 1.0, o: 0.05 },
    { paths: ['diamond', 'diamondInner'], x: 245, y: 162, s: 1.0, o: 0.05 },
    { paths: ['diamond'], x: 160, y: 100, s: 1.8, o: 0.03 },
    { paths: ['sealRing', 'sealDots'], x: 160, y: 160, s: 0.3, o: 0.05 },
  ],
  7: [
    { paths: ['compassOuter', 'compassInner', 'compassTicks'], x: 160, y: 92, s: 1.0, o: 0.06 },
    { paths: ['racketHead'], x: 160, y: 82, s: 0.18, r: 45, o: 0.05 },
    { paths: ['shuttlecockBody', 'shuttlecockCone'], x: 55, y: 160, s: 0.28, r: -30, o: 0.05 },
    { paths: ['shuttlecockBody', 'shuttlecockCone'], x: 265, y: 40, s: 0.28, r: 30, o: 0.05 },
    { paths: ['featherV'], x: 265, y: 162, s: 0.9, r: -45, o: 0.04 },
    { paths: ['featherStrand'], x: 45, y: 42, s: 0.5, r: 20, o: 0.04 },
  ],
  8: [
    { paths: ['lightningSmash', 'lightningGlow'], x: 160, y: 100, s: 1.3, r: 0, o: 0.08 },
    { paths: ['trajectoryTL'], x: 75, y: 55, s: 0.7, o: 0.05 },
    { paths: ['trajectoryBR'], x: 245, y: 145, s: 0.7, o: 0.05 },
    { paths: ['shieldOuter', 'shieldInner'], x: 52, y: 158, s: 0.32, o: 0.06 },
    { paths: ['starBurst'], x: 52, y: 155, s: 0.4, o: 0.05 },
    { paths: ['smashArcTrail'], x: 160, y: 100, s: 0.8, r: 85, o: 0.04 },
    { paths: ['featherV'], x: 285, y: 42, s: 0.8, r: -20, o: 0.04 },
  ],
  9: [
    { paths: ['shieldOuter', 'shieldBevel', 'shieldInner'], x: 160, y: 88, s: 0.8, o: 0.06 },
    { paths: ['crossedL'], x: 148, y: 78, s: 0.28, r: -22, o: 0.05 },
    { paths: ['crossedR'], x: 172, y: 78, s: 0.28, r: 22, o: 0.05 },
    { paths: ['courtOuter', 'courtCenter', 'courtInner'], x: 160, y: 100, s: 1.1, o: 0.025 },
    { paths: ['eyeOuter', 'eyeInner', 'eyePupil'], x: 160, y: 88, s: 0.45, o: 0.04, fill: true },
    { paths: ['featherV'], x: 280, y: 168, s: 0.9, o: 0.04 },
    { paths: ['featherV'], x: 40, y: 168, s: 0.9, o: 0.04 },
  ],
  10: [
    { paths: ['shieldOuter', 'shieldBevel', 'shieldInner'], x: 160, y: 92, s: 0.9, o: 0.06 },
    { paths: ['shuttlecockBody', 'shuttlecockCone', 'shuttlecockFeathers', 'shuttlecockMicro'], x: 160, y: 82, s: 0.38, o: 0.055 },
    { paths: ['laurelL', 'laurelR', 'laurelLeafL', 'laurelLeafR'], x: 160, y: 98, s: 0.55, o: 0.06 },
    { paths: ['crownPoints', 'crownBase', 'crownJewels'], x: 160, y: 42, s: 0.7, o: 0.06 },
    { paths: ['featherV'], x: 48, y: 35, s: 1.1, r: 10, o: 0.04 },
    { paths: ['featherV'], x: 272, y: 35, s: 1.1, r: -10, o: 0.04 },
    { paths: ['featherV'], x: 48, y: 170, s: 0.9, r: -10, o: 0.04 },
    { paths: ['featherV'], x: 272, y: 170, s: 0.9, r: 10, o: 0.04 },
    { paths: ['sealRing', 'sealDots'], x: 160, y: 162, s: 0.3, o: 0.045 },
  ],
};

function EngravingOverlay({ cardId }: { cardId: number }) {
  const pieces = CARD_ENGRAVINGS[cardId];
  if (!pieces) return null;

  const isDark = IS_DARK_METAL[cardId] ?? false;
  const grainAngle = GRAIN_ANGLE[cardId] ?? 0;
  const fId = `eng-${cardId}`;
  const nId = `noise-${cardId}`;
  const gId = `grain-${cardId}`;

  const grooveColor = isDark ? "white" : "black";
  const grooveOp = isDark ? "0.12" : "0.18";
  const hlColor = "white";
  const hlOp = isDark ? "0.22" : "0.16";
  const strokeCol = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)";
  const fillCol = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";

  const hasEliteText = cardId === 2 || cardId === 10;

  return (
    <svg
      viewBox="0 0 320 202"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      style={{ borderRadius: 20 }}
    >
      <defs>
        <filter id={fId} x="-20%" y="-20%" width="140%" height="140%">
          <feOffset in="SourceAlpha" dx="1" dy="1" result="g1o" />
          <feGaussianBlur in="g1o" stdDeviation="0.5" result="g1b" />
          <feFlood floodColor={grooveColor} floodOpacity={grooveOp} result="g1c" />
          <feComposite in="g1c" in2="g1b" operator="in" result="groove1" />

          <feOffset in="SourceAlpha" dx="1.5" dy="1.5" result="g2o" />
          <feGaussianBlur in="g2o" stdDeviation="1" result="g2b" />
          <feFlood floodColor={grooveColor} floodOpacity={String(parseFloat(grooveOp) * 0.5)} result="g2c" />
          <feComposite in="g2c" in2="g2b" operator="in" result="groove2" />

          <feOffset in="SourceAlpha" dx="-0.5" dy="-0.5" result="hlo" />
          <feGaussianBlur in="hlo" stdDeviation="0.3" result="hlb" />
          <feFlood floodColor={hlColor} floodOpacity={hlOp} result="hlc" />
          <feComposite in="hlc" in2="hlb" operator="in" result="highlight" />

          <feMerge>
            <feMergeNode in="groove2" />
            <feMergeNode in="groove1" />
            <feMergeNode in="highlight" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <pattern
          id={gId}
          patternUnits="userSpaceOnUse"
          width="5"
          height="2.5"
          patternTransform={`rotate(${grainAngle})`}
        >
          <line
            x1="0" y1="1.25" x2="5" y2="1.25"
            stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}
            strokeWidth="0.4"
          />
        </pattern>

        <filter id={nId} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" seed={cardId * 7} result="turb" />
          <feColorMatrix type="saturate" values="0" in="turb" result="gray" />
          <feComposite in="gray" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <rect
        x="0" y="0" width="320" height="202" rx="20" ry="20"
        fill={`url(#${gId})`}
        opacity="0.5"
      />

      <rect
        x="0" y="0" width="320" height="202" rx="20" ry="20"
        filter={`url(#${nId})`}
        opacity="0.035"
      />

      {pieces.map((p, i) => {
        const tf = [
          `translate(${p.x},${p.y})`,
          p.s != null ? `scale(${p.s})` : "",
          p.r != null ? `rotate(${p.r})` : "",
        ].filter(Boolean).join(" ");

        return (
          <g key={i} transform={tf} opacity={p.o ?? 0.07} filter={`url(#${fId})`}>
            {p.paths.map((pk, j) => (
              <path
                key={j}
                d={E[pk]}
                fill={p.fill ? fillCol : "none"}
                stroke={strokeCol}
                strokeWidth={p.sw ?? 0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        );
      })}

      {hasEliteText && (
        <g opacity="0.045" filter={`url(#${fId})`}>
          <text
            x="160"
            y={cardId === 10 ? 188 : 192}
            textAnchor="middle"
            fill={strokeCol}
            stroke={strokeCol}
            strokeWidth="0.15"
            fontFamily="'Georgia', 'Times New Roman', serif"
            fontSize="7"
            fontStyle="italic"
            letterSpacing="4"
          >
            ELITE STANDARD
          </text>
        </g>
      )}
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

      <EngravingOverlay cardId={cardId} />

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
        <div
          className={`${sizeConfig.chip} rounded-md`}
          style={{
            background: mat.chip,
            boxShadow: `inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)`,
          }}
        >
          <div className="w-full h-full rounded-md" style={{
            background: "repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 4px)",
          }} />
        </div>

        <div className={sizeConfig.divW} style={{ height: "1px", background: mat.divider }} />

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

      <EngravingOverlay cardId={cardId} />

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
