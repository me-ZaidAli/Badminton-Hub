import { useState, useMemo } from "react";
import {
  BACKGROUND_OPTIONS,
  BACKGROUND_CATEGORIES,
  useBackground,
  type BackgroundCategory,
  type BackgroundTier,
  type BackgroundOption,
} from "@/hooks/use-background";
import { Check, ImageIcon, ChevronLeft, Lock, Crown, CreditCard, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-auth";
import { useClubPlan } from "@/hooks/use-club-plan";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getUserTier(user: any, planStatus: string | undefined): BackgroundTier {
  if (user?.blackCardAccess) return "blackcard";
  if (planStatus === "ACTIVE_PREMIUM") return "premium";
  return "free";
}

function canAccessBackground(bgTier: BackgroundTier, userTier: BackgroundTier): boolean {
  if (bgTier === "free") return true;
  if (bgTier === "premium") return userTier === "premium" || userTier === "blackcard";
  if (bgTier === "blackcard") return userTier === "blackcard";
  return false;
}

function BackgroundTile({
  bg,
  isSelected,
  isLocked,
  onSelect,
}: {
  bg: BackgroundOption;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={isLocked ? undefined : onSelect}
      className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 aspect-[4/3] ${
        isLocked ? "cursor-not-allowed" : "cursor-pointer"
      } ${
        isSelected
          ? "border-primary ring-2 ring-primary/30 scale-[1.03]"
          : isLocked
          ? "border-border/20 opacity-80"
          : "border-border/40 hover:border-primary/40 hover:scale-[1.04] hover:shadow-lg hover:shadow-primary/10"
      }`}
      data-testid={`bg-option-${bg.id}`}
      disabled={isLocked}
    >
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
        style={{
          background: bg.id === "none" ? "hsl(var(--background))" : bg.preview,
        }}
      />
      {bg.css && (
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: bg.css }}
        />
      )}

      {isLocked && (
        <div className="absolute inset-0 backdrop-blur-[2px] bg-black/30 flex flex-col items-center justify-center gap-1.5 z-10">
          <Lock className="h-4 w-4 text-white/70" />
          <span className="text-[8px] font-semibold text-white/60 uppercase tracking-wider px-1 text-center leading-tight">
            {bg.tier === "blackcard" ? "Black Card" : "Premium"}
          </span>
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col items-center justify-end pb-2 transition-opacity duration-200 z-20 ${
          isSelected || isLocked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {!isLocked && (
          <span className="text-[10px] font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] px-2 text-center leading-tight">
            {bg.label}
          </span>
        )}
      </div>

      {isSelected && !isLocked && (
        <div className="absolute top-2 right-2 z-20">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Check className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        </div>
      )}

      {bg.id === "none" && !isSelected && !isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">None</span>
        </div>
      )}

      {bg.tier === "blackcard" && !isLocked && (
        <div className="absolute top-1.5 left-1.5 z-20">
          <div className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500/80 to-yellow-500/80 backdrop-blur-sm">
            <span className="text-[7px] font-bold text-black uppercase tracking-wider">Exclusive</span>
          </div>
        </div>
      )}
    </button>
  );
}

export default function Backgrounds() {
  const { backgroundId, setBackground } = useBackground();
  const { data: user } = useUser();
  const { planStatus } = useClubPlan();
  const [selectedCategory, setSelectedCategory] = useState<BackgroundCategory | "all">("all");

  const userTier = getUserTier(user, planStatus);

  const filteredBackgrounds = useMemo(() => {
    if (selectedCategory === "all") return BACKGROUND_OPTIONS;
    return BACKGROUND_OPTIONS.filter((bg) => bg.category === selectedCategory);
  }, [selectedCategory]);

  const selectedCategoryLabel =
    BACKGROUND_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "All Backgrounds";

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of BACKGROUND_CATEGORIES) {
      map[c.id] =
        c.id === "all"
          ? BACKGROUND_OPTIONS.length
          : BACKGROUND_OPTIONS.filter((bg) => bg.category === c.id).length;
    }
    return map;
  }, []);

  const currentBgOption = BACKGROUND_OPTIONS.find((b) => b.id === backgroundId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            data-testid="text-backgrounds-title"
          >
            <ImageIcon className="h-6 w-6" />
            Background Library
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a background wallpaper for your app
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 min-w-[200px] justify-between"
              data-testid="dropdown-category-filter"
            >
              <span className="truncate">{selectedCategoryLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]">
            {BACKGROUND_CATEGORIES.map((cat) => (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`gap-2 ${
                  selectedCategory === cat.id ? "bg-primary/10 text-primary font-medium" : ""
                }`}
                data-testid={`category-${cat.id}`}
              >
                {cat.id === "blackcard" && <CreditCard className="h-3.5 w-3.5" />}
                {cat.id === "luxury" && <Crown className="h-3.5 w-3.5" />}
                {cat.id !== "blackcard" && cat.id !== "luxury" && (
                  <ImageIcon className="h-3.5 w-3.5" />
                )}
                <span className="flex-1">{cat.label}</span>
                <span className="text-xs text-muted-foreground">{counts[cat.id]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            {userTier === "blackcard"
              ? "All backgrounds unlocked"
              : userTier === "premium"
              ? "Premium unlocked"
              : "Free tier"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredBackgrounds.map((bg) => {
          const isSelected = backgroundId === bg.id;
          const isLocked = !canAccessBackground(bg.tier, userTier);
          return (
            <BackgroundTile
              key={bg.id}
              bg={bg}
              isSelected={isSelected}
              isLocked={isLocked}
              onSelect={() => setBackground(bg.id)}
            />
          );
        })}
        {filteredBackgrounds.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No backgrounds in this category
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" data-testid="text-preview-title">
              Live Preview
            </h3>
            {currentBgOption && currentBgOption.id !== "none" && (
              <span className="text-xs text-muted-foreground">{currentBgOption.label}</span>
            )}
          </div>
          <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-video">
            {backgroundId !== "none" && currentBgOption && (
              <>
                <div
                  className="absolute inset-0"
                  style={{ background: currentBgOption.preview }}
                />
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: currentBgOption.css }}
                />
              </>
            )}
            {backgroundId === "none" && <div className="absolute inset-0 bg-background" />}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-2 p-4 w-3/4 max-w-md">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-card/60 backdrop-blur-sm border border-border/30 p-3 aspect-square"
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
