import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface ThemeModeInfo {
  value: string;
  label: string;
  description: string;
  grade?: "Standard" | "Accessibility" | "Premium" | "Elite" | "Signature" | "Ultra Exclusive";
  colorFamily?: string;
  isAmoled?: boolean;
  isRankLocked?: boolean;
  requiredRank?: "all" | "top10" | "champion";
  isBlackCard?: boolean;
  accentHex?: string;
  gradientStart?: string;
  gradientEnd?: string;
  chartColors?: string[];
}

export const DISPLAY_MODES: readonly ThemeModeInfo[] = [
  { value: "light", label: "Light Mode", description: "Standard bright theme", grade: "Standard" },
  { value: "dark", label: "Dark Mode", description: "Dark background, lighter text", grade: "Standard" },
  { value: "premium-gold", label: "Premium Black & Gold", description: "Luxurious dark theme with metallic gold accents", grade: "Standard", colorFamily: "Gold", accentHex: "#D4AF37", gradientStart: "#1a1a2e", gradientEnd: "#D4AF37", chartColors: ["#D4AF37", "#B8941F", "#8B7320", "#E6C555", "#6B5B1F"] },
  { value: "ultra-premium", label: "Ultra-Premium Charcoal & Gold", description: "Elite charcoal black with brushed metallic gold accents", grade: "Standard", colorFamily: "Gold", accentHex: "#C6A75E", gradientStart: "#050505", gradientEnd: "#C6A75E", chartColors: ["#C6A75E", "#9E843A", "#7A6428", "#DCC07A", "#584C1E"] },
  { value: "green-glow", label: "Green Glowing", description: "Futuristic neon green with transparent glowing textures", grade: "Standard", colorFamily: "Emerald", accentHex: "#00FF88", gradientStart: "#0a0f0a", gradientEnd: "#00FF88", chartColors: ["#00FF88", "#00CC6A", "#009950", "#33FFaa", "#006633"] },
  { value: "sepia", label: "Sepia / Warm Mode", description: "Reduced blue light, cream tones", grade: "Accessibility" },
  { value: "migraine", label: "Migraine-Friendly", description: "Low stimulation, no harsh contrast or animations", grade: "Accessibility" },
  { value: "high-contrast", label: "High Contrast", description: "Maximum readability with strong contrast", grade: "Accessibility" },
  { value: "grayscale", label: "Grayscale", description: "No color, fully desaturated", grade: "Accessibility" },
  { value: "obsidian-gold", label: "Obsidian Gold", description: "Deep charcoal with brushed gold and matte black cards", grade: "Premium", colorFamily: "Gold", requiredRank: "all", accentHex: "#C6A75E", gradientStart: "#0F0F10", gradientEnd: "#C6A75E", chartColors: ["#C6A75E", "#A8894A", "#8A6C36", "#D4B96E", "#6B5028"] },
  { value: "platinum-ice", label: "Platinum Ice", description: "Icy silver and steel grey with glassmorphism cards", grade: "Premium", colorFamily: "Platinum", requiredRank: "all", accentHex: "#D9E1E8", gradientStart: "#2F3A45", gradientEnd: "#D9E1E8", chartColors: ["#B0BEC5", "#90A4AE", "#78909C", "#CFD8DC", "#607D8B"] },
  { value: "emerald-performance", label: "Emerald Performance", description: "Deep emerald with bright green glow effects", grade: "Premium", colorFamily: "Emerald", requiredRank: "all", accentHex: "#1DB954", gradientStart: "#0E3B2E", gradientEnd: "#1DB954", chartColors: ["#1DB954", "#17A34A", "#0F8C3E", "#4ADE80", "#0A7030"] },
  { value: "sapphire-velocity", label: "Sapphire Velocity", description: "Midnight navy with sapphire neon data visualisation", grade: "Elite", colorFamily: "Sapphire", isRankLocked: true, requiredRank: "top10", accentHex: "#1F6FFF", gradientStart: "#0A1F3C", gradientEnd: "#1F6FFF", chartColors: ["#1F6FFF", "#4D8FFF", "#82B1FF", "#0040CC", "#003399"] },
  { value: "crimson-prestige", label: "Crimson Prestige", description: "Wine red with rose-gold accents and bold styling", grade: "Elite", colorFamily: "Crimson", isRankLocked: true, requiredRank: "top10", accentHex: "#E8A87C", gradientStart: "#5B0F1A", gradientEnd: "#E8A87C", chartColors: ["#E8A87C", "#C0392B", "#E74C3C", "#D4956B", "#922B21"] },
  { value: "royal-amethyst", label: "Royal Amethyst", description: "Dark violet with cosmic gradients and royal purple", grade: "Signature", colorFamily: "Amethyst", isRankLocked: true, requiredRank: "champion", accentHex: "#7A3FFF", gradientStart: "#2B0F3A", gradientEnd: "#7A3FFF", chartColors: ["#7A3FFF", "#9B6BFF", "#5C2BD9", "#B794FF", "#4A1FB3"] },
  { value: "carbon-titanium", label: "Carbon Titanium", description: "Industrial grey with titanium fintech flat design", grade: "Premium", colorFamily: "Silver", requiredRank: "all", accentHex: "#8E9AA6", gradientStart: "#1C1F24", gradientEnd: "#8E9AA6", chartColors: ["#8E9AA6", "#6B7A89", "#4A5568", "#ADB9C6", "#3D4A59"] },
  { value: "arctic-blue", label: "Arctic Blue", description: "Cool blue with icy cyan bright data visualisation", grade: "Elite", colorFamily: "Blue", isRankLocked: true, requiredRank: "top10", accentHex: "#2EC4FF", gradientStart: "#102A43", gradientEnd: "#2EC4FF", chartColors: ["#2EC4FF", "#00B4D8", "#0096C7", "#72EFFF", "#0077B6"] },
  { value: "sunset-copper", label: "Sunset Copper", description: "Espresso brown with warm copper gradients", grade: "Signature", colorFamily: "Copper", isRankLocked: true, requiredRank: "champion", accentHex: "#B87333", gradientStart: "#1A1410", gradientEnd: "#B87333", chartColors: ["#B87333", "#D4944A", "#8B5E28", "#E6A85C", "#6B4520"] },
  { value: "midnight-neon", label: "Midnight Neon", description: "Ultra-dark with cyan and magenta neon glow effects", grade: "Ultra Exclusive", colorFamily: "Neon", isBlackCard: true, accentHex: "#00F5FF", gradientStart: "#08090D", gradientEnd: "#FF2DA6", chartColors: ["#00F5FF", "#FF2DA6", "#7B61FF", "#FFE156", "#00FF88"] },
  { value: "amoled-black", label: "AMOLED Black", description: "True black for OLED screens, energy-efficient gold accents", grade: "Premium", colorFamily: "Onyx", isAmoled: true, requiredRank: "all", accentHex: "#D4AF37", gradientStart: "#000000", gradientEnd: "#D4AF37", chartColors: ["#D4AF37", "#C0392B", "#2ECC71", "#3498DB", "#9B59B6"] },
  { value: "neon-circuit", label: "Neon Circuit", description: "True black with cyan, magenta & lime neon lines, holographic charts", grade: "Premium", colorFamily: "Neon", isAmoled: true, requiredRank: "all", accentHex: "#00F5FF", gradientStart: "#000000", gradientEnd: "#FF2DA6", chartColors: ["#00F5FF", "#FF2DA6", "#39FF14", "#FFE156", "#7B61FF"] },
  { value: "hologram-matrix", label: "Hologram Matrix", description: "Deep black with digital green/blue holographic charts, futuristic typography", grade: "Premium", colorFamily: "Emerald", isAmoled: true, requiredRank: "all", accentHex: "#00FF41", gradientStart: "#050508", gradientEnd: "#00D4FF", chartColors: ["#00FF41", "#00D4FF", "#7B61FF", "#FFE156", "#FF6B6B"] },
  { value: "cyber-pulse", label: "Cyber Pulse", description: "Black with electric blue pulses, pulsing animated line charts", grade: "Premium", colorFamily: "Sapphire", isAmoled: true, requiredRank: "all", accentHex: "#0080FF", gradientStart: "#080810", gradientEnd: "#0080FF", chartColors: ["#0080FF", "#00BFFF", "#4D8FFF", "#82B1FF", "#0040CC"] },
  { value: "titanium-noir", label: "Titanium Noir", description: "True black with brushed titanium accents, metallic reflections", grade: "Premium", colorFamily: "Silver", isAmoled: true, requiredRank: "all", accentHex: "#8E9AAF", gradientStart: "#000000", gradientEnd: "#8E9AAF", chartColors: ["#8E9AAF", "#B0BEC5", "#6B7A89", "#CFD8DC", "#4A5568"] },
  { value: "rose-gold-elite", label: "Rose Gold Elite", description: "Warm black with rose gold highlights, copper-gold charts", grade: "Premium", colorFamily: "Copper", requiredRank: "all", accentHex: "#B76E79", gradientStart: "#0A0808", gradientEnd: "#D4A574", chartColors: ["#B76E79", "#D4A574", "#E8A87C", "#C48B65", "#8B5E5E"] },
  { value: "diamond-graphite", label: "Diamond Graphite", description: "Graphite black with diamond sparkle accents, shimmer KPIs", grade: "Premium", colorFamily: "Platinum", requiredRank: "all", accentHex: "#E8E8E8", gradientStart: "#0C0C0E", gradientEnd: "#E8E8E8", chartColors: ["#E8E8E8", "#B0BEC5", "#90A4AE", "#CFD8DC", "#78909C"] },
  { value: "aurora-borealis", label: "Aurora Borealis", description: "Dark sky gradients with green/purple aurora streaks, glowing KPIs", grade: "Elite", colorFamily: "Emerald", isRankLocked: true, requiredRank: "top10", accentHex: "#00FF88", gradientStart: "#050510", gradientEnd: "#8B5CF6", chartColors: ["#00FF88", "#8B5CF6", "#06B6D4", "#A78BFA", "#34D399"] },
  { value: "volcanic-ember", label: "Volcanic Ember", description: "Ash black with molten orange/red gradients, fiery heat-map charts", grade: "Elite", colorFamily: "Crimson", isRankLocked: true, requiredRank: "top10", accentHex: "#FF6B00", gradientStart: "#0A0806", gradientEnd: "#FF3D00", chartColors: ["#FF6B00", "#FF3D00", "#FF8F00", "#D84315", "#FFB300"] },
  { value: "deep-ocean", label: "Deep Ocean", description: "Midnight navy with teal/cyan gradients, bioluminescent KPI glow", grade: "Elite", colorFamily: "Sapphire", isRankLocked: true, requiredRank: "top10", accentHex: "#00BCD4", gradientStart: "#040810", gradientEnd: "#008B8B", chartColors: ["#00BCD4", "#008B8B", "#26C6DA", "#0097A7", "#4DD0E1"] },
  { value: "jungle-vibe", label: "Jungle Vibe", description: "Deep forest green with bright leaf accents, organic radar charts", grade: "Elite", colorFamily: "Emerald", isRankLocked: true, requiredRank: "top10", accentHex: "#4CAF50", gradientStart: "#060D06", gradientEnd: "#2E7D32", chartColors: ["#4CAF50", "#2E7D32", "#81C784", "#1B5E20", "#A5D6A7"] },
  { value: "adrenaline-rush", label: "Adrenaline Rush", description: "Dark backgrounds with red/orange accents, high-energy pulsing KPIs", grade: "Signature", colorFamily: "Crimson", isRankLocked: true, requiredRank: "champion", accentHex: "#FF1744", gradientStart: "#080404", gradientEnd: "#FF6D00", chartColors: ["#FF1744", "#FF6D00", "#FF5252", "#FF9100", "#D50000"] },
  { value: "velocity-chrome", label: "Velocity Chrome", description: "Sleek silver/steel with neon blue, speed-line overlays", grade: "Signature", colorFamily: "Platinum", isRankLocked: true, requiredRank: "champion", accentHex: "#2196F3", gradientStart: "#0A0A0E", gradientEnd: "#C0C0C0", chartColors: ["#2196F3", "#C0C0C0", "#64B5F6", "#90A4AE", "#1976D2"] },
  { value: "circuit-court", label: "Circuit Court", description: "Stadium-inspired black with court-marking overlays, high-vis KPIs", grade: "Signature", colorFamily: "Gold", isRankLocked: true, requiredRank: "champion", accentHex: "#FFD600", gradientStart: "#080808", gradientEnd: "#FFD600", chartColors: ["#FFD600", "#F5F5F5", "#FFC107", "#FFAB00", "#FFD740"] },
  { value: "cosmic-elite", label: "Cosmic Elite", description: "Space-inspired black with violet/cyan gradients, futuristic KPI effects", grade: "Ultra Exclusive", colorFamily: "Amethyst", isBlackCard: true, accentHex: "#7C4DFF", gradientStart: "#040408", gradientEnd: "#18FFFF", chartColors: ["#7C4DFF", "#18FFFF", "#B388FF", "#84FFFF", "#651FFF"] },
  { value: "phantom-luxe", label: "Phantom Luxe", description: "Layered glass panels, muted metallic accents, soft ambient KPI glows", grade: "Ultra Exclusive", colorFamily: "Platinum", isBlackCard: true, accentHex: "#9E9E9E", gradientStart: "#060608", gradientEnd: "#9E9E9E", chartColors: ["#9E9E9E", "#BDBDBD", "#757575", "#E0E0E0", "#616161"] },
] as const;

