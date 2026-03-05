import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical, Play, BarChart3, Users, Zap, Brain, AlertTriangle,
  TrendingUp, Target, Shield, Loader2, Trash2, ArrowLeftRight,
  ChevronDown, ChevronUp, Trophy, Activity, Shuffle, Eye, Power
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart
} from "recharts";

type SimReport = {
  id: string;
  timestamp: string;
  config: any;
  sessionHealthScore: number;
  totalMatchesGenerated: number;
  totalRounds: number;
  matchesPerPlayer: Record<number, { name: string; count: number; gender: string; grade: string }>;
  fairnessScores: number[];
  challengeDistribution: { easy: number; balanced: number; hard: number };
  partnerHeatmap: { player1: number; player2: number; player1Name: string; player2Name: string; count: number }[];
  opponentHeatmap: { player1: number; player2: number; player1Name: string; player2Name: string; count: number }[];
  fatigueTimeline: Record<number, { name: string; rounds: number[] }>;
  rankingBalance: { matchIndex: number; strengthDiff: number }[];
  genderDistribution: { mixed: number; menDoubles: number; womenDoubles: number; singles: number };
  matchDetails: {
    round: number;
    matchIndex: number;
    teamA: { id: number; name: string; gender: string; grade: string; rating: number }[];
    teamB: { id: number; name: string; gender: string; grade: string; rating: number }[];
    teamAStrength: number;
    teamBStrength: number;
    balanceRating: number;
    difficultyScore: number;
    competitivenessLevel: "EASY" | "BALANCED" | "HARD";
    genderComposition: string;
  }[];
  diagnosticWarnings: { type: string; severity: string; message: string; matchIndices?: number[] }[];
  aiMetrics?: any;
};

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#e879f9", "#f472b6", "#fb7185", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6"];
const SEVERITY_COLORS: Record<string, string> = { HIGH: "destructive", MEDIUM: "secondary", LOW: "outline" };

