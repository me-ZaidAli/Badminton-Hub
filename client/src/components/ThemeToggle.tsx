import { Sun, Moon, Eye, Palette, Contrast, CircleOff, Zap, Crown, Gem, Leaf, Diamond, Snowflake, Flame, Rocket, Shield, Sparkles, Cpu, Waves, Sunset, Monitor, CircuitBoard, Binary, Radio, Hexagon, Heart, Grid3x3, Mountain, Droplets, TreePine, Activity, Gauge, Trophy, Orbit, Ghost, Codesandbox, Flower2, GlassWater, Terminal, RefreshCw, CircleDot, TreeDeciduous, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, DISPLAY_MODES, type DisplayMode } from "@/hooks/use-theme";
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
};

const GRADE_ORDER = ["Standard", "Premium", "Elite", "Signature", "Ultra Exclusive", "Metallic Comet", "Royal Duty", "Accessibility"] as const;

export function ThemeToggle() {
  const { displayMode, reducedMotion, setDisplayMode, setReducedMotion } = useTheme();
  const CurrentIcon = MODE_ICONS[displayMode] || Sun;

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
              return (
                <DropdownMenuItem
                  key={mode.value}
                  onClick={() => setDisplayMode(mode.value)}
                  className={isActive ? "bg-muted" : ""}
                  data-testid={`menu-display-mode-${mode.value}`}
                >
                  <Icon className="h-4 w-4 mr-2 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{mode.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{mode.description}</span>
                  </div>
                  {isActive && (
                    <span className="ml-auto text-xs text-primary font-medium shrink-0">Active</span>
                  )}
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
