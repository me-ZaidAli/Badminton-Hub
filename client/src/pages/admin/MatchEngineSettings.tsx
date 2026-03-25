import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings2, RotateCcw, Save, Play, Bug, Trophy, Zap,
  Users, Target, Shield, Gauge, Info, ChevronDown, ChevronUp,
  Sparkles, BarChart3, ArrowUpDown
} from "lucide-react";
import type { MatchEngineSettings as SettingsType, ScoringBreakdown, MatchPreviewResult } from "@shared/matchEngineSettings";
import { DEFAULT_SETTINGS, PRESETS } from "@shared/matchEngineSettings";

const STORAGE_KEY = "matchEngineSettings";

function loadSettings(): SettingsType {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: SettingsType) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

type SliderConfig = {
  key: keyof SettingsType;
  label: string;
  min: number;
  max: number;
  step: number;
  tooltip: string;
  format?: (v: number) => string;
};

function SettingSlider({
  config,
  value,
  onChange,
  defaultValue,
}: {
  config: SliderConfig;
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
}) {
  const isDefault = value === defaultValue;
  const displayValue = config.format ? config.format(value) : value;

  return (
    <div className="space-y-2" data-testid={`setting-${config.key}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">{config.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono tabular-nums ${isDefault ? "text-muted-foreground" : "text-primary font-semibold"}`}>
            {displayValue}
          </span>
          {!isDefault && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">modified</Badge>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={config.min}
        max={config.max}
        step={config.step}
        className="w-full"
        data-testid={`slider-${config.key}`}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{config.format ? config.format(config.min) : config.min}</span>
        <span>{config.format ? config.format(config.max) : config.max}</span>
      </div>
    </div>
  );
}

const FAIRNESS_SLIDERS: SliderConfig[] = [
  { key: "deficitWeight", label: "Deficit Weight", min: -150, max: -50, step: 5, tooltip: "How much to penalise players who have played more games than others. More negative = stronger equalising effect." },
  { key: "deficitCap", label: "Deficit Cap", min: -300, max: -100, step: 10, tooltip: "Maximum penalty for high game deficits. Prevents excessive punishment for players with 3+ extra games." },
  { key: "gamesPlayedWeight", label: "Games Played Weight", min: -40, max: -10, step: 1, tooltip: "Per-game penalty based on total games played. Encourages rotation of players who have played many games." },
  { key: "spreadWeight", label: "In-Match Spread Weight", min: -120, max: -40, step: 5, tooltip: "Penalty for uneven game counts within a single match. Higher penalty ensures players in the same match have similar game counts." },
];

const VARIETY_SLIDERS: SliderConfig[] = [
  { key: "partnerRepeatWeight", label: "Partner Repeat Penalty", min: -80, max: -10, step: 5, tooltip: "Penalty for pairing with the same partner again. More negative = stronger partner variety." },
  { key: "opponentRepeatWeight", label: "Opponent Repeat Penalty", min: -25, max: -5, step: 1, tooltip: "Penalty for facing the same opponent again. Encourages diverse matchups." },
  { key: "consecutiveOpponentBlock", label: "Consecutive Opponent Block", min: 0, max: 5, step: 1, tooltip: "Hard block if a player faces the same opponent this many times consecutively. 0 = disabled, 2 = block after 2 consecutive." },
  { key: "softOpponentPenalty", label: "Soft Opponent Penalty", min: -60, max: 0, step: 5, tooltip: "Score penalty when a player has faced the same opponent once. Applied before hard block kicks in." },
  { key: "groupRepeatPenalty", label: "4-Player Group Repeat", min: -100, max: 0, step: 5, tooltip: "Penalty when the same 4 players are grouped together again. Prevents stale groupings." },
];

const QUALITY_SLIDERS: SliderConfig[] = [
  { key: "gradeSpreadLimit", label: "Max Grade Spread", min: 2, max: 7, step: 1, tooltip: "Maximum allowed skill level difference between players in a match. Lower = tighter skill matching." },
  { key: "hardGradeSpreadLimit", label: "Hard Grade Spread Limit", min: 2, max: 8, step: 1, tooltip: "Absolute maximum grade spread. Matches exceeding this are rejected outright — no exceptions." },
  { key: "teamAvgDiffLimit", label: "Team Avg Diff Limit", min: 1, max: 5, step: 0.5, tooltip: "Maximum allowed difference between team average grades in doubles. Matches exceeding this are rejected." },
  { key: "qualityWeight", label: "Quality Weight Multiplier", min: 0, max: 2, step: 0.1, tooltip: "Multiplier for match quality scoring. Higher values prioritise well-matched games over other factors." },
];

const PRIORITY_SLIDERS: SliderConfig[] = [
  { key: "priorityHigh", label: "Priority High Bonus", min: 100, max: 250, step: 10, tooltip: "Score bonus for priority players who haven't played enough. Ensures they get picked first." },
  { key: "priorityLow", label: "Priority Low Bonus", min: 0, max: 150, step: 10, tooltip: "Score bonus for priority players who have already played. Still gives them some preference." },
];

const GENDER_SLIDERS: SliderConfig[] = [
  { key: "maleOnlyTargetRatio", label: "Male-Only Target Ratio", min: 0, max: 1, step: 0.05, tooltip: "Target percentage of male-only matches. The engine softly steers towards this ratio.", format: (v: number) => `${Math.round(v * 100)}%` },
  { key: "femaleOnlyTargetRatio", label: "Female-Only Target Ratio", min: 0, max: 1, step: 0.05, tooltip: "Target percentage of female-only matches. The engine softly steers towards this ratio.", format: (v: number) => `${Math.round(v * 100)}%` },
  { key: "mixedTargetRatio", label: "Mixed Target Ratio", min: 0, max: 1, step: 0.05, tooltip: "Target percentage of mixed-gender matches. The engine softly steers towards this ratio.", format: (v: number) => `${Math.round(v * 100)}%` },
  { key: "ratioBoostBonus", label: "Underrepresented Boost", min: 0, max: 50, step: 5, tooltip: "Score bonus when a match type is below its target ratio. Encourages the engine to create more of that type." },
  { key: "ratioOverPenalty", label: "Overrepresented Penalty", min: -50, max: 0, step: 5, tooltip: "Score penalty when a match type is above its target ratio. Discourages over-producing that type." },
  { key: "strongMaleFemaleBonus", label: "Strong Male + Female Bonus", min: 0, max: 50, step: 5, tooltip: "Bonus when a strong male is paired with a female. Encourages protective pairing." },
  { key: "noStrongMaleFemalePenalty", label: "No Strong Male Penalty", min: -80, max: 0, step: 5, tooltip: "Penalty when a mixed match has no strong male player available. Discourages unbalanced mixed games." },
  { key: "maleRotationScaling", label: "Male Rotation Scaling", min: -30, max: 0, step: 5, tooltip: "Per-use penalty for repeatedly including the same male in mixed matches. Encourages rotation." },
];

const ADVANCED_SLIDERS: SliderConfig[] = [
  { key: "candidateLimitBase", label: "Base Candidate Limit", min: 100, max: 300, step: 10, tooltip: "Base number of match candidates to evaluate. Higher = better quality but slower." },
  { key: "candidateLimitScaling", label: "Scaling Factor", min: 0, max: 50, step: 5, tooltip: "Additional candidates per player group size increase. Scales evaluation depth with player count." },
];

type PreviewMatch = {
  teamA: string[];
  teamB: string[];
  qualityScore: number;
  breakdown: ScoringBreakdown;
  factors: string[];
  courtNumber: number;
};

type PreviewResponse = {
  matches: PreviewMatch[];
  totalCandidatesEvaluated: number;
  engineMode: string;
  playerCount: number;
};

export default function MatchEngineSettingsPage() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType>(loadSettings);
  const [showDebug, setShowDebug] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SettingsType)[]) {
      if (settings[key] !== DEFAULT_SETTINGS[key]) count++;
    }
    return count;
  }, [settings]);

  const updateSetting = useCallback((key: keyof SettingsType, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  const handleSave = useCallback(() => {
    saveSettings(settings);
    toast({ title: "Settings saved", description: "Match engine settings have been saved to your browser." });
  }, [settings, toast]);

  const handleReset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    setActivePreset("balanced");
    toast({ title: "Settings reset", description: "All settings restored to defaults." });
  }, [toast]);

  const handlePreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setSettings({ ...DEFAULT_SETTINGS, ...preset.settings });
      setActivePreset(presetKey);
      toast({ title: `${preset.label} preset applied`, description: preset.description });
    }
  }, [toast]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/match-engine/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<PreviewResponse>;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setShowDebug(true);
    },
    onError: (err: Error) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const renderSliderSection = (title: string, icon: React.ReactNode, sliders: SliderConfig[], color: string) => (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`p-1.5 rounded-md ${color}`}>
            {icon}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {sliders.map(config => (
          <SettingSlider
            key={config.key}
            config={config}
            value={settings[config.key] as number}
            onChange={(v) => updateSetting(config.key, v)}
            defaultValue={DEFAULT_SETTINGS[config.key] as number}
          />
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <Settings2 className="h-6 w-6" />
            Match Engine Control Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how the smart matchmaking algorithm behaves
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {modifiedCount > 0 && (
            <Badge variant="secondary" data-testid="badge-modified-count">
              {modifiedCount} modified
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} data-testid="button-save">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <Button
            key={key}
            variant={activePreset === key ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(key)}
            data-testid={`preset-${key}`}
            className="gap-1.5"
          >
            {key === "casual" && <Sparkles className="h-3.5 w-3.5" />}
            {key === "balanced" && <Gauge className="h-3.5 w-3.5" />}
            {key === "competitive" && <Trophy className="h-3.5 w-3.5" />}
            {preset.label}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings2 className="h-4 w-4 mr-1.5" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">
            <Play className="h-4 w-4 mr-1.5" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="debug" data-testid="tab-debug">
            <Bug className="h-4 w-4 mr-1.5" />
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSliderSection("Fairness Controls", <Shield className="h-4 w-4 text-blue-600" />, FAIRNESS_SLIDERS, "bg-blue-100 dark:bg-blue-900/30")}
            {renderSliderSection("Variety Controls", <ArrowUpDown className="h-4 w-4 text-green-600" />, VARIETY_SLIDERS, "bg-green-100 dark:bg-green-900/30")}
            {renderSliderSection("Match Quality", <Target className="h-4 w-4 text-yellow-600" />, QUALITY_SLIDERS, "bg-yellow-100 dark:bg-yellow-900/30")}
            {renderSliderSection("Priority Controls", <Zap className="h-4 w-4 text-red-600" />, PRIORITY_SLIDERS, "bg-red-100 dark:bg-red-900/30")}
            {renderSliderSection("Gender Controls", <Users className="h-4 w-4 text-purple-600" />, GENDER_SLIDERS, "bg-purple-100 dark:bg-purple-900/30")}
            {renderSliderSection("Advanced", <Gauge className="h-4 w-4 text-gray-600" />, ADVANCED_SLIDERS, "bg-gray-100 dark:bg-gray-900/30")}
          </div>

          <Card className="border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Enable Phase Adjustments</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">When enabled, the engine adjusts scoring weights based on session phase (Early/Mid/Late). Early phase focuses on fairness, late phase on quality.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  checked={settings.enablePhaseAdjustments}
                  onCheckedChange={(v) => updateSetting("enablePhaseAdjustments", v)}
                  data-testid="toggle-phase-adjustments"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                Match Preview Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Run a simulation with the current settings using demo players to see how matches would be generated.
              </p>
              <Button
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
                data-testid="button-preview"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {previewMutation.isPending ? "Generating..." : "Preview Matches"}
              </Button>

              {previewData && (
                <div className="space-y-4 mt-4">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" data-testid="text-player-count">
                      {previewData.playerCount} players
                    </Badge>
                    <Badge variant="outline" data-testid="text-match-count">
                      {previewData.matches.length} matches
                    </Badge>
                    <Badge variant="outline" data-testid="text-candidates-count">
                      {previewData.totalCandidatesEvaluated} candidates evaluated
                    </Badge>
                    <Badge variant="outline">
                      Mode: {previewData.engineMode}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {previewData.matches.map((match, idx) => (
                      <Card key={idx} className="border" data-testid={`preview-match-${idx}`}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/10 text-primary border-primary/20">
                                Court {match.courtNumber}
                              </Badge>
                              <span className="text-sm font-medium">
                                {match.teamA.join(" & ")}
                              </span>
                              <span className="text-xs text-muted-foreground">vs</span>
                              <span className="text-sm font-medium">
                                {match.teamB.join(" & ")}
                              </span>
                            </div>
                            <Badge variant={match.qualityScore > 0 ? "default" : "secondary"}>
                              Score: {match.qualityScore}
                            </Badge>
                          </div>

                          {showDebug && match.breakdown && (
                            <div className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono space-y-1">
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                <div>
                                  <span className="text-muted-foreground">Fairness:</span>{" "}
                                  <span className={match.breakdown.fairness < 0 ? "text-red-500" : "text-green-500"}>
                                    {match.breakdown.fairness}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Variety:</span>{" "}
                                  <span className={match.breakdown.variety < 0 ? "text-red-500" : "text-green-500"}>
                                    {match.breakdown.variety}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Quality:</span>{" "}
                                  <span className={match.breakdown.quality < 0 ? "text-red-500" : "text-green-500"}>
                                    {match.breakdown.quality}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Priority:</span>{" "}
                                  <span className={match.breakdown.priority < 0 ? "text-red-500" : "text-green-500"}>
                                    {match.breakdown.priority}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Gender:</span>{" "}
                                  <span className={match.breakdown.gender < 0 ? "text-red-500" : "text-green-500"}>
                                    {match.breakdown.gender}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground font-semibold">Total:</span>{" "}
                                  <span className="font-semibold">{match.breakdown.total}</span>
                                </div>
                              </div>
                              {match.factors.length > 0 && (
                                <div className="mt-1 pt-1 border-t border-border/50">
                                  {match.factors.slice(0, 5).map((f, i) => (
                                    <div key={i} className="text-muted-foreground">{f}</div>
                                  ))}
                                  {match.factors.length > 5 && (
                                    <div className="text-muted-foreground">...and {match.factors.length - 5} more</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Debug Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Show scoring breakdown in preview</span>
                <Switch
                  checked={showDebug}
                  onCheckedChange={setShowDebug}
                  data-testid="toggle-debug"
                />
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Current Settings (JSON)</h3>
                <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-[300px]" data-testid="text-settings-json">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Differences from Default</h3>
                {modifiedCount === 0 ? (
                  <p className="text-sm text-muted-foreground">No changes from defaults.</p>
                ) : (
                  <div className="space-y-1">
                    {(Object.keys(DEFAULT_SETTINGS) as (keyof SettingsType)[]).map(key => {
                      const current = settings[key];
                      const def = DEFAULT_SETTINGS[key];
                      if (current === def) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 text-xs font-mono" data-testid={`diff-${key}`}>
                          <span className="text-muted-foreground w-48">{key}:</span>
                          <span className="text-red-500 line-through">{String(def)}</span>
                          <span className="text-green-500">{String(current)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