export type DisplayMode = string;

const THEME_CLASSES: Record<string, string[]> = {
  light: [],
  dark: ["dark"],
  "premium-gold": ["dark", "premium-gold"],
  "ultra-premium": ["dark", "ultra-premium"],
  "green-glow": ["dark", "green-glow"],
  sepia: ["sepia"],
  migraine: ["migraine"],
  "high-contrast": ["high-contrast"],
  grayscale: ["grayscale"],
  "obsidian-gold": ["dark", "obsidian-gold"],
  "platinum-ice": ["dark", "platinum-ice"],
  "emerald-performance": ["dark", "emerald-performance"],
  "sapphire-velocity": ["dark", "sapphire-velocity"],
  "crimson-prestige": ["dark", "crimson-prestige"],
  "royal-amethyst": ["dark", "royal-amethyst"],
  "carbon-titanium": ["dark", "carbon-titanium"],
  "arctic-blue": ["dark", "arctic-blue"],
  "sunset-copper": ["dark", "sunset-copper"],
  "midnight-neon": ["dark", "midnight-neon"],
  "amoled-black": ["dark", "amoled-black"],
  "neon-circuit": ["dark", "neon-circuit"],
  "hologram-matrix": ["dark", "hologram-matrix"],
  "cyber-pulse": ["dark", "cyber-pulse"],
  "titanium-noir": ["dark", "titanium-noir"],
  "rose-gold-elite": ["dark", "rose-gold-elite"],
  "diamond-graphite": ["dark", "diamond-graphite"],
  "aurora-borealis": ["dark", "aurora-borealis"],
  "volcanic-ember": ["dark", "volcanic-ember"],
  "deep-ocean": ["dark", "deep-ocean"],
  "jungle-vibe": ["dark", "jungle-vibe"],
  "adrenaline-rush": ["dark", "adrenaline-rush"],
  "velocity-chrome": ["dark", "velocity-chrome"],
  "circuit-court": ["dark", "circuit-court"],
  "cosmic-elite": ["dark", "cosmic-elite"],
  "phantom-luxe": ["dark", "phantom-luxe"],
};

