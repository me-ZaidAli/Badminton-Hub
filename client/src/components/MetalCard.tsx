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
};

const EMBLEM_PATHS: Record<number, { filled: string; stroked: string }> = {
  1: {
    filled: "M0,26 C-5,26 -7,22 -7,18 L-7,12 C-7,10 -5,9 -3,9 L3,9 C5,9 7,10 7,12 L7,18 C7,22 5,26 0,26Z M-3,9 C-16,1 -20,-12 -16,-24 C-11,-32 -5,-38 0,-42 C5,-38 11,-32 16,-24 C20,-12 16,1 3,9Z",
    stroked: "M0,9 L0,-42 M-3,9 L-12,-14 M3,9 L12,-14 M-2,9 L-17,-3 M2,9 L17,-3 M-2,9 L-9,-28 M2,9 L9,-28 M-14,-6 C-16,-16 -10,-30 0,-40 M14,-6 C16,-16 10,-30 0,-40 M-10,2 C-13,-6 -8,-22 0,-36 M10,2 C13,-6 8,-22 0,-36",
  },
  2: {
    filled: "M0,-38 C-4,-38 -6,-35 -6,-33 C-6,-31 -4,-28 0,-28 C4,-28 6,-31 6,-33 C6,-35 4,-38 0,-38Z M-1,-28 L-5,-14 L-8,0 L-3,0 L-10,16 L-12,26 L-8,26 L-4,14 L0,2 L6,14 L10,26 L14,26 L12,16 L8,0 L5,-14 L1,-28Z",
    stroked: "M5,-22 L12,-28 L20,-36 L26,-42 L28,-46 C34,-52 38,-50 36,-46 C34,-42 28,-40 26,-44 M-5,-22 L-14,-16 L-20,-10 M22,-38 L28,-42 L30,-48 M-8,16 L-12,26 M10,16 L14,26",
  },
  3: {
    filled: "M-12,-32 C-26,-32 -32,-18 -32,-2 C-32,14 -26,24 -12,24 C2,24 8,14 8,-2 C8,-18 2,-32 -12,-32Z M12,-32 C26,-32 32,-18 32,-2 C32,14 26,24 12,24 C-2,24 -8,14 -8,-2 C-8,-18 -2,-32 12,-32Z",
    stroked: "M-30,-18 L6,-18 M-32,-8 L8,-8 M-32,2 L8,2 M-30,12 L6,12 M-26,20 L2,20 M-12,-32 L-12,24 M-22,0 L-22,22 M0,-28 L0,20 M8,-18 L30,-18 M8,-8 L32,-8 M8,2 L32,2 M8,12 L30,12 M12,-32 L12,24 M22,0 L22,22 M-12,24 L-14,38 M-10,24 L-8,38 M12,24 L14,38 M10,24 L8,38",
  },
  4: {
    filled: "M0,-36 C-14,-36 -22,-22 -22,-6 C-22,10 -14,22 0,22 C14,22 22,10 22,-6 C22,-22 14,-36 0,-36Z",
    stroked: "M-20,-24 L20,-24 M-22,-14 L22,-14 M-22,-4 L22,-4 M-22,6 L22,6 M-20,16 L20,16 M-10,-35 L-10,21 M0,-36 L0,22 M10,-35 L10,21 M-4,22 L-4,38 L4,38 L4,22 M-4,28 L4,28 M-4,34 L4,34 M0,-42 L2,-36 L8,-36 L3,-32 L5,-26 L0,-30 L-5,-26 L-3,-32 L-8,-36 L-2,-36Z",
  },
  5: {
    filled: "M-22,-28 C-34,-28 -40,-16 -40,-2 C-40,12 -34,22 -22,22 C-10,22 -4,12 -4,-2 C-4,-16 -10,-28 -22,-28Z M18,26 C14,26 12,22 12,18 L12,12 C12,10 14,9 16,9 L24,9 C26,9 28,10 28,12 L28,18 C28,22 26,26 22,26Z",
    stroked: "M-38,-16 L-6,-16 M-40,-6 L-4,-6 M-40,4 L-4,4 M-38,14 L-6,14 M-34,20 L-10,20 M-22,-28 L-22,22 M-32,-2 L-32,20 M-12,-24 L-12,20 M-22,22 L-24,34 M-20,22 L-18,34 M20,9 L20,-40 M16,9 L12,-14 M24,9 L28,-14 M14,-6 C12,-16 16,-30 20,-38 M26,-6 C28,-16 24,-30 20,-38",
  },
  6: {
    filled: "M0,-36 L-22,-22 L-22,6 Q-22,28 0,38 Q22,28 22,6 L22,-22Z",
    stroked: "M0,-28 L-16,-18 L-16,4 Q-16,22 0,30 Q16,22 16,4 L16,-18Z M-6,-18 C-12,-18 -16,-12 -16,-2 C-16,8 -12,14 -6,14 C2,14 6,8 6,-2 C6,-12 2,-18 -6,-18Z M-14,-10 L4,-10 M-16,-2 L6,-2 M-16,6 L6,6 M-6,-18 L-6,14 M-12,-2 L-12,12 M2,-16 L2,12 M-6,14 L-8,22 M-4,14 L-2,22",
  },
  7: {
    filled: "M0,-36 C-14,-36 -22,-22 -22,-6 C-22,10 -14,22 0,22 C14,22 22,10 22,-6 C22,-22 14,-36 0,-36Z",
    stroked: "M-20,-24 L20,-24 M-22,-14 L22,-14 M-22,-4 L22,-4 M-22,6 L22,6 M-20,16 L20,16 M-10,-35 L-10,21 M0,-36 L0,22 M10,-35 L10,21 M-4,22 L-4,38 L4,38 L4,22 M-4,28 L4,28 M-4,34 L4,34 M0,22 L0,42 M-3,38 L-8,38 M3,38 L8,38",
  },
  8: {
    filled: "M0,-38 C-4,-38 -6,-35 -6,-33 C-6,-31 -4,-28 0,-28 C4,-28 6,-31 6,-33 C6,-35 4,-38 0,-38Z M-1,-28 L-5,-14 L-8,0 L-3,0 L-10,16 L-12,26 L-8,26 L-4,14 L0,2 L6,14 L10,26 L14,26 L12,16 L8,0 L5,-14 L1,-28Z",
    stroked: "M5,-22 L12,-28 L20,-36 L26,-42 M-5,-22 L-14,-16 L-20,-10 M26,-42 L16,-28 L28,-26 L18,-14 L26,-12 M-22,8 L-30,-2 L-28,-12 L-34,-6 M28,-18 L32,-22 M28,-12 L34,-10",
  },
  9: {
    filled: "M0,26 C-5,26 -7,22 -7,18 L-7,12 C-7,10 -5,9 -3,9 L3,9 C5,9 7,10 7,12 L7,18 C7,22 5,26 0,26Z M-3,9 C-16,1 -20,-12 -16,-24 C-11,-32 -5,-38 0,-42 C5,-38 11,-32 16,-24 C20,-12 16,1 3,9Z",
    stroked: "M0,9 L0,-42 M-3,9 L-12,-14 M3,9 L12,-14 M-2,9 L-17,-3 M2,9 L17,-3 M-2,9 L-9,-28 M2,9 L9,-28 M-22,0 Q0,-16 22,0 Q0,16 -22,0Z M0,-8 A4,4 0 1,1 0,0 A4,4 0 1,1 0,-8Z",
  },
  10: {
    filled: "M-18,6 L-12,-12 L-5,2 L0,-20 L5,2 L12,-12 L18,6 L18,12 L-18,12Z M0,14 C-10,14 -16,24 -16,34 C-16,44 -10,52 0,52 C10,52 16,44 16,34 C16,24 10,14 0,14Z",
    stroked: "M-14,20 L14,20 M-16,28 L16,28 M-16,36 L16,36 M-14,46 L14,46 M-6,15 L-6,51 M0,14 L0,52 M6,15 L6,51 M-2,52 L-2,64 L2,64 L2,52 M-2,58 L2,58 M0,-14 A1.5,1.5 0 1,1 0,-11 A1.5,1.5 0 1,1 0,-14Z M-8,-6 A1,1 0 1,1 -8,-4 A1,1 0 1,1 -8,-6Z M8,-6 A1,1 0 1,1 8,-4 A1,1 0 1,1 8,-6Z",
  },
};

