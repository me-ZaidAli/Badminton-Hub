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
    compact: { label: "text-[6px]", title: "text-[11px]", serial: "text-[6px]", chip: "w-7 h-5", icon: "h-3 w-3", iconLg: "h-4 w-4", pad: "p-3", divW: "w-6" },
    normal: { label: "text-[7px]", title: "text-sm", serial: "text-[7px]", chip: "w-9 h-6", icon: "h-3.5 w-3.5", iconLg: "h-5 w-5", pad: "p-4", divW: "w-8" },
    large: { label: "text-[9px]", title: "text-lg", serial: "text-[9px]", chip: "w-12 h-8", icon: "h-5 w-5", iconLg: "h-7 w-7", pad: "p-6", divW: "w-10" },
  }[size];

  return (
    <div
      className={`absolute inset-0 ${sizeConfig.pad} flex flex-col justify-between`}
      style={{
        borderRadius: "20px",
        background: mat.base,
        boxShadow: `${mat.edgeHighlight}, 0 25px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)`,
        backfaceVisibility: "hidden",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "20px", background: mat.texture }} />
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

      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ borderRadius: "20px", opacity: 0.06 }}>
        {[...Array(6)].map((_, i) => (
          <IconComponent
            key={i}
            style={{
              position: "absolute",
              left: `${15 + (i % 3) * 30}%`,
              top: `${10 + Math.floor(i / 3) * 45}%`,
              width: size === "large" ? "32px" : size === "normal" ? "24px" : "18px",
              height: size === "large" ? "32px" : size === "normal" ? "24px" : "18px",
              transform: `rotate(${i * 17}deg)`,
              color: mat.textMain,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p
            className={`${sizeConfig.label} font-bold uppercase tracking-[0.15em]`}
            style={{
              color: mat.textSub,
              textShadow: `0 1px 2px rgba(0,0,0,0.5)`,
            }}
          >
            Private Recognition Series
          </p>
        </div>
        <IconComponent
          className={sizeConfig.icon}
          style={{ color: mat.textSub }}
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
            textShadow: `0 1px 0 rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), 0 0 1px rgba(255,255,255,0.1)`,
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
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "20px", background: mat.texture }} />
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