const ALL_THEME_CLASSES = [
  "dark", "premium-gold", "ultra-premium", "green-glow",
  "sepia", "migraine", "high-contrast", "grayscale", "reduced-motion",
  "obsidian-gold", "platinum-ice", "emerald-performance", "sapphire-velocity",
  "crimson-prestige", "royal-amethyst", "carbon-titanium", "arctic-blue",
  "sunset-copper", "midnight-neon", "amoled-black",
  "neon-circuit", "hologram-matrix", "cyber-pulse", "titanium-noir",
  "rose-gold-elite", "diamond-graphite", "aurora-borealis", "volcanic-ember",
  "deep-ocean", "jungle-vibe", "adrenaline-rush", "velocity-chrome",
  "circuit-court", "cosmic-elite", "phantom-luxe",
];

const DARK_THEMES = new Set([
  "dark", "premium-gold", "ultra-premium", "green-glow",
  "obsidian-gold", "platinum-ice", "emerald-performance", "sapphire-velocity",
  "crimson-prestige", "royal-amethyst", "carbon-titanium", "arctic-blue",
  "sunset-copper", "midnight-neon", "amoled-black",
  "neon-circuit", "hologram-matrix", "cyber-pulse", "titanium-noir",
  "rose-gold-elite", "diamond-graphite", "aurora-borealis", "volcanic-ember",
  "deep-ocean", "jungle-vibe", "adrenaline-rush", "velocity-chrome",
  "circuit-court", "cosmic-elite", "phantom-luxe",
]);

