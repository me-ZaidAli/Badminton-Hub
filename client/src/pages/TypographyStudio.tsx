import { useState, useMemo } from "react";
import {
  FONT_OPTIONS,
  FONT_CATEGORIES,
  useTypography,
  type FontCategory,
  type FontTier,
  type FontMode,
} from "@/hooks/use-typography";
import { Check, Type, ChevronLeft, Lock, ChevronDown, Crown, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-auth";
import { useClubPlan, useAdminClubId } from "@/hooks/use-club-plan";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function getUserTier(user: any, planStatus: string | undefined): FontTier {
  if (user?.blackCardAccess) return "blackcard";
  if (planStatus === "ACTIVE_PREMIUM") return "premium";
  return "free";
}

function canAccessFont(fontTier: FontTier, userTier: FontTier): boolean {
  if (fontTier === "free") return true;
  if (fontTier === "premium") return userTier === "premium" || userTier === "blackcard";
  if (fontTier === "blackcard") return userTier === "blackcard";
  return false;
}

export default function TypographyStudio() {
  const { fontId, fontMode, setFont, setMode, currentFont } = useTypography();
  const { data: user } = useUser();
  const adminClubId = useAdminClubId();
  const { planStatus } = useClubPlan(adminClubId);
  const [selectedCategory, setSelectedCategory] = useState<FontCategory | "all">("all");

  const userTier = getUserTier(user, planStatus);

  const filteredFonts = useMemo(() => {
    if (selectedCategory === "all") return FONT_OPTIONS;
    return FONT_OPTIONS.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  const selectedCategoryLabel =
    FONT_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "All Fonts";

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of FONT_CATEGORIES) {
      map[c.id] =
        c.id === "all"
          ? FONT_OPTIONS.length
          : FONT_OPTIONS.filter((f) => f.category === c.id).length;
    }
    return map;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-typography-title">
            <Type className="h-6 w-6" />
            Typography Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a font to personalise your app
          </p>
        </div>
      </div>

      <Card data-testid="card-font-preview">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" data-testid="text-live-preview">Live Preview</h3>
            <span className="text-xs text-muted-foreground">{currentFont.label}</span>
          </div>
          <div
            className="space-y-3 rounded-xl border border-border/50 p-5 bg-muted/30"
            style={{ fontFamily: currentFont.family }}
          >
            <h2 className="text-3xl font-bold tracking-tight" data-testid="preview-heading">
              Club Dashboard
            </h2>
            <h3 className="text-xl font-semibold text-muted-foreground" data-testid="preview-subheading">
              Season Overview 2026
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Win Rate", value: "78%" },
                { label: "Matches", value: "142" },
                { label: "Ranking", value: "#3" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg bg-card/60 backdrop-blur-sm border border-border/30 p-3 text-center"
                >
                  <div className="text-2xl font-bold" data-testid={`preview-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="preview-body">
              Your performance has improved significantly this season. Keep up the great work and aim for the top of the leaderboard.
            </p>
            <div className="flex gap-2">
              <Button size="sm" data-testid="preview-btn-primary">View Stats</Button>
              <Button size="sm" variant="outline" data-testid="preview-btn-outline">Settings</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[200px] justify-between" data-testid="dropdown-font-category">
              <span className="truncate">{selectedCategoryLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]">
            {FONT_CATEGORIES.map((cat) => (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`gap-2 ${selectedCategory === cat.id ? "bg-primary/10 text-primary font-medium" : ""}`}
                data-testid={`font-category-${cat.id}`}
              >
                {cat.id === "blackcard" && <CreditCard className="h-3.5 w-3.5" />}
                {cat.id === "luxury" && <Crown className="h-3.5 w-3.5" />}
                {cat.id !== "blackcard" && cat.id !== "luxury" && <Type className="h-3.5 w-3.5" />}
                <span className="flex-1">{cat.label}</span>
                <span className="text-xs text-muted-foreground">{counts[cat.id]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-3">
          <Label htmlFor="font-mode-toggle" className="text-xs text-muted-foreground cursor-pointer" data-testid="label-font-mode">
            {fontMode === "headings" ? "Headings only" : "Entire app"}
          </Label>
          <Switch
            id="font-mode-toggle"
            checked={fontMode === "headings"}
            onCheckedChange={(checked) => setMode(checked ? "headings" : "all")}
            data-testid="switch-font-mode"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filteredFonts.map((font) => {
          const isSelected = fontId === font.id;
          const isLocked = !canAccessFont(font.tier, userTier);
          return (
            <button
              key={font.id}
              onClick={isLocked ? undefined : () => setFont(font.id)}
              disabled={isLocked}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : isLocked
                  ? "border-border/20"
                  : "border-border/40 hover:border-primary/30 hover:bg-muted/30"
              }`}
              data-testid={`font-option-${font.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg font-semibold truncate"
                      data-font-sample="true"
                      style={{ fontFamily: font.family }}
                    >
                      {font.label}
                    </span>
                    {font.tier === "blackcard" && !isLocked && (
                      <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500/80 to-yellow-500/80 text-[7px] font-bold text-black uppercase tracking-wider">
                        Exclusive
                      </span>
                    )}
                    {font.tier === "premium" && (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-[7px] font-bold text-primary uppercase tracking-wider">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{font.description}</p>
                  <p
                    className="text-sm mt-1.5 text-foreground/70 truncate"
                    data-font-sample="true"
                    style={{ fontFamily: font.family }}
                  >
                    The quick brown fox jumps over the lazy dog — 0123456789
                  </p>
                </div>

                {isLocked && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider whitespace-nowrap">
                      {font.tier === "blackcard" ? "Black Card" : "Premium"}
                    </span>
                  </div>
                )}

                {isSelected && !isLocked && (
                  <div className="shrink-0">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {filteredFonts.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No fonts in this category
          </div>
        )}
      </div>
    </div>
  );
}
