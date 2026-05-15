import { useState, useMemo, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings2, RotateCcw, Save, Play, Bug, Trophy, Sparkles, Gauge, Info, Loader2 } from "lucide-react";
import type { MatchEngineSettings as SettingsType, ScoringBreakdown } from "@shared/matchEngineSettings";
import { DEFAULT_SETTINGS, PRESETS } from "@shared/matchEngineSettings";

type SliderConfig = {
  key: keyof SettingsType;
  label: string;
  min: number;
  max: number;
  step: number;
  tooltip: string;
};

const SLIDERS: SliderConfig[] = [
  {
    key: "groupRepeatPenalty",
    label: "4-player group repeat penalty",
    min: 0, max: 30, step: 1,
    tooltip: "Penalty added when this exact 4-player group has already played together. Higher = stronger anti-stale-foursomes.",
  },
  {
    key: "partnerRepeatPenalty",
    label: "Partner repeat penalty",
    min: 0, max: 15, step: 0.5,
    tooltip: "Penalty per prior partner pairing inside a candidate group. Higher = more partner variety.",
  },
  {
    key: "opponentRepeatPenalty",
    label: "Opponent repeat penalty",
    min: 0, max: 10, step: 0.5,
    tooltip: "Penalty per prior opponent pairing inside a candidate group. Higher = more opponent variety.",
  },
  {
    key: "gradeSpreadWeight",
    label: "Grade spread penalty",
    min: 0, max: 5, step: 0.1,
    tooltip: "Penalty per grade-rank gap between best and worst player in the group. Higher = stricter skill matching.",
  },
  {
    key: "candidatePoolSize",
    label: "Candidate pool size",
    min: 4, max: 16, step: 1,
    tooltip: "How many of the least-played players to consider per match. Smaller = stricter rotation; larger = more variety.",
  },
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

function SettingSlider({ config, value, onChange, defaultValue }: { config: SliderConfig; value: number; onChange: (v: number) => void; defaultValue: number }) {
  const isDefault = value === defaultValue;
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
              <TooltipContent side="top" className="max-w-[280px]">
                <p className="text-xs">{config.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono tabular-nums ${isDefault ? "text-muted-foreground" : "text-primary font-semibold"}`}>{value}</span>
          {!isDefault && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">modified</Badge>}
        </div>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={config.min} max={config.max} step={config.step} />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
}

export default function MatchEngineSettingsPage() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [settings, setSettings] = useState<SettingsType>({ ...DEFAULT_SETTINGS });
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const effectiveClubId = selectedClubId || String(adminClubs?.[0]?.id || "");

  const { data: serverSettings, isLoading: isLoadingSettings } = useQuery<SettingsType>({
    queryKey: ["/api/clubs", effectiveClubId, "match-engine-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${effectiveClubId}/match-engine-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!effectiveClubId,
  });

  useEffect(() => {
    if (serverSettings && !settingsLoaded) {
      setSettings({ ...DEFAULT_SETTINGS, ...serverSettings });
      setSettingsLoaded(true);
    }
  }, [serverSettings, settingsLoaded]);

  useEffect(() => { setSettingsLoaded(false); }, [effectiveClubId]);

  const saveMutation = useMutation({
    mutationFn: async (s: SettingsType) => {
      const res = await fetch(`/api/clubs/${effectiveClubId}/match-engine-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => toast({ title: "Settings saved", description: "These settings will be used for all matches generated by this club." }),
    onError: () => toast({ title: "Save failed", description: "Could not save settings. Please try again.", variant: "destructive" }),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/match-engine/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<PreviewResponse>;
    },
    onSuccess: (data) => setPreviewData(data),
    onError: (err: Error) => toast({ title: "Preview failed", description: err.message, variant: "destructive" }),
  });

  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SettingsType)[]) {
      if (settings[key] !== DEFAULT_SETTINGS[key]) count++;
    }
    return count;
  }, [settings]);

  const updateSetting = useCallback((key: keyof SettingsType, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!effectiveClubId) return;
    saveMutation.mutate(settings);
  }, [settings, effectiveClubId, saveMutation]);

  const handleReset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    setActivePreset("balanced");
    toast({ title: "Reset to defaults", description: "Click Save to apply." });
  }, [toast]);

  const handlePreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setSettings({ ...DEFAULT_SETTINGS, ...preset.settings });
      setActivePreset(presetKey);
      toast({ title: `${preset.label} preset applied`, description: `${preset.description} Click Save to apply.` });
    }
  }, [toast]);

  if (!adminClubs || adminClubs.length === 0) {
    return (
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You need to be a club admin to manage match engine settings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Settings2 className="h-6 w-6 text-primary" />
            Match Engine Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Tune the five knobs that drive match generation. The engine picks the least-played players, then chooses the foursome with the fewest repeats and tightest skill spread.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {adminClubs.length > 1 && (
            <Select value={effectiveClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[200px]" data-testid="select-club"><SelectValue placeholder="Select club" /></SelectTrigger>
              <SelectContent>
                {adminClubs.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {modifiedCount > 0 && <Badge variant="secondary">{modifiedCount} modified</Badge>}
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
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
          <TabsTrigger value="settings" data-testid="tab-settings"><Settings2 className="h-4 w-4 mr-1.5" />Settings</TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview"><Play className="h-4 w-4 mr-1.5" />Preview</TabsTrigger>
          <TabsTrigger value="debug" data-testid="tab-debug"><Bug className="h-4 w-4 mr-1.5" />Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>For each match, the engine:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Filters players by gender category (men's, women's, mixed).</li>
                <li>Sorts by games played, then takes the top <strong>{settings.candidatePoolSize}</strong> hungriest as the candidate pool.</li>
                <li>Enumerates every group of 4 from that pool and scores each one — lower is better.</li>
                <li>Picks the lowest-score group and splits it into balanced teams.</li>
              </ol>
              <p className="pt-1">Penalties added when scoring each candidate group:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>{settings.groupRepeatPenalty}</strong> per time this exact foursome already played</li>
                <li><strong>{settings.partnerRepeatPenalty}</strong> per prior partner pairing inside the group</li>
                <li><strong>{settings.opponentRepeatPenalty}</strong> per prior opponent pairing inside the group</li>
                <li><strong>{settings.gradeSpreadWeight}</strong> per grade-rank gap between strongest and weakest</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Knobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoadingSettings ? (
                <div className="py-8 flex items-center justify-center text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                SLIDERS.map(config => (
                  <SettingSlider
                    key={config.key}
                    config={config}
                    value={settings[config.key] as number}
                    onChange={(v) => updateSetting(config.key, v)}
                    defaultValue={DEFAULT_SETTINGS[config.key] as number}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Play className="h-4 w-4" />Match preview simulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Runs the engine on 16 demo players (5 women, 11 men, mixed grades) using your current settings. Useful for sanity-checking before saving.
              </p>
              <Button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending} data-testid="button-preview" className="gap-2">
                <Play className="h-4 w-4" />
                {previewMutation.isPending ? "Generating…" : "Preview Matches"}
              </Button>

              {previewData && (
                <div className="space-y-3 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" data-testid="text-player-count">{previewData.playerCount} players</Badge>
                    <Badge variant="outline" data-testid="text-match-count">{previewData.matches.length} matches</Badge>
                    <Badge variant="outline" data-testid="text-candidates-count">{previewData.totalCandidatesEvaluated} groups evaluated</Badge>
                  </div>

                  <div className="space-y-3">
                    {previewData.matches.map((match, idx) => (
                      <Card key={idx} className="border" data-testid={`preview-match-${idx}`}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge className="bg-primary/10 text-primary border-primary/20">Court {match.courtNumber}</Badge>
                              <span className="font-medium">{match.teamA.join(" & ")}</span>
                              <span className="text-xs text-muted-foreground">vs</span>
                              <span className="font-medium">{match.teamB.join(" & ")}</span>
                            </div>
                            <Badge variant={match.qualityScore > 80 ? "default" : "secondary"}>Quality: {match.qualityScore}</Badge>
                          </div>

                          {match.breakdown && (
                            <div className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono space-y-1">
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                <div><span className="text-muted-foreground">Group repeat:</span> {match.breakdown.groupRepeat}</div>
                                <div><span className="text-muted-foreground">Partner:</span> {match.breakdown.partnerRepeat}</div>
                                <div><span className="text-muted-foreground">Opponent:</span> {match.breakdown.opponentRepeat}</div>
                                <div><span className="text-muted-foreground">Grade spread:</span> {Number(match.breakdown.gradeSpread).toFixed(1)}</div>
                                <div><span className="text-muted-foreground font-semibold">Total:</span> <span className="font-semibold">{Number(match.breakdown.total).toFixed(1)}</span></div>
                              </div>
                              {match.factors.length > 0 && (
                                <div className="mt-1 pt-1 border-t border-border/50">
                                  {match.factors.map((f, i) => <div key={i} className="text-muted-foreground">{f}</div>)}
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
              <CardTitle className="text-base flex items-center gap-2"><Bug className="h-4 w-4" />Debug panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Current settings (JSON)</h3>
                <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-[300px]" data-testid="text-settings-json">{JSON.stringify(settings, null, 2)}</pre>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Differences from defaults</h3>
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
