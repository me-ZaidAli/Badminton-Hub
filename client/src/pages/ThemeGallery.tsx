import { useState, useMemo } from "react";
import { useTheme, DISPLAY_MODES, type ThemeModeInfo } from "@/hooks/use-theme";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Lock, Search, Crown, Sparkles, Shield, Diamond, Star } from "lucide-react";

const GRADE_FILTERS = ["All", "Standard", "Accessibility", "Premium", "Elite", "Signature", "Ultra Exclusive"] as const;

const GRADE_COLORS: Record<string, string> = {
  Standard: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  Accessibility: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Premium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Elite: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Signature: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Ultra Exclusive": "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

const GRADE_ICONS: Record<string, typeof Crown> = {
  Standard: Star,
  Accessibility: Shield,
  Premium: Crown,
  Elite: Diamond,
  Signature: Sparkles,
  "Ultra Exclusive": Crown,
};

const RANK_LABELS: Record<string, string> = {
  all: "Available to all members",
  top10: "Reach Top 10 in any club",
  champion: "Reach #1 in any club",
};

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function ThemePreviewCard({
  mode,
  isActive,
  isLocked,
  lockReason,
  onApply,
}: {
  mode: ThemeModeInfo;
  isActive: boolean;
  isLocked: boolean;
  lockReason?: string;
  onApply: () => void;
}) {
  const gradientStart = mode.gradientStart || "#1a1a2e";
  const gradientEnd = mode.gradientEnd || "#0f0f23";
  const accent = mode.accentHex || "#3b82f6";
  const charts = mode.chartColors || ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const gradeVal = mode.grade || "Standard";
  const GradeIcon = GRADE_ICONS[gradeVal] || Star;

  return (
    <div
      className={`group relative rounded-xl border overflow-hidden transition-all duration-300 ${
        isActive
          ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10"
          : "border-border/50 hover:border-border hover:shadow-md"
      } ${isLocked ? "opacity-75" : ""}`}
      data-testid={`card-theme-${mode.value}`}
    >
      <div
        className="h-24 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 70% 30%, ${accent}40 0%, transparent 60%)`,
          }}
        />
        <div className="absolute bottom-2 left-3 right-3 flex gap-1.5">
          {charts.map((color, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                backgroundColor: color,
                height: `${14 + ((i * 7 + 3) % 5) * 3}px`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
        {isActive && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
        {isLocked && (
          <div className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
            <Lock className="h-3 w-3" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 bg-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-theme-name-${mode.value}`}>
              {mode.label}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mode.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${GRADE_COLORS[gradeVal] || ""}`}
            data-testid={`badge-grade-${mode.value}`}
          >
            <GradeIcon className="h-2.5 w-2.5 mr-0.5" />
            {gradeVal}
          </Badge>
          {mode.colorFamily && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {mode.colorFamily}
            </Badge>
          )}
          {mode.isAmoled && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-black text-white border-gray-700">
              AMOLED
            </Badge>
          )}
          {mode.isBlackCard && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-gray-900 to-gray-800 text-amber-400 border-amber-500/30">
              Black Card
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: gradientStart }} />
            <div className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: accent }} />
            <div className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: gradientEnd }} />
          </div>
          <div className="flex-1" />
          <div
            className="h-1.5 flex-1 max-w-[60px] rounded-full"
            style={{
              background: `linear-gradient(90deg, ${gradientStart}, ${accent}, ${gradientEnd})`,
            }}
          />
        </div>

        <div className="flex gap-1.5">
          <div
            className="flex-1 rounded-md px-2 py-1 text-[10px] font-medium text-center"
            style={{
              backgroundColor: accent,
              color: gradientStart,
            }}
          >
            Primary
          </div>
          <div
            className="flex-1 rounded-md px-2 py-1 text-[10px] font-medium text-center border"
            style={{
              borderColor: accent,
              color: accent,
            }}
          >
            Outline
          </div>
        </div>

        {isLocked ? (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground text-center">
              {lockReason || "Unlock by ranking up"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs opacity-60 cursor-not-allowed"
              disabled
              data-testid={`button-theme-locked-${mode.value}`}
            >
              <Lock className="h-3 w-3 mr-1" /> Locked
            </Button>
          </div>
        ) : (
          <Button
            variant={isActive ? "secondary" : "default"}
            size="sm"
            className="w-full h-7 text-xs"
            onClick={onApply}
            disabled={isActive}
            data-testid={`button-theme-apply-${mode.value}`}
          >
            {isActive ? (
              <><Check className="h-3 w-3 mr-1" /> Current Theme</>
            ) : (
              "Apply Theme"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ThemeGallery() {
  const { displayMode, setDisplayMode } = useTheme();
  const { data: user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("All");
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  const { data: availableThemes } = useQuery<{
    unlockedThemes: string[];
    userRank: string;
    hasBlackCard: boolean;
  }>({
    queryKey: ["/api/user/available-themes"],
    enabled: !!user,
  });

  const colorFamilies = useMemo(() => {
    const families = new Set<string>();
    DISPLAY_MODES.forEach(m => {
      if (m.colorFamily) families.add(m.colorFamily);
    });
    return Array.from(families);
  }, []);

  const filteredModes = useMemo(() => {
    return DISPLAY_MODES.filter(mode => {
      if (gradeFilter !== "All" && mode.grade !== gradeFilter) return false;
      if (colorFilter && mode.colorFamily !== colorFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchLabel = mode.label.toLowerCase().includes(q);
        const matchDesc = mode.description.toLowerCase().includes(q);
        const matchFamily = mode.colorFamily?.toLowerCase().includes(q);
        if (!matchLabel && !matchDesc && !matchFamily) return false;
      }
      return true;
    });
  }, [gradeFilter, colorFilter, searchQuery]);

  const isThemeLocked = (mode: ThemeModeInfo): boolean => {
    if (mode.isRankLocked || mode.isBlackCard) {
      if (!availableThemes) return true;
      return !availableThemes.unlockedThemes.includes(mode.value);
    }
    return false;
  };

  const getLockReason = (mode: ThemeModeInfo): string => {
    if (mode.isBlackCard) return "Black Card access required";
    if (mode.requiredRank === "champion") return "Reach #1 in any club to unlock";
    if (mode.requiredRank === "top10") return "Reach Top 10 in any club to unlock";
    return "Unlock by ranking up";
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold" data-testid="text-theme-gallery-title">Theme Gallery</h1>
        <p className="text-sm text-muted-foreground">
          Personalise your experience with {DISPLAY_MODES.length} unique themes
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-theme-search"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {GRADE_FILTERS.map((grade) => (
          <button
            key={grade}
            onClick={() => setGradeFilter(grade)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              gradeFilter === grade
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-testid={`button-grade-filter-${grade.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {grade}
          </button>
        ))}
      </div>

      {colorFamilies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setColorFilter(null)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
              !colorFilter
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
            data-testid="button-color-filter-all"
          >
            All Colors
          </button>
          {colorFamilies.map((family) => (
            <button
              key={family}
              onClick={() => setColorFilter(colorFilter === family ? null : family)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                colorFilter === family
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              data-testid={`button-color-filter-${family.toLowerCase()}`}
            >
              {family}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-theme-cards">
        {filteredModes.map((mode) => {
          const locked = isThemeLocked(mode);
          return (
            <ThemePreviewCard
              key={mode.value}
              mode={mode}
              isActive={displayMode === mode.value}
              isLocked={locked}
              lockReason={locked ? getLockReason(mode) : undefined}
              onApply={() => setDisplayMode(mode.value)}
            />
          );
        })}
      </div>

      {filteredModes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-themes">
          <p className="text-lg font-medium">No themes found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  );
}
