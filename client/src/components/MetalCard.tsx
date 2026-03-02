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
  shuttleBody: "M-6,32 C-8,32 -9,28 -9,24 L-9,18 C-9,15 -7,14 -5,14 L5,14 C7,14 9,15 9,18 L9,24 C9,28 8,32 6,32Z",
  shuttleCone: "M-5,14 C-22,4 -26,-16 -20,-30 C-14,-40 -6,-46 0,-50 C6,-46 14,-40 20,-30 C26,-16 22,4 5,14",
  shuttleFeathers: "M0,14 L0,-50 M-5,14 L-16,-20 M5,14 L16,-20 M-4,14 L-22,-5 M4,14 L22,-5 M-3,14 L-12,-35 M3,14 L12,-35",
  shuttleRibs: "M-18,-10 C-20,-20 -14,-36 0,-48 M18,-10 C20,-20 14,-36 0,-48 M-12,4 C-16,-8 -10,-28 0,-44 M12,4 C16,-8 10,-28 0,-44",

  racketFrame: "M0,-44 C-20,-44 -30,-26 -30,-6 C-30,14 -20,28 0,28 C20,28 30,14 30,-6 C30,-26 20,-44 0,-44Z",
  racketStrH: "M-28,-30 L28,-30 M-30,-18 L30,-18 M-30,-6 L30,-6 M-30,6 L30,6 M-28,18 L28,18",
  racketStrV: "M-16,-43 L-16,27 M-6,-44 L-6,28 M6,-44 L6,28 M16,-43 L16,27",
  racketGrip: "M-5,28 L-5,52 L5,52 L5,28 M-5,36 L5,36 M-5,42 L5,42 M-5,48 L5,48 M-7,52 L7,52 L7,58 L-7,58Z",

  playerBody: "M0,-42 C-5,-42 -7,-39 -7,-36 C-7,-33 -5,-30 0,-30 C5,-30 7,-33 7,-36 C7,-39 5,-42 0,-42Z M-1,-30 L-6,-12 L-10,2 M1,-30 L6,-12 L10,2 M-10,2 L-6,2 L0,2 L6,2 L10,2",
  playerSmashArm: "M6,-24 L14,-32 L22,-40 L28,-46 M28,-46 L30,-50 C36,-58 42,-56 40,-50 C38,-46 32,-44 30,-48",
  playerBalanceArm: "M-6,-24 L-16,-18 L-22,-12",
  playerLegs: "M-4,2 L-12,18 L-14,32 L-18,34 M4,2 L14,16 L16,30 L20,32",

  playerSmashFill: "M0,-42 C-5,-42 -7,-39 -7,-36 C-7,-33 -4,-30 -1,-30 L-6,-12 L-10,2 L-4,2 L-12,18 L-14,32 L-18,34 L-14,34 L-10,30 L-6,18 L0,4 L8,18 L12,30 L16,34 L20,34 L16,30 L14,16 L10,2 L6,-12 L1,-30 C4,-30 7,-33 7,-36 C7,-39 5,-42 0,-42Z",

  crossedRacketL: "M-12,-38 C-28,-38 -36,-22 -36,-4 C-36,14 -28,26 -12,26 C4,26 12,14 12,-4 C12,-22 4,-38 -12,-38Z M-14,26 L-16,44 M-10,26 L-8,44",
  crossedRacketR: "M12,-38 C28,-38 36,-22 36,-4 C36,14 28,26 12,26 C-4,26 -12,14 -12,-4 C-12,-22 -4,-38 12,-38Z M14,26 L16,44 M10,26 L8,44",
  crossedStrings: "M-34,-24 L10,-24 M-36,-12 L12,-12 M-36,0 L12,0 M-36,12 L12,12 M-28,24 L4,24 M-10,-38 L10,-38 M-12,26 L-12,-4 M-24,26 L-24,-6 M0,22 L0,-10 M10,-36 L36,-36 M12,-24 L34,-24 M12,-12 L36,-12 M12,0 L36,0 M12,12 L28,12 M12,-38 L12,26 M24,26 L24,-6 M0,-34 L0,-10",

  courtLines: "M-55,-32 L55,-32 L55,32 L-55,32Z M-55,0 L55,0 M0,-32 L0,32 M-38,-32 L-38,32 M38,-32 L38,32 M-38,-16 L38,-16 M-38,16 L38,16",

  smashArc: "M-55,38 Q-25,28 5,-2 Q25,-22 55,-38",
  smashTrail: "M-50,40 Q-20,30 8,0 M-48,36 Q-18,26 3,-4",

  trajectoryTL: "M-42,28 Q-28,12 -22,-8 Q-18,-22 -24,-38",
  trajectoryBR: "M42,32 Q28,16 22,-4 Q18,-18 24,-34",

  laurelL: "M0,38 Q-22,32 -38,18 Q-48,6 -50,-10 Q-52,-22 -46,-34 Q-40,-42 -30,-46 M-30,-46 Q-26,-38 -32,-30 Q-38,-34 -30,-46 M-38,-36 Q-34,-28 -40,-20 Q-44,-24 -38,-36 M-44,-22 Q-40,-14 -46,-6 Q-50,-10 -44,-22 M-48,-8 Q-44,0 -48,8 Q-52,4 -48,-8 M-48,10 Q-44,18 -48,24 Q-52,20 -48,10",
  laurelR: "M0,38 Q22,32 38,18 Q48,6 50,-10 Q52,-22 46,-34 Q40,-42 30,-46 M30,-46 Q26,-38 32,-30 Q38,-34 30,-46 M38,-36 Q34,-28 40,-20 Q44,-24 38,-36 M44,-22 Q40,-14 46,-6 Q50,-10 44,-22 M48,-8 Q44,0 48,8 Q52,4 48,-8 M48,10 Q44,18 48,24 Q52,20 48,10",

  shieldOuter: "M0,-42 L-28,-26 L-28,8 Q-28,36 0,48 Q28,36 28,8 L28,-26Z",
  shieldInner: "M0,-34 L-20,-22 L-20,6 Q-20,28 0,38 Q20,28 20,6 L20,-22Z",

  crownFull: "M-22,6 L-16,-14 L-8,2 L0,-22 L8,2 L16,-14 L22,6 L22,14 L-22,14Z",

  featherV: "M-8,8 L0,-10 L8,8 M-5,5 L0,-4 L5,5",

  starBurst: "M0,-16 L3,-6 L14,-6 L5,1 L8,12 L0,6 L-8,12 L-5,1 L-14,-6 L-3,-6Z",

  diamond: "M0,-12 L10,0 L0,12 L-10,0Z",

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
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 255, y: 95, s: 1.1, o: 0.14 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers', 'shuttleRibs'], x: 70, y: 100, s: 0.7, o: 0.13, fill: true },
    { paths: ['racketFrame', 'racketStrH', 'racketStrV', 'racketGrip'], x: 160, y: 155, s: 0.3, r: -30, o: 0.10 },
    { paths: ['trajectoryTL'], x: 55, y: 50, s: 0.5, o: 0.06 },
    { paths: ['sealRing', 'sealDots'], x: 270, y: 168, s: 0.3, o: 0.06 },
  ],
  2: [
    { paths: ['playerSmashFill'], x: 80, y: 95, s: 1.0, o: 0.10, fill: true },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 80, y: 95, s: 1.0, o: 0.14 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers'], x: 250, y: 65, s: 0.55, r: 25, o: 0.12 },
    { paths: ['racketFrame', 'racketStrH', 'racketStrV', 'racketGrip'], x: 250, y: 145, s: 0.35, o: 0.10 },
    { paths: ['crownFull'], x: 160, y: 38, s: 0.5, o: 0.08, fill: true },
    { paths: ['smashArc', 'smashTrail'], x: 160, y: 100, s: 1.0, r: -5, o: 0.06 },
  ],
  3: [
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers', 'shuttleRibs'], x: 100, y: 88, s: 0.65, r: -12, o: 0.13 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers', 'shuttleRibs'], x: 220, y: 88, s: 0.65, r: 12, o: 0.13 },
    { paths: ['racketFrame', 'racketStrH', 'racketStrV'], x: 160, y: 145, s: 0.3, o: 0.10 },
    { paths: ['courtLines'], x: 160, y: 100, s: 1.2, o: 0.04 },
    { paths: ['laurelL', 'laurelR'], x: 160, y: 108, s: 0.42, o: 0.07 },
  ],
  4: [
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 160, y: 90, s: 1.2, o: 0.14 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers'], x: 65, y: 75, s: 0.5, r: -20, o: 0.12 },
    { paths: ['racketFrame', 'racketStrH', 'racketStrV', 'racketGrip'], x: 265, y: 135, s: 0.35, r: 15, o: 0.10 },
    { paths: ['starBurst'], x: 265, y: 42, s: 1.2, o: 0.09 },
    { paths: ['smashArc'], x: 160, y: 100, s: 1.3, r: -8, o: 0.06 },
  ],
  5: [
    { paths: ['racketFrame', 'racketStrH', 'racketStrV', 'racketGrip'], x: 80, y: 85, s: 0.55, r: -15, o: 0.12 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers', 'shuttleRibs'], x: 240, y: 80, s: 0.6, o: 0.12 },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 160, y: 130, s: 0.7, o: 0.10 },
    { paths: ['laurelL', 'laurelR'], x: 160, y: 170, s: 0.3, o: 0.06 },
    { paths: ['featherV'], x: 50, y: 165, s: 1.0, o: 0.06 },
    { paths: ['featherV'], x: 270, y: 165, s: 1.0, o: 0.06 },
  ],
  6: [
    { paths: ['crossedRacketL', 'crossedRacketR', 'crossedStrings'], x: 160, y: 85, s: 0.65, o: 0.14 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers'], x: 60, y: 55, s: 0.45, r: -25, o: 0.12 },
    { paths: ['playerSmashFill'], x: 265, y: 90, s: 0.8, o: 0.08, fill: true },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 265, y: 90, s: 0.8, o: 0.13 },
    { paths: ['diamond'], x: 55, y: 165, s: 1.2, o: 0.06 },
    { paths: ['diamond'], x: 265, y: 165, s: 1.2, o: 0.06 },
  ],
  7: [
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers', 'shuttleRibs'], x: 160, y: 80, s: 0.8, o: 0.13 },
    { paths: ['racketFrame', 'racketStrH', 'racketStrV', 'racketGrip'], x: 65, y: 115, s: 0.4, r: -25, o: 0.11 },
    { paths: ['racketFrame', 'racketStrH', 'racketStrV', 'racketGrip'], x: 255, y: 115, s: 0.4, r: 25, o: 0.11 },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 160, y: 155, s: 0.5, o: 0.08 },
    { paths: ['featherV'], x: 50, y: 40, s: 1.0, r: -15, o: 0.06 },
    { paths: ['featherV'], x: 270, y: 40, s: 1.0, r: 15, o: 0.06 },
  ],
  8: [
    { paths: ['playerSmashFill'], x: 160, y: 88, s: 1.3, o: 0.10, fill: true },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 160, y: 88, s: 1.3, o: 0.15 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers'], x: 60, y: 60, s: 0.5, r: -30, o: 0.12 },
    { paths: ['racketFrame', 'racketStrH', 'racketStrV'], x: 275, y: 150, s: 0.32, r: 20, o: 0.10 },
    { paths: ['smashArc', 'smashTrail'], x: 160, y: 100, s: 1.2, o: 0.07 },
    { paths: ['starBurst'], x: 285, y: 38, s: 0.8, o: 0.07 },
  ],
  9: [
    { paths: ['shieldOuter', 'shieldInner'], x: 160, y: 85, s: 0.85, o: 0.10 },
    { paths: ['crossedRacketL', 'crossedRacketR'], x: 160, y: 78, s: 0.35, o: 0.12 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers'], x: 60, y: 155, s: 0.4, r: -15, o: 0.10 },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 272, y: 145, s: 0.6, o: 0.10 },
    { paths: ['courtLines'], x: 160, y: 100, s: 1.0, o: 0.035 },
    { paths: ['featherV'], x: 50, y: 40, s: 0.9, o: 0.06 },
  ],
  10: [
    { paths: ['shieldOuter', 'shieldInner'], x: 160, y: 88, s: 0.9, o: 0.10 },
    { paths: ['shuttleBody', 'shuttleCone', 'shuttleFeathers', 'shuttleRibs'], x: 160, y: 80, s: 0.4, o: 0.12 },
    { paths: ['crossedRacketL', 'crossedRacketR', 'crossedStrings'], x: 160, y: 78, s: 0.25, o: 0.10 },
    { paths: ['laurelL', 'laurelR'], x: 160, y: 95, s: 0.5, o: 0.08 },
    { paths: ['crownFull'], x: 160, y: 38, s: 0.65, o: 0.09, fill: true },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 60, y: 145, s: 0.55, o: 0.09 },
    { paths: ['playerBody', 'playerSmashArm', 'playerBalanceArm', 'playerLegs'], x: 260, y: 145, s: 0.55, r: -15, o: 0.09 },
    { paths: ['sealRing', 'sealDots'], x: 160, y: 168, s: 0.25, o: 0.06 },
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
