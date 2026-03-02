import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, DISPLAY_MODES, type ThemeModeInfo } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Check, GlassWater, BarChart3, Leaf, Sparkles, Layout, Crown } from "lucide-react";

interface ThemeCategory {
  id: string;
  label: string;
  icon: typeof GlassWater;
  description: string;
  themeValues: string[];
  accentColor: string;
}

const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: "glass-depth",
    label: "Glass & Depth",
    icon: GlassWater,
    description: "True transparent glassmorphism with neo-tactile depth",
    themeValues: ["obsidian-frost"],
    accentColor: "#4DB8E8",
  },
  {
    id: "performance-data",
    label: "Performance & Data",
    icon: BarChart3,
    description: "AMOLED fintech dashboard with neon accent palette",
    themeValues: ["neon-apex"],
    accentColor: "#84CC16",
  },
  {
    id: "lifestyle-calm",
    label: "Lifestyle & Calm",
    icon: Leaf,
    description: "Organic earth tones with editorial floating glass panels",
    themeValues: ["sage-horizon"],
    accentColor: "#5A9A6E",
  },
  {
    id: "energy-gradient",
    label: "Energy & Gradient",
    icon: Sparkles,
    description: "Luminous multi-stop gradients with skeuomorphic depth",
    themeValues: ["prism-forge"],
    accentColor: "#9B5DE5",
  },
  {
    id: "classic-structured",
    label: "Classic & Structured",
    icon: Layout,
    description: "Bold flat structure with strong grid alignment",
    themeValues: ["vector-legacy"],
    accentColor: "#0D9488",
  },
  {
    id: "premium-collections",
    label: "Premium Collections",
    icon: Crown,
    description: "Five exclusive standalone themes with unique design systems",
    themeValues: ["frosted-titanium", "midnight-voltage", "solstice-calm", "aurora-pulse", "atlas-grid"],
    accentColor: "#D4AF37",
  },
];

function CategoryTab({
  category,
  isActive,
  onClick,
}: {
  category: ThemeCategory;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = category.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground/80"
      )}
      data-testid={`tab-category-${category.id}`}
    >
      {isActive && (
        <motion.div
          layoutId="category-indicator"
          className="absolute inset-0 rounded-xl"
          style={{ background: `${category.accentColor}15`, border: `1px solid ${category.accentColor}30` }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        />
      )}
      <Icon className="h-4 w-4 relative z-10" style={isActive ? { color: category.accentColor } : undefined} />
      <span className="relative z-10 hidden sm:inline">{category.label}</span>
    </button>
  );
}

function ThemeCard({
  mode,
  isActive,
  onApply,
  accentColor,
}: {
  mode: ThemeModeInfo;
  isActive: boolean;
  onApply: () => void;
  accentColor: string;
}) {
  const gradientStart = mode.gradientStart || "#1a1a2e";
  const gradientEnd = mode.gradientEnd || "#0f0f23";
  const accent = mode.accentHex || accentColor;
  const charts = mode.chartColors || [accentColor, "#666", "#888", "#aaa", "#ccc"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer",
        isActive
          ? "ring-2 shadow-lg"
          : "border-border/50 hover:border-border hover:shadow-md"
      )}
      style={isActive ? { borderColor: accentColor, ringColor: `${accentColor}30`, boxShadow: `0 0 20px ${accentColor}15` } : undefined}
      onClick={onApply}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      data-testid={`card-collection-theme-${mode.value}`}
    >
      <div
        className="h-32 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{ background: `radial-gradient(circle at 70% 30%, ${accent}50 0%, transparent 60%)` }}
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,0.3) 18px, rgba(255,255,255,0.3) 19px), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,255,255,0.3) 18px, rgba(255,255,255,0.3) 19px)`
        }} />

        <div className="absolute bottom-3 left-4 right-4 flex gap-1.5 items-end">
          {charts.map((color, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                backgroundColor: color,
                height: `${16 + ((i * 7 + 3) % 6) * 4}px`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 rounded-full p-1.5"
            style={{ background: accentColor }}
          >
            <Check className="h-3.5 w-3.5 text-white" />
          </motion.div>
        )}
      </div>

      <div className="p-5 bg-card space-y-3">
        <div>
          <h3 className="font-bold text-base" data-testid={`text-collection-name-${mode.value}`}>
            {mode.label}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mode.description}</p>
        </div>

        <div className="flex gap-1.5">
          <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: gradientStart, borderColor: `${accent}30` }} />
          <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: accent, borderColor: `${accent}30` }} />
          <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: gradientEnd, borderColor: `${accent}30` }} />
          <div className="flex-1" />
          <div className="h-2 flex-1 max-w-[80px] rounded-full self-center" style={{
            background: `linear-gradient(90deg, ${gradientStart}, ${accent}, ${gradientEnd})`
          }} />
        </div>

        <button
          className={cn(
            "w-full py-2 rounded-xl text-xs font-semibold transition-all duration-300",
            isActive
              ? "opacity-60 cursor-default"
              : "hover:opacity-90"
          )}
          style={isActive
            ? { background: `${accentColor}20`, color: accentColor }
            : { background: accentColor, color: "white" }
          }
          disabled={isActive}
          data-testid={`button-apply-collection-${mode.value}`}
        >
          {isActive ? "Active Theme" : "Apply Theme"}
        </button>
      </div>
    </motion.div>
  );
}

export function ThemeSwitcher() {
  const { displayMode, setDisplayMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    const current = THEME_CATEGORIES.find(c => c.themeValues.includes(displayMode));
    return current?.id || THEME_CATEGORIES[0].id;
  });

  const currentCategory = useMemo(() =>
    THEME_CATEGORIES.find(c => c.id === activeCategory) || THEME_CATEGORIES[0],
    [activeCategory]
  );

  const categoryThemes = useMemo(() =>
    currentCategory.themeValues
      .map(v => DISPLAY_MODES.find(m => m.value === v))
      .filter(Boolean) as ThemeModeInfo[],
    [currentCategory]
  );

  return (
    <div className="space-y-6" data-testid="container-theme-switcher">
      <div className="space-y-1">
        <h2 className="text-lg font-bold" data-testid="text-collections-title">Theme Collections</h2>
        <p className="text-sm text-muted-foreground">Curated premium theme experiences</p>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl bg-muted/50 overflow-x-auto" data-testid="tabs-category-container">
        {THEME_CATEGORIES.map((category) => (
          <CategoryTab
            key={category.id}
            category={category}
            isActive={activeCategory === category.id}
            onClick={() => setActiveCategory(category.id)}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">{currentCategory.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryThemes.map((mode) => (
              <ThemeCard
                key={mode.value}
                mode={mode}
                isActive={displayMode === mode.value}
                onApply={() => setDisplayMode(mode.value)}
                accentColor={currentCategory.accentColor}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