function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : score >= 40 ? "text-orange-500" : "text-red-500";
  const bgColor = score >= 80 ? "from-green-500/20" : score >= 60 ? "from-yellow-500/20" : score >= 40 ? "from-orange-500/20" : "from-red-500/20";

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br ${bgColor} to-transparent border`}>
      <div className={`text-6xl font-black ${color}`} data-testid="text-health-score">{score}</div>
      <div className="text-sm font-medium text-muted-foreground mt-1">Session Health Score</div>
      <div className="text-xs text-muted-foreground mt-0.5">out of 100</div>
    </div>
  );
}

function MatchPreviewTable({ matches, expanded, onToggle }: { matches: SimReport["matchDetails"]; expanded: boolean; onToggle: () => void }) {
  const displayed = expanded ? matches : matches.slice(0, 20);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" /> Match Preview Table
          </CardTitle>
          <Badge variant="outline">{matches.length} matches</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <table className="w-full text-sm" data-testid="table-match-preview">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2 font-medium">R</th>
                <th className="p-2 font-medium">Team A</th>
                <th className="p-2 font-medium">Team B</th>
                <th className="p-2 font-medium text-center">A Str</th>
                <th className="p-2 font-medium text-center">B Str</th>
                <th className="p-2 font-medium text-center">Balance</th>
                <th className="p-2 font-medium text-center">Diff</th>
                <th className="p-2 font-medium text-center">Level</th>
                <th className="p-2 font-medium text-center">Type</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((m, i) => (
                <tr key={i} className={`border-b hover:bg-muted/50 ${m.balanceRating < 50 ? "bg-red-500/5" : ""}`} data-testid={`row-match-${i}`}>
                  <td className="p-2 text-muted-foreground">{m.round}</td>
                  <td className="p-2">
                    {m.teamA.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 mr-2">
                        <span className={`w-2 h-2 rounded-full ${p.gender === "FEMALE" ? "bg-pink-500" : "bg-blue-500"}`} />
                        <span className="text-xs">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{p.grade}</Badge>
                      </span>
                    ))}
                  </td>
                  <td className="p-2">
                    {m.teamB.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 mr-2">
                        <span className={`w-2 h-2 rounded-full ${p.gender === "FEMALE" ? "bg-pink-500" : "bg-blue-500"}`} />
                        <span className="text-xs">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{p.grade}</Badge>
                      </span>
                    ))}
                  </td>
                  <td className="p-2 text-center font-mono">{m.teamAStrength}</td>
                  <td className="p-2 text-center font-mono">{m.teamBStrength}</td>
                  <td className="p-2 text-center">
                    <Badge variant={m.balanceRating >= 80 ? "default" : m.balanceRating >= 50 ? "secondary" : "destructive"} className="text-xs">
                      {m.balanceRating}
                    </Badge>
                  </td>
                  <td className="p-2 text-center font-mono">{m.difficultyScore}</td>
                  <td className="p-2 text-center">
                    <Badge variant={m.competitivenessLevel === "BALANCED" ? "default" : m.competitivenessLevel === "HARD" ? "secondary" : "destructive"} className="text-xs">
                      {m.competitivenessLevel}
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant="outline" className="text-[10px]">{m.genderComposition}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
        {matches.length > 20 && (
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={onToggle} data-testid="button-toggle-matches">
            {expanded ? <><ChevronUp className="h-4 w-4 mr-1" /> Show Less</> : <><ChevronDown className="h-4 w-4 mr-1" /> Show All {matches.length} Matches</>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ComparePanel({ reports, onClear }: { reports: SimReport[]; onClear: () => void }) {
  if (reports.length < 2) return null;

  return (
    <Card className="border-2 border-indigo-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Compare Algorithm Runs
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear} data-testid="button-clear-compare">
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-compare-runs">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left font-medium">Metric</th>
                {reports.map((r, i) => (
                  <th key={r.id} className="p-2 text-center font-medium">
                    Run {i + 1}
                    <div className="text-[10px] text-muted-foreground font-normal">
                      {r.config.useAIBrain ? "AI Brain" : "Standard"} • {r.config.totalMatches}m
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-medium">Health Score</td>
                {reports.map(r => (
                  <td key={r.id} className="p-2 text-center">
                    <span className={`font-bold text-lg ${r.sessionHealthScore >= 70 ? "text-green-500" : r.sessionHealthScore >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                      {r.sessionHealthScore}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Matches Generated</td>
                {reports.map(r => <td key={r.id} className="p-2 text-center font-mono">{r.totalMatchesGenerated}</td>)}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Balanced %</td>
                {reports.map(r => (
                  <td key={r.id} className="p-2 text-center font-mono">
                    {r.totalMatchesGenerated > 0 ? Math.round(r.challengeDistribution.balanced / r.totalMatchesGenerated * 100) : 0}%
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Avg Fairness</td>
                {reports.map(r => (
                  <td key={r.id} className="p-2 text-center font-mono">
                    {r.fairnessScores.length > 0 ? Math.round(r.fairnessScores.reduce((a, b) => a + b, 0) / r.fairnessScores.length) : 0}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Warnings</td>
                {reports.map(r => (
                  <td key={r.id} className="p-2 text-center">
                    <Badge variant={r.diagnosticWarnings.length > 3 ? "destructive" : r.diagnosticWarnings.length > 0 ? "secondary" : "default"}>
                      {r.diagnosticWarnings.length}
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Mixed %</td>
                {reports.map(r => {
                  const total = r.genderDistribution.mixed + r.genderDistribution.menDoubles + r.genderDistribution.womenDoubles;
                  return (
                    <td key={r.id} className="p-2 text-center font-mono">
                      {total > 0 ? Math.round(r.genderDistribution.mixed / total * 100) : 0}%
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Health Score Comparison</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={reports.map((r, i) => ({ name: `Run ${i + 1}`, score: r.sessionHealthScore, engine: r.config.useAIBrain ? "AI Brain" : "Standard" }))}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchEngineLab() {
  const { toast } = useToast();
  const [totalMatches, setTotalMatches] = useState(50);
  const [playerCount, setPlayerCount] = useState(16);
  const [maleCount, setMaleCount] = useState(8);
  const [mode, setMode] = useState<"SOCIAL" | "COMPETITIVE">("SOCIAL");
  const [genderType, setGenderType] = useState<"MIXED" | "FEMALE" | "MALE">("MIXED");
  const [playersPerSide, setPlayersPerSide] = useState<1 | 2>(2);
  const [courtsAvailable, setCourtsAvailable] = useState(3);
  const [useAIBrain, setUseAIBrain] = useState(false);
  const [gradeDistribution, setGradeDistribution] = useState<"uniform" | "weighted">("weighted");

  const [currentReport, setCurrentReport] = useState<SimReport | null>(null);
  const [savedReports, setSavedReports] = useState<SimReport[]>([]);
  const [expandedMatches, setExpandedMatches] = useState(false);

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/match-engine-lab/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          totalMatches,
          playerCount,
          maleCount,
          femaleCount: playerCount - maleCount,
          mode,
          genderType,
          playersPerSide,
          courtsAvailable,
          useAIBrain,
          gradeDistribution,
        }),
      });
      if (!res.ok) throw new Error("Simulation failed");
      return res.json() as Promise<SimReport>;
    },
    onSuccess: (data) => {
      setCurrentReport(data);
      setExpandedMatches(false);
      toast({ title: "Simulation complete", description: `Generated ${data.totalMatchesGenerated} matches. Health Score: ${data.sessionHealthScore}/100` });
    },
    onError: () => {
      toast({ title: "Simulation failed", description: "Could not run the simulation", variant: "destructive" });
    },
  });

  const handleSaveForComparison = () => {
    if (currentReport) {
      setSavedReports(prev => [...prev.slice(-4), currentReport]);
      toast({ title: "Run saved", description: "Added to comparison panel" });
    }
  };

  const matchPerPlayerData = useMemo(() => {
    if (!currentReport) return [];
    return Object.entries(currentReport.matchesPerPlayer)
      .map(([id, p]) => ({
        name: p.name.split(" ")[0],
        matches: p.count,
        gender: p.gender,
        grade: p.grade,
        fill: p.gender === "FEMALE" ? "#ec4899" : "#3b82f6",
      }))
      .sort((a, b) => b.matches - a.matches);
  }, [currentReport]);

  const fairnessDistData = useMemo(() => {
    if (!currentReport) return [];
    const buckets: Record<string, number> = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    for (const s of currentReport.fairnessScores) {
      if (s <= 20) buckets["0-20"]++;
      else if (s <= 40) buckets["21-40"]++;
      else if (s <= 60) buckets["41-60"]++;
      else if (s <= 80) buckets["61-80"]++;
      else buckets["81-100"]++;
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [currentReport]);

  const challengeData = useMemo(() => {
    if (!currentReport) return [];
    return [
      { name: "Easy", value: currentReport.challengeDistribution.easy, fill: "#ef4444" },
      { name: "Balanced", value: currentReport.challengeDistribution.balanced, fill: "#22c55e" },
      { name: "Hard", value: currentReport.challengeDistribution.hard, fill: "#f97316" },
    ];
  }, [currentReport]);

  const genderData = useMemo(() => {
    if (!currentReport) return [];
    return [
      { name: "Mixed", value: currentReport.genderDistribution.mixed, fill: "#8b5cf6" },
      { name: "Men's", value: currentReport.genderDistribution.menDoubles, fill: "#3b82f6" },
      { name: "Women's", value: currentReport.genderDistribution.womenDoubles, fill: "#ec4899" },
      { name: "Singles", value: currentReport.genderDistribution.singles, fill: "#eab308" },
    ].filter(d => d.value > 0);
  }, [currentReport]);

  const rankingBalanceData = useMemo(() => {
    if (!currentReport) return [];
    return currentReport.rankingBalance.map(r => ({
      match: r.matchIndex + 1,
      diff: Math.round(r.strengthDiff * 10) / 10,
    }));
  }, [currentReport]);

  const fatigueData = useMemo(() => {
    if (!currentReport) return [];
    const entries = Object.entries(currentReport.fatigueTimeline);
    const maxRound = currentReport.totalRounds;
    return Array.from({ length: maxRound }, (_, r) => {
      const round: Record<string, any> = { round: r + 1 };
      for (const [pid, info] of entries) {
        const key = `P${pid.replace(/^10*/, "")}_${info.name.split(" ")[0]}`;
        round[key] = info.rounds.filter(rd => rd === r + 1).length;
      }
      return round;
    });
  }, [currentReport]);

  const fatiguePlayerNames = useMemo(() => {
    if (!currentReport) return [];
    return Object.entries(currentReport.fatigueTimeline).map(([pid, t]) =>
      `P${pid.replace(/^10*/, "")}_${t.name.split(" ")[0]}`
    ).slice(0, 12);
  }, [currentReport]);

  return (
    <div className="space-y-6 p-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold" data-testid="text-lab-title">Match Engine Testing Lab</h1>
        </div>
        <Badge variant="outline" className="text-xs">Sandbox Environment</Badge>
        <Badge variant="secondary" className="text-xs">No Production Data Affected</Badge>
      </div>

      <Card className="border-2 border-indigo-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-500" /> Run Session Simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Total Matches</Label>
              <Select value={String(totalMatches)} onValueChange={(v) => setTotalMatches(Number(v))}>
                <SelectTrigger data-testid="select-total-matches"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 matches</SelectItem>
                  <SelectItem value="100">100 matches</SelectItem>
                  <SelectItem value="200">200 matches</SelectItem>
                  <SelectItem value="500">500 matches</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Player Pool</Label>
              <Input
                type="number"
                min={4}
                max={40}
                value={playerCount}
                onChange={e => {
                  const v = Number(e.target.value);
                  setPlayerCount(v);
                  setMaleCount(Math.min(maleCount, v));
                }}
                data-testid="input-player-count"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Male Players</Label>
              <Input
                type="number"
                min={0}
                max={playerCount}
                value={maleCount}
                onChange={e => setMaleCount(Math.min(Number(e.target.value), playerCount))}
                data-testid="input-male-count"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Female Players</Label>
              <Input
                type="number"
                value={playerCount - maleCount}
                disabled
                data-testid="input-female-count"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Match Mode</Label>
              <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                <SelectTrigger data-testid="select-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                  <SelectItem value="COMPETITIVE">Competitive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Gender Type</Label>
              <Select value={genderType} onValueChange={(v: any) => setGenderType(v)}>
                <SelectTrigger data-testid="select-gender-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                  <SelectItem value="MALE">Male Only</SelectItem>
                  <SelectItem value="FEMALE">Female Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={String(playersPerSide)} onValueChange={(v) => setPlayersPerSide(Number(v) as 1 | 2)}>
                <SelectTrigger data-testid="select-format"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Doubles</SelectItem>
                  <SelectItem value="1">Singles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Courts</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={courtsAvailable}
                onChange={e => setCourtsAvailable(Number(e.target.value))}
                data-testid="input-courts"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Grade Distribution</Label>
              <Select value={gradeDistribution} onValueChange={(v: any) => setGradeDistribution(v)}>
                <SelectTrigger data-testid="select-grade-dist"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniform">Uniform</SelectItem>
                  <SelectItem value="weighted">Weighted (Realistic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={useAIBrain}
                  onCheckedChange={setUseAIBrain}
                  data-testid="switch-ai-brain"
                />
                <Label className="text-xs flex items-center gap-1">
                  <Brain className={`h-3.5 w-3.5 ${useAIBrain ? "text-purple-500" : "text-muted-foreground"}`} />
                  AI Brain Layer
                </Label>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => !simulateMutation.isPending && simulateMutation.mutate()}
                disabled={simulateMutation.isPending}
                className="neon-power-btn group relative"
                data-testid="button-run-simulation"
              >
                <div className="neon-power-outer" />
                <div className="neon-power-ring" />
                <div className={`neon-power-ring-pulse ${simulateMutation.isPending ? "neon-heartbeat" : ""}`} />
                <div className={`neon-power-glow ${simulateMutation.isPending ? "neon-heartbeat" : ""}`} />
                <div className="neon-power-inner">
                  {simulateMutation.isPending ? (
                    <div className="neon-power-icon neon-vibrate">
                      <Power className="h-8 w-8" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="neon-power-icon">
                      <Power className="h-8 w-8" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div className="neon-power-circuit-ring" />
              </button>
              <span className={`text-xs font-medium tracking-wider uppercase ${simulateMutation.isPending ? "text-cyan-400 neon-text-pulse" : "text-muted-foreground"}`}>
                {simulateMutation.isPending ? "Analysing..." : "Initiate Test"}
              </span>
            </div>

            <div className="flex flex-col gap-2 items-start">
              {currentReport && (
                <Button variant="outline" onClick={handleSaveForComparison} data-testid="button-save-comparison">
                  <TrendingUp className="h-4 w-4 mr-2" /> Save for Comparison
                </Button>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> All data is temporary and isolated
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentReport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HealthScoreGauge score={currentReport.sessionHealthScore} />

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold" data-testid="text-total-matches">{currentReport.totalMatchesGenerated}</div>
                    <div className="text-xs text-muted-foreground">Total Matches</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold" data-testid="text-total-rounds">{currentReport.totalRounds}</div>
                    <div className="text-xs text-muted-foreground">Total Rounds</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold" data-testid="text-balanced-pct">
                      {currentReport.totalMatchesGenerated > 0
                        ? Math.round(currentReport.challengeDistribution.balanced / currentReport.totalMatchesGenerated * 100) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">Balanced</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold" data-testid="text-avg-fairness">
                      {currentReport.fairnessScores.length > 0
                        ? Math.round(currentReport.fairnessScores.reduce((a, b) => a + b, 0) / currentReport.fairnessScores.length) : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Fairness</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Diagnostics
                </h3>
                {currentReport.diagnosticWarnings.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                    <Shield className="h-4 w-4 text-green-500" /> No issues detected
                  </div>
                ) : (
                  <ScrollArea className="max-h-[160px]">
                    <div className="space-y-1.5">
                      {currentReport.diagnosticWarnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs" data-testid={`warning-${i}`}>
                          <Badge variant={SEVERITY_COLORS[w.severity] as any || "outline"} className="text-[10px] shrink-0 mt-0.5">
                            {w.severity}
                          </Badge>
                          <span>{w.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="distribution" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="distribution" data-testid="tab-distribution">
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> Distribution
              </TabsTrigger>
              <TabsTrigger value="fairness" data-testid="tab-fairness">
                <Target className="h-3.5 w-3.5 mr-1" /> Fairness
              </TabsTrigger>
              <TabsTrigger value="challenge" data-testid="tab-challenge">
                <Trophy className="h-3.5 w-3.5 mr-1" /> Challenge
              </TabsTrigger>
              <TabsTrigger value="partners" data-testid="tab-partners">
                <Users className="h-3.5 w-3.5 mr-1" /> Partners
              </TabsTrigger>
              <TabsTrigger value="opponents" data-testid="tab-opponents">
                <Shuffle className="h-3.5 w-3.5 mr-1" /> Opponents
              </TabsTrigger>
              <TabsTrigger value="fatigue" data-testid="tab-fatigue">
                <Activity className="h-3.5 w-3.5 mr-1" /> Fatigue
              </TabsTrigger>
              <TabsTrigger value="ranking" data-testid="tab-ranking">
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> Ranking
              </TabsTrigger>
              <TabsTrigger value="gender" data-testid="tab-gender">
                <Users className="h-3.5 w-3.5 mr-1" /> Gender
              </TabsTrigger>
            </TabsList>

            <TabsContent value="distribution">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Matches Per Player</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={matchPerPlayerData} margin={{ bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-2 text-xs shadow-lg">
                              <div className="font-medium">{d.name}</div>
                              <div>Matches: {d.matches}</div>
                              <div>Gender: {d.gender} | Grade: {d.grade}</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="matches" radius={[4, 4, 0, 0]}>
                        {matchPerPlayerData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fairness">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Balance Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fairnessDistData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="range" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Matches" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="challenge">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Challenge Difficulty Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={challengeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {challengeData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col justify-center gap-3">
                      {challengeData.map(d => (
                        <div key={d.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                            <span className="font-medium">{d.name}</span>
                          </div>
                          <span className="font-mono">{d.value} matches</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="partners">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Partner Frequency Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-1">
                      {currentReport.partnerHeatmap.slice(0, 30).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm" data-testid={`partner-pair-${i}`}>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="w-24 truncate text-xs">{p.player1Name.split(" ")[0]}</span>
                            <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="w-24 truncate text-xs">{p.player2Name.split(" ")[0]}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div
                              className="h-5 rounded"
                              style={{
                                width: `${Math.min(200, p.count * 30)}px`,
                                backgroundColor: p.count >= 4 ? "#ef4444" : p.count >= 3 ? "#f97316" : p.count >= 2 ? "#eab308" : "#22c55e",
                              }}
                            />
                            <span className="text-xs font-mono w-6 text-right">{p.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opponents">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Opponent Exposure Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-1">
                      {currentReport.opponentHeatmap.slice(0, 30).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm" data-testid={`opponent-pair-${i}`}>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="w-24 truncate text-xs">{p.player1Name.split(" ")[0]}</span>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <span className="w-24 truncate text-xs">{p.player2Name.split(" ")[0]}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div
                              className="h-5 rounded"
                              style={{
                                width: `${Math.min(200, p.count * 25)}px`,
                                backgroundColor: p.count >= 4 ? "#ef4444" : p.count >= 3 ? "#f97316" : p.count >= 2 ? "#eab308" : "#22c55e",
                              }}
                            />
                            <span className="text-xs font-mono w-6 text-right">{p.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fatigue">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Player Fatigue Load Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={fatigueData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="round" label={{ value: "Round", position: "insideBottom", offset: -5 }} />
                      <YAxis allowDecimals={false} label={{ value: "Active", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      {fatiguePlayerNames.map((name, i) => (
                        <Area
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stackId="1"
                          fill={COLORS[i % COLORS.length]}
                          stroke={COLORS[i % COLORS.length]}
                          fillOpacity={0.6}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ranking">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Team Strength Difference Per Match</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={rankingBalanceData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="match" label={{ value: "Match #", position: "insideBottom", offset: -5 }} />
                      <YAxis label={{ value: "Strength Diff", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="diff" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gender">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Gender Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={genderData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {genderData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col justify-center gap-3">
                      {genderData.map(d => (
                        <div key={d.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                            <span className="font-medium">{d.name}</span>
                          </div>
                          <span className="font-mono">{d.value} matches</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <MatchPreviewTable
            matches={currentReport.matchDetails}
            expanded={expandedMatches}
            onToggle={() => setExpandedMatches(!expandedMatches)}
          />

          {currentReport.aiMetrics && (
            <Card className="border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" /> AI Brain Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-xl font-bold">{currentReport.aiMetrics.fairnessScore}</div>
                    <div className="text-xs text-muted-foreground">Fairness</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-xl font-bold">{currentReport.aiMetrics.genderBalanceScore}</div>
                    <div className="text-xs text-muted-foreground">Gender Balance</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-xl font-bold">{currentReport.aiMetrics.matchQualityAverage}</div>
                    <div className="text-xs text-muted-foreground">Match Quality</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-xl font-bold">{currentReport.aiMetrics.partnerDiversity}</div>
                    <div className="text-xs text-muted-foreground">Partner Diversity</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-xl font-bold">{currentReport.aiMetrics.opponentDiversity}</div>
                    <div className="text-xs text-muted-foreground">Opponent Diversity</div>
                  </div>
                </div>
                {currentReport.aiMetrics.warnings?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {currentReport.aiMetrics.warnings.map((w: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant={w.severity === "HIGH" ? "destructive" : "secondary"} className="text-[10px]">{w.severity}</Badge>
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ComparePanel reports={savedReports} onClear={() => setSavedReports([])} />
    </div>
  );
}