function getInitialMode(): DisplayMode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("displayMode") as DisplayMode | null;
    if (stored && stored in THEME_CLASSES) return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  }
  return "light";
}

function getInitialReducedMotion(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("reducedMotion");
    if (stored === "true") return true;
    if (stored === "false") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return false;
}

interface ThemeContextType {
  displayMode: DisplayMode;
  reducedMotion: boolean;
  setDisplayMode: (mode: DisplayMode) => void;
  setReducedMotion: (enabled: boolean) => void;
  syncFromUser: (mode: DisplayMode, motion: boolean, userId?: number) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyThemeClasses(mode: DisplayMode, reducedMotion: boolean) {
  const root = document.documentElement;
  ALL_THEME_CLASSES.forEach(cls => root.classList.remove(cls));
  const themeClasses = THEME_CLASSES[mode] || [];
  themeClasses.forEach(cls => root.classList.add(cls));
  if (reducedMotion || mode === "migraine") root.classList.add("reduced-motion");
}

export { ThemeContext, THEME_CLASSES, ALL_THEME_CLASSES, DARK_THEMES };

export function useThemeProvider() {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(getInitialMode);
  const [reducedMotion, setReducedMotionState] = useState<boolean>(getInitialReducedMotion);
  const syncedUserIdRef = useRef<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (prefs: { displayMode: DisplayMode; reducedMotion: boolean }) => {
      await apiRequest("PATCH", "/api/user/display-preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    const effectiveMotion = mode === "migraine" ? true : reducedMotion;
    setDisplayModeState(mode);
    if (mode === "migraine") {
      setReducedMotionState(true);
      localStorage.setItem("reducedMotion", "true");
    }
    localStorage.setItem("displayMode", mode);
    applyThemeClasses(mode, effectiveMotion);
    saveMutation.mutate({ displayMode: mode, reducedMotion: effectiveMotion });
  }, [reducedMotion]);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem("reducedMotion", String(enabled));
    applyThemeClasses(displayMode, enabled);
    saveMutation.mutate({ displayMode, reducedMotion: enabled });
  }, [displayMode]);

  const syncFromUser = useCallback((mode: DisplayMode, motion: boolean, userId?: number) => {
    if (userId !== undefined && syncedUserIdRef.current === userId) return;
    if (userId !== undefined) syncedUserIdRef.current = userId;

    const effectiveMode = (mode && mode in THEME_CLASSES) ? mode : "light";
    const effectiveMotion = effectiveMode === "migraine" ? true : motion;

    setDisplayModeState(effectiveMode);
    setReducedMotionState(effectiveMotion);
    localStorage.setItem("displayMode", effectiveMode);
    localStorage.setItem("reducedMotion", String(effectiveMotion));
    applyThemeClasses(effectiveMode, effectiveMotion);
  }, []);

  useEffect(() => {
    applyThemeClasses(displayMode, reducedMotion);
  }, []);

  return { displayMode, reducedMotion, setDisplayMode, setReducedMotion, syncFromUser };
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const [displayMode, setDisplayMode] = useState<DisplayMode>(getInitialMode);
    const [reducedMotion, setReducedMotion] = useState<boolean>(getInitialReducedMotion);
    return {
      theme: DARK_THEMES.has(displayMode) ? "dark" as const : "light" as const,
      displayMode,
      reducedMotion,
      setDisplayMode: (mode: DisplayMode) => {
        const effectiveMotion = mode === "migraine" ? true : reducedMotion;
        setDisplayMode(mode);
        if (mode === "migraine") {
          setReducedMotion(true);
          localStorage.setItem("reducedMotion", "true");
        }
        localStorage.setItem("displayMode", mode);
        applyThemeClasses(mode, effectiveMotion);
      },
      setReducedMotion: (enabled: boolean) => {
        setReducedMotion(enabled);
        localStorage.setItem("reducedMotion", String(enabled));
        applyThemeClasses(displayMode, enabled);
      },
      toggleTheme: () => {
        const next = displayMode === "dark" ? "light" : "dark";
        setDisplayMode(next);
        localStorage.setItem("displayMode", next);
        applyThemeClasses(next, reducedMotion);
      },
      syncFromUser: () => {},
    };
  }
  return {
    theme: DARK_THEMES.has(ctx.displayMode) ? "dark" as const : "light" as const,
    displayMode: ctx.displayMode,
    reducedMotion: ctx.reducedMotion,
    setDisplayMode: ctx.setDisplayMode,
    setReducedMotion: ctx.setReducedMotion,
    toggleTheme: () => ctx.setDisplayMode(ctx.displayMode === "dark" ? "light" : "dark"),
    syncFromUser: ctx.syncFromUser,
  };
}