function EmblemOverlay({ cardId }: { cardId: number }) {
  const emblem = EMBLEM_PATHS[cardId];
  const colors = EMBLEM_COLORS[cardId] || EMBLEM_GOLD;
  if (!emblem) return null;

  const fId = `emb-${cardId}`;
  const gFill = `emb-fill-${cardId}`;
  const gStroke = `emb-stroke-${cardId}`;
  const gRing = `emb-ring-${cardId}`;
  const gBg = `emb-bg-${cardId}`;
  const gInner = `emb-inner-${cardId}`;
  const [c1, c2, c3, c4] = colors;

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

        <radialGradient id={gInner} cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor={c3} stopOpacity="0.15" />
          <stop offset="100%" stopColor={c3} stopOpacity="0.4" />
        </radialGradient>

        <filter id={fId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="shadow" />
          <feOffset in="shadow" dx="1.5" dy="2.5" result="shadowOff" />
          <feFlood floodColor="rgba(0,0,0,0.5)" result="shadowColor" />
          <feComposite in="shadowColor" in2="shadowOff" operator="in" result="dropShadow" />

          <feOffset in="SourceAlpha" dx="-1" dy="-1.2" result="hlOff" />
          <feGaussianBlur in="hlOff" stdDeviation="0.8" result="hlBlur" />
          <feFlood floodColor={c2} floodOpacity="0.6" result="hlColor" />
          <feComposite in="hlColor" in2="hlBlur" operator="in" result="embossHL" />

          <feOffset in="SourceAlpha" dx="1.2" dy="1.5" result="shOff" />
          <feGaussianBlur in="shOff" stdDeviation="1" result="shBlur" />
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

      <g transform="translate(190,101)">
        <circle r="58" fill={`url(#${gBg})`} />
        <circle r="50" fill={`url(#${gInner})`} />

        <circle r="50" fill="none" stroke={`url(#${gRing})`} strokeWidth="3.5" filter={`url(#${fId})`} />
        <circle r="47" fill="none" stroke={`url(#${gRing})`} strokeWidth="1.2" opacity="0.5" />
        <circle r="53" fill="none" stroke={c1} strokeWidth="0.5" opacity="0.3" />

        <g filter={`url(#${fId})`}>
          <path d={emblem.filled} fill={`url(#${gFill})`} opacity="0.9" />
          <path d={emblem.stroked} fill="none" stroke={`url(#${gStroke})`} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
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

      <EmblemOverlay cardId={cardId} />

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
