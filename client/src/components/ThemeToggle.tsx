import { Sun, Moon, Eye, Palette, Contrast, CircleOff, Zap, Crown, Gem, Leaf, Diamond, Snowflake, Flame, Rocket, Shield, Sparkles, Cpu, Waves, Sunset, Monitor, CircuitBoard, Binary, Radio, Hexagon, Heart, Grid3x3, Mountain, Droplets, TreePine, Activity, Gauge, Trophy, Orbit, Ghost, Codesandbox, Flower2, GlassWater, Terminal, RefreshCw, CircleDot, TreeDeciduous, CloudSun, Layers, BatteryCharging, Wind, Disc, LayoutGrid, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, DISPLAY_MODES, type ThemeModeInfo } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MODE_ICONS: Record<string, typeof Sun> = {
  light: Sun,
  dark: Moon,
  "premium-gold": Crown,
  "ultra-premium": Gem,
  "green-glow": Leaf,
  sepia: Palette,
  migraine: Eye,
  "high-contrast": Contrast,
  grayscale: CircleOff,
  "obsidian-gold": Diamond,
  "platinum-ice": Snowflake,
  "emerald-performance": Leaf,
  "sapphire-velocity": Rocket,
  "crimson-prestige": Flame,
  "royal-amethyst": Sparkles,
  "carbon-titanium": Cpu,
  "arctic-blue": Waves,
  "sunset-copper": Sunset,
  "midnight-neon": Shield,
  "amoled-black": Monitor,
  "neon-circuit": CircuitBoard,
  "hologram-matrix": Binary,
  "cyber-pulse": Radio,
  "titanium-noir": Hexagon,
  "rose-gold-elite": Heart,
  "diamond-graphite": Grid3x3,
  "aurora-borealis": Mountain,
  "volcanic-ember": Flame,
  "deep-ocean": Droplets,
  "jungle-vibe": TreePine,
  "adrenaline-rush": Activity,
  "velocity-chrome": Gauge,
  "circuit-court": Trophy,
  "cosmic-elite": Orbit,
  "phantom-luxe": Ghost,
  "obsidian-gold-ultra": Codesandbox,
  "mint-prestige": Flower2,
  "crystal-court": GlassWater,
  "phosphor-elite": Terminal,
  "adaptive-pro": RefreshCw,
  "royal-indigo": CircleDot,
  "champagne-pearl": Gem,
  "coral-luxe": Heart,
  "arctic-frost": Snowflake,
  "retro-cream-tech": Monitor,
  "lavender-opulence": Flower2,
  "champagne-mint": Leaf,
  "tropical-dawn": Sun,
  "savanna-breeze": TreeDeciduous,
  "rainforest-canopy": Leaf,
  "misty-bamboo": TreePine,
  "tropical-lagoon": Waves,
  "sunset-savannah": CloudSun,
  "obsidian-frost": GlassWater,
  "neon-apex": Zap,
  "sage-horizon": Leaf,
  "prism-forge": Flame,
  "vector-legacy": Grid3x3,
  "frosted-titanium": Layers,
  "midnight-voltage": BatteryCharging,
  "solstice-calm": Wind,
  "aurora-pulse": Disc,
  "atlas-grid": LayoutGrid,
};

const GRADE_ORDER = ["Standard", "Premium", "Elite", "Signature", "Ultra Exclusive", "Metallic Comet", "Royal Duty", "Accessibility"] as const;

function isThemeLocked(mode: ThemeModeInfo, unlockedThemes?: string[]): boolean {
  if (mode.grade === "Standard" || mode.grade === "Accessibility") return false;
  if (mode.grade === "Royal Duty" || mode.grade === "Metallic Comet") {
    if (!unlockedThemes) return true;
    return !unlockedThemes.includes(mode.value);
  }
  if (mode.isRankLocked || mode.isBlackCard) {
    if (!unlockedThemes) return true;
    return !unlockedThemes.includes(mode.value);
  }
  if (mode.grade === "Premium" || mode.grade === "Elite" || mode.grade === "Signature" || mode.grade === "Ultra Exclusive") {
    if (!unlockedThemes) return true;
    return !unlockedThemes.includes(mode.value);
  }
  return false;
}

function getLockReason(mode: ThemeModeInfo): string {
  if (mode.grade === "Royal Duty") return "Royal Duty Card required";
  if (mode.grade === "Metallic Comet") return "Metallic Comet Card required";
  if (mode.isBlackCard) return "Black Card required";
  if (mode.requiredRank === "champion") return "Reach #1 to unlock";
  if (mode.requiredRank === "top10") return "Top 10 to unlock";
  if (mode.requiredRank === "all") return "Ranked to unlock";
  return "Unlock by ranking up";
}

export function ThemeToggle() {
  const { displayMode, reducedMotion, setDisplayMode, setReducedMotion } = useTheme();
  const { data: user } = useUser();
  const CurrentIcon = MODE_ICONS[displayMode] || Sun;

  const { data: availableThemes } = useQuery<{
    unlockedThemes: string[];
    userRank: string;
    hasBlackCard: boolean;
    hasMetallicComet: boolean;
    hasRoyalDuty: boolean;
  }>({
    queryKey: ["/api/user/available-themes"],
    enabled: !!user,
  });

  const grouped = GRADE_ORDER.map(grade => ({
    grade,
    modes: DISPLAY_MODES.filter(m => m.grade === grade),
  })).filter(g => g.modes.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-toggle"
        >
          <CurrentIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
        {grouped.map((group, gi) => (
          <div key={group.grade}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              {group.grade}
            </DropdownMenuLabel>
            {group.modes.map((mode) => {
              const Icon = MODE_ICONS[mode.value] || Sun;
              const isActive = displayMode === mode.value;
              const locked = isThemeLocked(mode, availableThemes?.unlockedThemes);
              return (
                <DropdownMenuItem
                  key={mode.value}
                  onClick={() => {
                    if (!locked) setDisplayMode(mode.value);
                  }}
                  className={`${isActive ? "bg-muted" : ""} ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                  data-testid={`menu-display-mode-${mode.value}`}
                  disabled={locked}
                >
                  <Icon className="h-4 w-4 mr-2 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{mode.label}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {locked ? getLockReason(mode) : mode.description}
                    </span>
                  </div>
                  {locked ? (
                    <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : isActive ? (
                    <span className="ml-auto text-xs text-primary font-medium shrink-0">Active</span>
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setReducedMotion(!reducedMotion)}
          data-testid="menu-reduced-motion-toggle"
        >
          <Zap className="h-4 w-4 mr-2 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Reduced Motion {reducedMotion ? "(On)" : "(Off)"}</span>
            <span className="text-xs text-muted-foreground">Disable animations independently</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
